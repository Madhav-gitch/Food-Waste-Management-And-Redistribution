const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    enum: ['kg', 'items', 'L'],
    default: 'kg'
  },
  days: {
    type: Number,
    required: true,
  },
  storage: {
    type: String,
    enum: ['Room', 'Fridge'],
    required: true,
  },
  status: {
    type: String,
    enum: ['Fresh', 'Expiring', 'Waste'],
    default: 'Fresh',
  },
  deliveryStatus: {
    type: String,
    enum: ['Available', 'EnRoute', 'Completed'],
    default: 'Available'
  },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  ngoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  imgUrl: {
    type: String,
    default: null
  },
  donated: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date, // Tracks when the food is no longer available on the NGO side
    default: null
  },
  priorityScore: {
    type: Number,
    default: 0
  },
  autoAssigned: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Food', foodSchema);
