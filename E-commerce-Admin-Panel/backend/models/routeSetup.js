const mongoose = require('mongoose');

const routeSetupSchema = new mongoose.Schema({
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: [true, 'Route ID is required']
  },
  villages: [{
    villageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required: true
    },
    villageName: {
      type: String,
      required: true
    },
    selected: {
      type: Boolean,
      default: true
    }
  }],
  salesAgents: [{
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesAgent',
      required: true
    },
    agentName: {
      type: String,
      required: true
    },
    village: {
      type: String,
      required: true
    },
    status: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
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
routeSetupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
routeSetupSchema.index({ routeId: 1 });
routeSetupSchema.index({ 'villages.villageId': 1 });
routeSetupSchema.index({ 'salesAgents.agentId': 1 });

module.exports = mongoose.model('RouteSetup', routeSetupSchema);