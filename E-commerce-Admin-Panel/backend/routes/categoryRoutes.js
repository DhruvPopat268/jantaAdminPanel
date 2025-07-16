const express = require('express');
const multer = require('multer');
const path = require('path');
const Category = require('../models/category');
const mongoose = require('mongoose')
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'categories', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 500, height: 500, crop: 'limit' }, // Optional: resize images
      { quality: 'auto' } // Optional: optimize quality
    ]
  }
});
// const upload = multer({ storage });
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});


router.post('/', upload.single('image'), async (req, res) => {
  try {
    let imageUrl = null;
    
    if (req.file) {
      imageUrl = req.file.path; // Cloudinary URL
    }
    
    const category = new Category({
      ...req.body,
      image: imageUrl // Save Cloudinary URL
    });
    
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET all categories
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 100, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
   
    // Build query object
    let query = {};
   
    // Add search functionality - only search in fields that exist
    if (search && search.trim()) {
      const searchTerm = search.trim();
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } }
        // Remove description search if your Category model doesn't have this field
        // Add other searchable fields if they exist, for example:
        // { slug: { $regex: searchTerm, $options: 'i' } }
      ];
    }
   
    // Filter by status if provided
    if (status !== undefined && status !== '') {
      query.status = status === 'true';
    }
   
    // Execute query with proper error handling
    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(), // Use lean() for better performance
      Category.countDocuments(query)
    ]);
   
    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const currentPage = parseInt(page);
   
    res.status(200).json({
      success: true,
      data: categories,
      pagination: {
        current: currentPage,
        total: totalPages,
        count: categories.length,
        totalRecords: total,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Example using Express.js
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// PUT /api/categories/:id
router.put('/:id', upload.single('image'), async (req, res) => {
  const { name, status } = req.body;
  const updateData = { name, status };
  
  try {
    // If new image is uploaded
    if (req.file) {
      // Get the old category to delete old image from Cloudinary
      const oldCategory = await Category.findById(req.params.id);
      
      // Delete old image from Cloudinary if it exists
      if (oldCategory && oldCategory.image) {
        // Extract public_id from Cloudinary URL
        const publicId = oldCategory.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`categories/${publicId}`);
      }
      
      updateData.image = req.file.path; // New Cloudinary URL
    }
    
    const category = await Category.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );
    
    res.json({ success: true, category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    // Delete image from Cloudinary if it exists
    if (category && category.image) {
      const publicId = category.image.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`categories/${publicId}`);
    }
    
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
});

module.exports = router;
