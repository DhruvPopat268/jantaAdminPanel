const express = require('express');
const router = express.Router();
const multer = require('multer');
const Banner = require('../models/bannerModel');
const mongoose = require('mongoose');
const category = require('../models/category')
const SubCategory = require('../models/SubCategory')
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const jwt = require('jsonwebtoken')
const verifyToken=require('../middleware/authMiddleware')



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'banner', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 500, height: 500, crop: 'limit' }, // Optional: resize images
      { quality: 'auto' } // Optional: optimize quality
    ]
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// POST Route - Create Banner
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, type, categoryId, subcategoryId, status } = req.body;
    const imageFile = req.file;

    if (!title || !type || !imageFile) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Clean up categoryId and subcategoryId - convert empty strings to null
    const cleanCategoryId = categoryId && categoryId.trim() !== "" ? categoryId : null;
    const cleanSubcategoryId = subcategoryId && subcategoryId.trim() !== "" ? subcategoryId : null;

    // Validate ObjectId format
    if (cleanCategoryId && !mongoose.Types.ObjectId.isValid(cleanCategoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid categoryId"
      });
    }
    if (cleanSubcategoryId && !mongoose.Types.ObjectId.isValid(cleanSubcategoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategoryId"
      });
    }

    const bannerData = {
      title,
      type,
      categoryId: cleanCategoryId,
      subcategoryId: cleanSubcategoryId,
      status: status === "true",
      // Store the full Cloudinary URL
      image: imageFile.path, // This contains the full Cloudinary URL
    };

    const newBanner = await Banner.create(bannerData);

    return res.status(201).json({
      success: true,
      data: newBanner
    });
  } catch (error) {
    console.error("Error creating banner:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
});

// PUT Route - Update Banner
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid banner ID' });
    }

    // Extract fields from req.body
    const { title, type, categoryId, subcategoryId, status } = req.body;

    const updatedData = {
      title,
      type,
      status: status === 'true',
    };

    // Handle categoryId
    if (categoryId && categoryId.trim() !== '' && mongoose.Types.ObjectId.isValid(categoryId)) {
      updatedData.categoryId = categoryId;
    } else if (categoryId === '' || categoryId === null || categoryId === undefined) {
      updatedData.categoryId = null;
    }

    // Handle subcategoryId
    if (subcategoryId && subcategoryId.trim() !== '' && mongoose.Types.ObjectId.isValid(subcategoryId)) {
      updatedData.subcategoryId = subcategoryId;
    } else if (subcategoryId === '' || subcategoryId === null || subcategoryId === undefined) {
      updatedData.subcategoryId = null;
    }

    // Handle file upload with Cloudinary cleanup
    if (req.file) {
      // Get the old banner to delete old image from Cloudinary
      const oldBanner = await Banner.findById(id);

      // Delete old image from Cloudinary if it exists
      if (oldBanner && oldBanner.image) {
        try {
          // Extract public_id from Cloudinary URL
          const publicId = oldBanner.image
            .split('/')
            .slice(-2) // Get last two parts: folder/filename
            .join('/')
            .split('.')[0]; // Remove file extension

          await cloudinary.uploader.destroy(publicId);
         
        } catch (deleteError) {
          console.error('Error deleting old image from Cloudinary:', deleteError);
          // Continue with update even if old image deletion fails
        }
      }

      // Store the new Cloudinary URL
      updatedData.image = req.file.path;
    }

    const banner = await Banner.findByIdAndUpdate(id, updatedData, { new: true });

    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    res.json(banner);
  } catch (err) {
    console.error('Update banner error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE Route - Delete Banner
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

  

    // Validate the ID format first
    if (!mongoose.Types.ObjectId.isValid(id)) {
     
      return res.status(400).json({
        success: false,
        error: 'Invalid banner ID format'
      });
    }

    // Check if banner exists first
    const existingBanner = await Banner.findById(id);
    if (!existingBanner) {
   
      return res.status(404).json({
        success: false,
        error: 'Banner not found'
      });
    }

   

    // Delete image from Cloudinary if it exists
    if (existingBanner.image) {
      try {
        // Extract public_id from Cloudinary URL
        const publicId = existingBanner.image
          .split('/')
          .slice(-2) // Get last two parts: folder/filename
          .join('/')
          .split('.')[0]; // Remove file extension

        await cloudinary.uploader.destroy(publicId);
    
      } catch (deleteError) {
        console.error('Error deleting image from Cloudinary:', deleteError);
        // Continue with banner deletion even if image deletion fails
      }
    }

    // Delete the banner
    const deletedBanner = await Banner.findByIdAndDelete(id);

    if (!deletedBanner) {
    
      return res.status(404).json({
        success: false,
        error: 'Banner not found or already deleted'
      });
    }

 

    res.json({
      success: true,
      message: 'Banner deleted successfully',
      data: deletedBanner
    });

  } catch (err) {
    console.error('Delete error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });

    res.status(500).json({
      success: false,
      error: 'Server error during deletion',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET: Fetch all banners
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find()
      .sort({ createdAt: -1 })
      .populate('categoryId', 'name')    // Only fetch the 'name' field from Category
      .populate('subcategoryId', 'name'); // Only fetch the 'name' field from Subcategory

    // Add full image URL to each banner
    const bannersWithImageUrl = banners.map(banner => ({
      ...banner.toObject(),
      imageUrl: banner.image ? `/uploads/${banner.image}` : null
    }));

    res.status(200).json(bannersWithImageUrl);
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err.message });
  }
});

// PUT: Toggle status
router.put('/toggle/:id', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });

    banner.status = !banner.status;
    await banner.save();
    res.json(banner);
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err.message });
  }
});

// ------------------------>> application 

router.post('/android',verifyToken, async (req, res) => {
  
  try {
    

    const banners = await Banner.find({ status: true }) // Only fetch banners with status true
      .sort({ createdAt: -1 })
      .populate('categoryId', 'name')        // Populate category name
      .populate('subcategoryId', 'name');    // Populate subcategory name

    // Add full image URL to each banner
    const bannersWithImageUrl = banners.map(banner => ({
      ...banner.toObject(),
      imageUrl: banner.image ? `/uploads/${banner.image}` : null
    }));

    res.status(200).json(bannersWithImageUrl);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
})

module.exports = router;