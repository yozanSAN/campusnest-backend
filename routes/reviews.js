const express = require("express");
const router = express.Router();
const Dorm = require("../models/dorm");
const Review = require("../models/review");
const auth = require("../middleware/auth");

// Create a review
router.post("/", auth, async (req, res) => {
  try {
    console.log("Review Body:", req.body);
    console.log("Authenticated User:", req.user);

    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "Authentication failed, no user ID" });
    }

    const { rating, review, createdAt, dormId } = req.body;

    // ✅ Fix: check for `review`, not `comment`
    if (!rating || !review || !createdAt || !dormId) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const dorm = await Dorm.findById(dormId);
    if (!dorm) {
      return res.status(404).json({ error: "Dorm not found" });
    }

    const newReview = new Review({
      rating: Number(rating),
      review,
      createdAt,
      dorm: dormId,
      user: req.user._id
    });

    await newReview.save();
    res.status(201).json({ message: "Review added successfully", review: newReview });

  } catch (error) {
    console.error("POST /reviews error:", error);
    // Handle duplicate key error (user already reviewed this dorm)
    if (error.code === 11000) {
      return res.status(400).json({ error: "You have already submitted a review for this dorm." });
    }
    res.status(500).json({ error: "Error adding review", details: error.message });
  }
});

// Get all reviews for a specific dorm
router.get("/dorm/:dormId", async (req, res) => {
  try {
    const reviews = await Review.find({ dorm: req.params.dormId })
      .populate("user", "name email");

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a review (owner or admin only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    await review.deleteOne();
    res.json({ success: true });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all reviews by user ID
router.get("/user/:userId", async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.params.userId }).populate("dorm");
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
