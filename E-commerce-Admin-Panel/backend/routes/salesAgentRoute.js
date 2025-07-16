const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const SalesAgent = require('../models/salesAgent');
const jwt = require('jsonwebtoken');
const Village = require('../models/village')
const verifyToken = require('../middleware/authMiddleware');
const mongoose = require('mongoose')
const Session = require('../models/Session'); // adjust path if needed



// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

// Helper function to upload image to Cloudinary
const uploadToCloudinary = (buffer, folder = 'sales-agents') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "Sales Agent",
        transformation: [
          { width: 300, height: 300, crop: 'fill', quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(buffer);
  });
};

// Helper function to delete image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
  }
};

// GET all sales agents with search functionality
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 100, status } = req.query;
    const skip = (page - 1) * limit;

    // Build query object
    let query = {};

    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { 'village.name': { $regex: search, $options: 'i' } } // only works if embedded or populated
      ];
    }

    // Filter by status if provided
    if (status !== undefined) {
      query.status = status === 'true';
    }

    const salesAgents = await SalesAgent.find(query)
      .populate('village', 'name') // ⬅️ Only populate village name
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SalesAgent.countDocuments(query);

    res.status(200).json({
      success: true,
      data: salesAgents,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: salesAgents.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sales agents',
      error: error.message
    });
  }
});

// GET single sales agent by ID
router.get('/:id', async (req, res) => {
  try {
    const salesAgent = await SalesAgent.findById(req.params.id);

    if (!salesAgent) {
      return res.status(404).json({
        success: false,
        message: 'Sales agent not found'
      });
    }

    res.status(200).json({
      success: true,
      data: salesAgent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sales agent',
      error: error.message
    });
  }
});

// POST create new sales agent
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { name, businessName, mobileNumber, address, village } = req.body;

    // Validate required fields
    if (!name || !businessName || !mobileNumber || !address || !village) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, businessName, mobileNumber, address, village) are required'
      });
    }

    // Check if mobile number already exists
    const existingAgent = await SalesAgent.findOne({ mobileNumber });
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'Sales agent with this mobile number already exists'
      });
    }

    let photoData = {};

    // Handle photo upload if provided
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        photoData = {
          public_id: result.public_id,
          url: result.secure_url
        };
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: 'Error uploading image',
          error: uploadError.message
        });
      }
    }

    // Fetch village details
    const villageData = await Village.findById(village);
    if (!villageData) {
      return res.status(404).json({
        success: false,
        message: 'Village not found'
      });
    }

    // Create new sales agent
    const newSalesAgent = new SalesAgent({
      name,
      businessName,
      mobileNumber,
      address,
      village,
      villageName: villageData.name,
      villageCode: villageData.code || 'LT', // Use villageData.code or fallback to 'LT'
      photo: photoData,
      status: false // Default status
    });

    const savedAgent = await newSalesAgent.save();

    res.status(200).json({
      success: true,
      message: 'Sales agent created successfully',
      data: savedAgent
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error creating sales agent',
      error: error.message
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { mobileNumber, MobileNumber } = req.body;
    const mobile = mobileNumber || MobileNumber;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required'
      });
    }

    const salesAgent = await SalesAgent.findOne({ mobileNumber: mobile });

    if (!salesAgent) {
      return res.status(404).json({
        success: false,
        message: 'Mobile number does not exist'
      });
    }

    // 📍 Village name logic
    let villageName = '';
    if (salesAgent.village) {
      const villageData = await Village.findById(salesAgent.village);
      villageName = villageData ? villageData.name : '';
    }

    // 🔑 Generate new token
    const token = jwt.sign(
      {
        id: salesAgent._id,
        mobileNumber: mobile,
        name: salesAgent.name,
        businessName: salesAgent.businessName,
        village: salesAgent.village
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    // ❌ Delete any previous session
    await Session.findOneAndDelete({ mobileNumber: mobile });

    // ✅ Save new session
    await Session.create({ mobileNumber: mobile, token });

    // ✅ Send response
    res.status(200).json({
      success: true,
      message: 'Login Successfully',
      token,
      status: salesAgent.status,
      data: {
        id: salesAgent._id,
        name: salesAgent.name,
        businessName: salesAgent.businessName,
        mobileNumber: salesAgent.mobileNumber,
        village: salesAgent.village,
        villageName: villageName,
        status: salesAgent.status,
        address: salesAgent.address,
        photo: salesAgent.photo
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
});

router.post('/logout', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Remove the session using userId
    const deleted = await Session.findOneAndDelete({ userId });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'No session found for this user'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful. Session removed.'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during logout',
      error: error.message
    });
  }
});


router.post('/getCustomerData', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const agent = await SalesAgent.findById(userId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Sales agent not found'
      });
    }

    // Optionally populate village name from Village collection if needed
    const village = await Village.findById(agent.village);

    res.status(200).json({
      success: true,
      message: 'Sales agent data retrieved successfully',
      data: {
        _id: agent._id,
        name: agent.name,
        businessName: agent.businessName,
        mobileNumber: agent.mobileNumber,
        address: agent.address,
        village: agent.village,
        villageName: village?.name || agent.villageName || null,
        photo: agent.photo || {},
        status: agent.status
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving sales agent data',
      error: error.message
    });
  }
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>beloew put route is for android>>>>
router.put('/updateCustomerData', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    const userId = req.userId;
    const { name, businessName, mobileNumber, address, village } = req.body;

    const agent = await SalesAgent.findById(userId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Sales agent not found'
      });
    }

    // Optional photo update
    let photoData = agent.photo;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        photoData = {
          public_id: result.public_id,
          url: result.secure_url
        };
      } catch (uploadErr) {
        return res.status(400).json({
          success: false,
          message: 'Photo upload failed',
          error: uploadErr.message
        });
      }
    }

    // Optional village name update
    const villageDoc = village ? await Village.findById(village) : null;

    // Update fields
    agent.name = name || agent.name;
    agent.businessName = businessName || agent.businessName;
    agent.mobileNumber = mobileNumber || agent.mobileNumber;
    agent.address = address || agent.address;
    agent.village = village || agent.village;
    agent.villageName = villageDoc?.name || agent.villageName;
    agent.photo = photoData;

    const updatedAgent = await agent.save();

    res.status(200).json({
      success: true,
      message: 'Sales agent updated successfully',
      data: updatedAgent
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sales agent',
      error: error.message
    });
  }
});

// PUT update sales agent
router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const { name, businessName, mobileNumber, address, village } = req.body;
    const agentId = req.params.id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid agent ID format'
      });
    }

    // Validate village ID if provided
    if (village && !mongoose.Types.ObjectId.isValid(village)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid village ID format'
      });
    }

    // Find existing agent
    const existingAgent = await SalesAgent.findById(agentId);
    if (!existingAgent) {
      return res.status(404).json({
        success: false,
        message: 'Sales agent not found'
      });
    }

    // Check for duplicate mobile number if changed
    if (mobileNumber && mobileNumber !== existingAgent.mobileNumber) {
      const duplicateAgent = await SalesAgent.findOne({
        mobileNumber,
        _id: { $ne: agentId }
      });

      if (duplicateAgent) {
        return res.status(400).json({
          success: false,
          message: 'Sales agent with this mobile number already exists'
        });
      }
    }

    // Prepare update data
    const updateData = {
      ...(name && { name }),
      ...(businessName && { businessName }),
      ...(mobileNumber && { mobileNumber }),
      ...(address && { address }),
      ...(village && { village })
    };

    // If village is updated, fetch the village name and code
    if (village) {
      const villageDoc = await Village.findById(village);
      if (!villageDoc) {
        return res.status(400).json({
          success: false,
          message: 'Invalid village ID'
        });
      }
      updateData.villageName = villageDoc.name;
      updateData.villageCode = villageDoc.code || 'LT'; // Default to 'LT' if code is not available
    }

    // Handle photo upload if new photo is provided
    if (req.file) {
      try {
        if (existingAgent.photo?.public_id) {
          await deleteFromCloudinary(existingAgent.photo.public_id);
        }

        const result = await uploadToCloudinary(req.file.buffer);
        updateData.photo = {
          public_id: result.public_id,
          url: result.secure_url
        };
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: 'Error uploading image',
          error: uploadError.message
        });
      }
    }

    // Update agent
    const updatedAgent = await SalesAgent.findByIdAndUpdate(
      agentId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Sales agent updated successfully',
      data: updatedAgent
    });

  } catch (error) {
    console.error('Error updating sales agent:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format provided',
        error: 'The provided ID is not a valid ObjectId'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating sales agent',
      error: error.message
    });
  }
});

// PUT update sales agent status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const agentId = req.params.id;

    // Validate status value
    if (typeof status !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Status must be a boolean value (true or false)'
      });
    }

    // Find and update the agent's status
    const updatedAgent = await SalesAgent.findByIdAndUpdate(
      agentId,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedAgent) {
      return res.status(404).json({
        success: false,
        message: 'Sales agent not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Sales agent status ${status ? 'activated' : 'deactivated'} successfully`,
      data: updatedAgent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating sales agent status',
      error: error.message
    });
  }
});

// PUT /api/salesAgents/:id/route-status

router.put('/:id/route-status', async (req, res) => {
  try {
    const { routeStatus } = req.body;
    const agentId = req.params.id;

    // Validate routeStatus value
    if (typeof routeStatus !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'routeStatus must be a boolean value (true or false)'
      });
    }

    // Update routeStatus
    const updatedAgent = await SalesAgent.findByIdAndUpdate(
      agentId,
      { routeStatus },
      { new: true, runValidators: true }
    );

    if (!updatedAgent) {
      return res.status(404).json({
        success: false,
        message: 'Sales agent not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Route status ${routeStatus ? 'activated' : 'deactivated'} successfully`,
      data: updatedAgent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating route status',
      error: error.message
    });
  }
});


// DELETE sales agent
router.delete('/:id', async (req, res) => {
  try {
    const agentId = req.params.id;

    // Find the agent to get photo info before deletion
    const agent = await SalesAgent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Sales agent not found'
      });
    }

    // Delete image from Cloudinary if exists
    if (agent.photo && agent.photo.public_id) {
      await deleteFromCloudinary(agent.photo.public_id);
    }

    // Delete agent from database
    await SalesAgent.findByIdAndDelete(agentId);

    res.status(200).json({
      success: true,
      message: 'Sales agent deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting sales agent',
      error: error.message
    });
  }
});

// GET sales agents statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalAgents = await SalesAgent.countDocuments();
    const activeAgents = await SalesAgent.countDocuments({ status: true });
    const inactiveAgents = await SalesAgent.countDocuments({ status: false });

    res.status(200).json({
      success: true,
      data: {
        total: totalAgents,
        active: activeAgents,
        inactive: inactiveAgents
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

module.exports = router;