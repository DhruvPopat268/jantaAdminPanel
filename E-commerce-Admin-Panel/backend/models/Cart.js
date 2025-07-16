const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // ✅ just a string
    productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
    productName: { type: String, required: true },
    image: { type: String },
    attributes: {
        _id: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        discountedPrice: { type: Number },
        quantity: { type: Number, required: true },
        total: { type: Number, default: null } // add total here to store or calculate
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cart', cartSchema);