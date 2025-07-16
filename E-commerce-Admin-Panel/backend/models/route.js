const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Route name is required'],
    trim: true,
    maxlength: [100, 'Route name cannot exceed 100 characters']
  },
  status: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
routeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for formatted created date
routeSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toISOString().split('T')[0];
});

// Ensure virtual fields are serialized
routeSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Route', routeSchema);