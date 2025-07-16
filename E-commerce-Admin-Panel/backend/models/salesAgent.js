const mongoose = require('mongoose');

const salesAgentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    maxlength: [150, 'Business name cannot exceed 150 characters']
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[\+]?[1-9][\d]{0,15}$/.test(v);
      },
      message: 'Please enter a valid mobile number'
    }
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  village: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    required: [true, 'Village id  is required'],
  },
  villageName:{
    type: String,
  },
  photo: {
    public_id: {
      type: String,
      default: null
    },
    url: {
      type: String,
      default: null
    }
  },
  status: {
    type: Boolean,
    default: false // New agents start with false status
  },
  routeStatus:{
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
  },
  oneSignalPlayerId:{
          type: String,

  },
  villageCode: { type: String }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
salesAgentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster search queries
salesAgentSchema.index({ name: 'text', businessName: 'text', mobileNumber: 'text' });

module.exports = mongoose.model('SalesAgent', salesAgentSchema);