const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  mobileNumber: { type: String, required: true },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '30d' }, // Auto-expire after 30 days
});

module.exports = mongoose.model('Session', sessionSchema);