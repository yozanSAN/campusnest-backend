const express = require('express');
require("dotenv").config();
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path'); 
const multer = require("multer");
const auth = require('./middleware/auth');



connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Multer to upload files
const storage = multer.diskStorage({
    destination: "./uploads",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only .jpg, .jpeg, .png, .webp files are allowed"), false);
        }
    }
});


module.exports = { upload };

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dorms', require('./routes/dorms')); 
app.use('/api/reviews', require('./routes/reviews')); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 
app.use('/api/users', require('./routes/users'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`));