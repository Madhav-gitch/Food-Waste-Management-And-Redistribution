const mongoose = require('mongoose');

const foodRequestSchema = new mongoose.Schema({
  ngoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  foodType: {
    type: String,
    required: true
  },
  quantityNeeded: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    default: 'kg'
  },
  urgencyLevel: {
    type: String,
    enum: ['Normal', 'High', 'Critical'],
    default: 'Normal'
  },
  status: {
    type: String,
    enum: ['Active', 'Fulfilled', 'Expired'],
    default: 'Active'
  },
  notifiedRestaurants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  fulfilledById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FoodRequest', foodRequestSchema);
