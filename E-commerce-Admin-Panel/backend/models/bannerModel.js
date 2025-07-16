const mongoose = require('mongoose');


const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['Category', 'Subcategory'], required: true },

  // Reference to Category document
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },

  // Reference to Subcategory document
  subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory' },

  image: String,
  status: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Banner', bannerSchema);