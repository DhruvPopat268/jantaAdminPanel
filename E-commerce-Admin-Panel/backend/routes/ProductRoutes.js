const express = require('express');
const router = express.Router();
const Product = require('../models/product');

// POST /api/products - create new product
router.post("/", async (req, res) => {
  try {
    // You can pass all fields from req.body including status or omit it (it will default to true)
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
    try {
        let products = await Product.find({})

        res.json(products);
    } catch (err) {
        console.log("Error: " + err);
    }
})

router.delete('/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updateData = req.body; // Expect the whole updated product data here

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true, // return the updated document
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch("/:id/status", async (req, res) => {
  const productId = req.params.id;
  const { status } = req.body; // expect status as boolean in the request body

  if (typeof status !== "boolean") {
    return res.status(400).json({ error: "Status must be a boolean." });
  }

  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { status: status },
      { new: true } // return the updated document
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: "Product not found." });
    }

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: "Server error." });
  }
});


module.exports = router;