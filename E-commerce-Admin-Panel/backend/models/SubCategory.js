// models/SubCategory.js
const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  status: { type: Boolean, default: true },
  image: String,
  // 👇 this line MUST look exactly like this
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
});

module.exports = mongoose.model("SubCategory", subCategorySchema);
