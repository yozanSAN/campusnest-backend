const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  review: {
    type: String,
    required: [true, 'Review cannot be empty'],
    trim: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: [true, 'Please provide a rating']
  },
  dorm: {
    type: mongoose.Schema.ObjectId,
    ref: 'Dorm',
    required: [true, 'Review must belong to a dorm']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Review must belong to a user']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Prevent duplicate reviews from same user
// reviewSchema.index({ dorm: 1, user: 1 }, { unique: true });

// Static method to calculate average ratings
reviewSchema.statics.calcAverageRating = async function(dormId) {
  const stats = await this.aggregate([
    { $match: { dorm: dormId } },
    { 
      $group: {
        _id: '$dorm',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  await mongoose.model('Dorm').findByIdAndUpdate(dormId, {
    ratingAverage: stats.length > 0 ? stats[0].avgRating : 4.5,
    ratingQuantity: stats.length > 0 ? stats[0].nRating : 0
  });
};

// Update dorm ratings after saving a review
reviewSchema.post('save', function() {
  this.constructor.calcAverageRating(this.dorm);
});

// Update dorm ratings after deleting a review
reviewSchema.post(/^findOneAndDelete/, async function(doc) {
  if (doc) await doc.constructor.calcAverageRating(doc.dorm);
});

module.exports = mongoose.model('Review', reviewSchema);