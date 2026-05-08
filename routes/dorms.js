const express = require("express");
const router = express.Router();
const { upload } = require("../server"); // Import multer setup
const Dorm = require("../models/dorm");
const auth = require("../middleware/auth");

// CREATE a dorm (protected)
router.post("/", auth, upload.single("photo"), async (req, res) => {
    try {
        const { name, university, location, amenities, rating } = req.body;
        const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const newDorm = new Dorm({
            name,
            university,
            location,
            amenities,
            rating,
            photos: photoUrl ? [photoUrl] : [],
        });

        await newDorm.save();
        res.status(201).json({ message: "Dorm added successfully!", dorm: newDorm });
    } catch (error) {
        res.status(500).json({ message: "Error adding dorm", error });
    }
});



// GET all dorms (public)
router.get("/", async (req, res) => {
    try {
        const dorms = await Dorm.find();
        res.json(dorms);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving dorms", error });
    }
});


// GET /api/dorms/university/:name
router.get("/university/:name", async (req, res) => {
  try {
    const universityName = req.params.name;

    // Case-insensitive exact match
    const dorms = await Dorm.find({
      university: { $regex: new RegExp(`^${universityName}$`, "i") }
    });

    if (dorms.length === 0) {
      return res.status(404).json({ message: "No dorms found for this university" });
    }

    res.json(dorms);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving dorms", error });
  }
});


//GET TOP RATED DORMS
// GET /api/dorms/top-rated

router.get("/top-rated", async (_req, res) => {
  try {
    const topDorms = await Dorm.find()
      .sort({ ratingAverage: -1 })
      .limit(3)
      .populate('reviews')
      .lean();

    const formattedDorms = topDorms.map(dorm => {
      return {
        _id: dorm._id,
        university: dorm.university,
        description: dorm.description,
        ratingAverage: typeof dorm.ratingAverage === 'number' && !isNaN(dorm.ratingAverage) ? dorm.ratingAverage : 0,
        reviewCount: dorm.reviews?.length || 0,
        amenities: dorm.amenities || [],
        photos: dorm.photos || ['/uploads/default-user-pfp']
      };
    });

    res.json(formattedDorms);
  } catch (error) {
    console.error('Error in /top-rated:', error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch top-rated dorms",
      details: error.message 
    });
  }
});
// GET single dorm by ID (public)
router.get("/:id", async (req, res) => {
  try {
    const dorm = await Dorm.findById(req.params.id);
    if (!dorm) {
      return res.status(404).json({ message: "Dorm not found" });
    }
    res.json(dorm);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving dorm", error });
  }
});

// UPDATE dorm (protected)
router.patch("/:id", auth,async (req, res) => {
    console.log('Request body:', req.body);
    try {
        const updateFields = {};
        if (req.body.university) updateFields.university = req.body.university;
        if (req.body.location) updateFields.location = req.body.location;
        if (req.body.description) updateFields.description = req.body.description;
        if (req.body.amenities) updateFields.amenities = req.body.amenities.split(',').map(item => item.trim());

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ message: "No valid fields to update" });
        }

        const updatedDorm = await Dorm.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields },
            { new: true, runValidators: true }
        );
        if (!updatedDorm) return res.status(404).json({ message: "Dorm not found" });
        res.json({ message: "Dorm updated", dorm: updatedDorm });
    } catch (error) {
        res.status(500).json({ message: "Error updating dorm", error: error.message });
    }
});

// DELETE dorm (protected)
router.delete("/:id", auth, async (req, res) => {
    try {
        const deletedDorm = await Dorm.findByIdAndDelete(req.params.id);
        if (!deletedDorm) return res.status(404).json({ message: "Dorm not found" });
        res.json({ message: "Dorm deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting dorm", error });
    }
});

// UPLOAD additional photo(s) to an existing dorm (protected)
router.post("/:id/photos", auth, upload.array("photos", 5), async (req, res) => {
    try {
        const dorm = await Dorm.findById(req.params.id);
        if (!dorm) return res.status(404).json({ message: "Dorm not found" });

        const photoUrls = req.files.map(file => `/uploads/${file.filename}`);
        dorm.photos.push(...photoUrls);
        await dorm.save();

        res.json({ message: "Photos uploaded", dorm });
    } catch (error) {
        res.status(500).json({ message: "Error uploading photos", error });
    }
});




module.exports = router;
