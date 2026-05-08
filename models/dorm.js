const mongoose = require('mongoose');

const dormSchema = new mongoose.Schema({
  university: {
    type: String,
    required: [true, 'Please specify the university']
  },
  location: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: [Number], // [longitude, latitude]
    address: String
  },
  description: {
    type: String,
    trim: true,
    required: [true, 'A dorm must have a description']
  },
  amenities: [String], // e.g., ["WiFi", "Laundry", "Gym"]
  photos: [String], // Array of image paths
  ratingAverage: {
    type: Number,
    default: 0,
    min: [1, 'Rating must be above 1.0'],
    max: [5, 'Rating must be below 5.0'],
    set: val => Math.round(val * 10) / 10 // 4.666 => 4.7
  },
  ratingQuantity: {
    type: Number,
    default: 0
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
},
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create geospatial index for location-based searches
dormSchema.index({ location: '2dsphere' });

// Virtual populate reviews (without persisting in DB)
dormSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'dorm',
  localField: '_id'
});

module.exports = mongoose.model('Dorm', dormSchema);
