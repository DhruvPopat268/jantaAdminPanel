const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  orders: [
    {
      productId: String,
      productName: String,
      image: String,
      attributes: Object,
    }
  ],
  orderDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    default: 'pending', // ✔️ initial status
    enum: ['pending', 'confirmed', 'out for delivery', 'delivered', 'cancelled', 'returned'], // optional but useful
  },
  villageCode: {
    type: String,
  },
  orderType: {
    type: String,
    enum: ['take-away', 'delivery'], // optional but useful
  },
  cancellationDate: {
  type: Date,
  default: null
}

});

module.exports = mongoose.model('Order', orderSchema);