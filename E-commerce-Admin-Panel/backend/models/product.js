const mongoose = require("mongoose");

const AttributeSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.ObjectId, ref: "Attribute" }, // <--- update this
  name: { type: String, required: true },
  price: { type: Number },
  discountedPrice: { type: Number, default: 0 },
});

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    },
    subCategory: {
      // type: mongoose.Schema.Types.ObjectId,
      // ref: 'SubCategory'
      type:String
    },
    visibility: { type: Boolean, default: true },
    status: { type: Boolean, default: true },
    images: [String],
    tags: [{ type: String }],
    attributes: [AttributeSchema],
    featured: { type: Boolean, default: false },
    showInDailyNeeds: { type: Boolean, default: false }, // ✅ NEW FIELD
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", ProductSchema);