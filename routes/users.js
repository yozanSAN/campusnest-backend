const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/user');

// Ensure uploads directory exists
const uploadsDir = 'uploads/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer setup with validation
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'user-' + uniqueSuffix + ext);
  },
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Input validation middleware
const validateUserId = (req, res, next) => {
  const { id } = req.params;
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ message: 'Invalid user ID format' });
  }
  next();
};

const validateUsername = (req, res, next) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Name is required and must be a string' });
  }
  if (name.trim().length === 0) {
    return res.status(400).json({ message: 'Name cannot be empty' });
  }
  if (name.length > 50) {
    return res.status(400).json({ message: 'Name must be less than 50 characters' });
  }
  req.body.name = name.trim(); // Sanitize input
  next();
};

// Helper function to delete old photo
const deleteOldPhoto = (filename) => {
  if (filename && filename !== 'default-user-pfp') {
    const filePath = path.join(uploadsDir, filename);
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting old photo:', err);
    });
  }
};

// ======================
// GET USER BY ID
// ======================
router.get('/:id', validateUserId, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ======================
// UPDATE USER (NAME)
// ======================
router.put('/:id', validateUserId, validateUsername, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name;
    user.updatedAt = new Date();
    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(req.params.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error('Error updating username:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ======================
// UPDATE PROFILE PHOTO
// ======================
router.put('/:id/photo', validateUserId, (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
        }
      }
      return res.status(400).json({ message: err.message });
    }

    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        // Clean up uploaded file if user not found
        if (req.file) {
          deleteOldPhoto(req.file.filename);
        }
        return res.status(404).json({ message: 'User not found' });
      }

      const oldPhoto = user.userPhoto;

      if (req.file) {
        // New image uploaded
        user.userPhoto = req.file.filename;
      } else if (req.body.photo === 'default-user-pfp') {
        // Reset to default
        user.userPhoto = 'default-user-pfp';
      } else {
        return res.status(400).json({ message: 'No valid file or photo reset requested' });
      }

      user.updatedAt = new Date();
      await user.save();

      // Delete old photo after successful update
      if (oldPhoto && oldPhoto !== 'default-user-pfp' && oldPhoto !== user.userPhoto) {
        deleteOldPhoto(oldPhoto);
      }

      // Return updated user without password
      const updatedUser = await User.findById(req.params.id).select('-password');
      res.json(updatedUser);
    } catch (err) {
      console.error('Error updating photo:', err);
      // Clean up uploaded file on error
      if (req.file) {
        deleteOldPhoto(req.file.filename);
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
});

// ======================
// DELETE USER (Optional)
// ======================
router.delete('/:id', validateUserId, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user's photo if not default
    if (user.userPhoto && user.userPhoto !== 'default-user-pfp') {
      deleteOldPhoto(user.userPhoto);
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ======================
// ERROR HANDLING MIDDLEWARE
// ======================
router.use((err, req, res, next) => {
  console.error('Router error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = router;