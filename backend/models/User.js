const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Admin', 'Restaurant', 'NGO'],
    default: 'Restaurant',
  },
  // Extra Donor Credentials
  location: { type: String },
  contactDetails: { type: String },
  founderName: { type: String },
  certificate: { type: String },
  // NGO Capacity
  capacity: {
      coldStorageMax: { type: Number, default: 100 },
      coldStorageCurrent: { type: Number, default: 0 },
      dryGoodsMax: { type: Number, default: 500 },
      dryGoodsCurrent: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
