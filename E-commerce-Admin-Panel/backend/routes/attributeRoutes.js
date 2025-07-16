const express = require("express");
const router = express.Router();
const Attribute = require("../models/Attribute");

// GET all attributes
router.get("/", async (req, res) => {
  try {
    const attributes = await Attribute.find().sort({ createdAt: -1 });
    res.json(attributes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create attribute
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const exists = await Attribute.findOne({ name });
    if (exists) return res.status(409).json({ message: "Attribute already exists" });

    const attribute = new Attribute({ name });
    await attribute.save();

    res.status(200).json(attribute);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE attribute by id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Attribute.findByIdAndDelete(id);
    res.json({ message: "Attribute deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update attribute by id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const updatedAttribute = await Attribute.findByIdAndUpdate(id, { name }, { new: true });
    res.json(updatedAttribute);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
