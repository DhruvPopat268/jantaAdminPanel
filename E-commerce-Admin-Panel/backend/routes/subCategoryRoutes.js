const express = require('express');
const router = express.Router();
const SubCategory = require('../models/SubCategory');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const jwt = require("jsonwebtoken")
const mongoose = require('mongoose')
const category = require('../models/category')
const verifyToken=require('../middleware/authMiddleware')


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'subcategories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 500, height: 500, crop: 'limit' },
      { quality: 'auto' }
    ]
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// GET Route - Get all subcategories OR filter by category ID
// GET /api/subcategories - Get all subcategories
// GET /api/subcategories?categoryId=123 - Get subcategories by category ID
router.get("/", async (req, res) => {
  try {
    const { categoryId, search, page = 1, limit = 1000, status } = req.query;

    // Parse pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(1000, parseInt(limit))); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;

    // Build query object for filtering
    let query = {};

    // Filter by category if provided
    if (categoryId) {
      query.category = categoryId;
    }

    // Add search functionality
    if (search && search.trim()) {
      const searchTerm = search.trim();
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } }
        // You can add more searchable fields here if needed
        // { description: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Filter by status if provided
    if (status !== undefined && status !== '') {
      query.status = status === 'true';
    }

    // Get total count for pagination
    const totalCount = await SubCategory.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNum);

    // Fetch subcategories with pagination
    const subCategories = await SubCategory.find(query)
      .populate("category", "name")
      .sort({ createdAt: -1 }) // Sort by newest first, you can change this
      .skip(skip)
      .limit(limitNum)
      .exec();

    // Return response in the expected format
    res.json([{
      success: true,
      count: subCategories.length,
      totalCount: totalCount,
      totalPages: totalPages,
      currentPage: pageNum,
      limit: limitNum,
      data: subCategories
    }]);

  } catch (err) {
    console.error('Error fetching subcategories:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


router.post("/categoryId",verifyToken, async (req, res) => {
  

  try {
    

    const { categoryId } = req.body;

    // ✅ Validate categoryId format
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    // ✅ Check if category exists and has status: true
    const categoryExists = await category.findOne({ 
      _id: categoryId, 
      status: true 
    });
    if (!categoryExists) {
      return res.status(200).json({
        success:true,
        category: []
      });
    }

    // ✅ Find related subcategories with status: true only
    const subCategories = await SubCategory.find({ 
      category: categoryId,
      status: true // Only fetch subcategories with status: true
    })
      .populate("category", "name")
      .exec();

    if (!subCategories || subCategories.length === 0) {
      return res.status(200).json({
        success: true,
        categoryId,
        count: 0,
        subCategories: []
      });
    }

    return res.status(200).json({
      success: true,
      categoryId,
      count: subCategories.length,
      data: subCategories
    });

  } catch (err) {
    console.error("Error fetching subcategories by category:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// GET Route - Get single subcategory by ID
// GET /api/subcategories/single/:id
router.get("/single/:id", async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id)
      .populate("category", "name")
      .exec();

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found"
      });
    }

    res.json({
      success: true,
      data: subCategory
    });
  } catch (err) {
    console.error('Error fetching subcategory:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// POST Route - Create SubCategory
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { categoryId, name, status } = req.body;
    const imageFile = req.file;

    if (!categoryId || !name) {
      return res.status(400).json({
        success: false,
        error: "categoryId and name are required"
      });
    }

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        error: "Image is required"
      });
    }

    const newSubCategory = new SubCategory({
      category: categoryId,
      name,
      status: status === "true" || status === true,
      image: imageFile.path
    });

    const savedSubCategory = await newSubCategory.save();
    await savedSubCategory.populate("category");

    res.status(201).json({
      success: true,
      data: savedSubCategory
    });
  } catch (error) {
    console.error("Error creating subcategory:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
});

// PUT Route - Update SubCategory
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { categoryId, name, status } = req.body;
    const imageFile = req.file;

    const updateData = {};
    if (categoryId) updateData.category = categoryId;
    if (name) updateData.name = name;
    if (status !== undefined) updateData.status = status === "true" || status === true;

    if (imageFile) {
      const oldSubCategory = await SubCategory.findById(req.params.id);

      if (oldSubCategory && oldSubCategory.image) {
        try {
          const publicId = oldSubCategory.image
            .split('/')
            .slice(-2)
            .join('/')
            .split('.')[0];

          await cloudinary.uploader.destroy(publicId);
        
        } catch (deleteError) {
          console.error('Error deleting old subcategory image from Cloudinary:', deleteError);
        }
      }

      updateData.image = imageFile.path;
    }

    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('category', 'name');

    if (!updatedSubCategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    res.json({
      success: true,
      data: updatedSubCategory
    });
  } catch (err) {
    console.error('Error updating subcategory:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// PATCH Route - Update subcategory (name/status only)
router.patch('/:id', async (req, res) => {
  const { name, status } = req.body;

  try {
    const subCategory = await SubCategory.findById(req.params.id);
    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "SubCategory not found"
      });
    }

    if (name !== undefined) subCategory.name = name;
    if (status !== undefined) subCategory.status = status;

    const updatedSubCategory = await subCategory.save();
    const populatedUpdated = await updatedSubCategory.populate("category", "name");

    res.json({
      success: true,
      data: populatedUpdated
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// DELETE Route - Delete SubCategory
router.delete('/:id', async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id);

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "SubCategory not found"
      });
    }

    if (subCategory.image) {
      try {
        const publicId = subCategory.image
          .split('/')
          .slice(-2)
          .join('/')
          .split('.')[0];

        await cloudinary.uploader.destroy(publicId);
       
      } catch (deleteError) {
        console.error('Error deleting subcategory image from Cloudinary:', deleteError);
      }
    }

    await SubCategory.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "SubCategory deleted successfully"
    });
  } catch (err) {
    console.error('Error deleting subcategory:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;