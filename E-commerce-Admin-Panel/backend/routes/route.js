const express = require('express');
const router = express.Router();
const Route = require('../models/route');
const RouteSetup = require('../models/routeSetup')
const SalesAgent = require('../models/salesAgent'); // Adjust path as needed
const cron = require('node-cron');
const OneSignal = require('@onesignal/node-onesignal');
const jwt = require('jsonwebtoken')
const axios = require('axios')
const sendNotificationToPlayer = require('../utils/sendNotification');
const updateAgentTags = require('../utils/updateAgentTags');
const verifyToken=require('../middleware/authMiddleware')


const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY

// IMPROVED: Route status endpoint with better error handling
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid route ID format' });
    }

    const route = await Route.findById(id);
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    const newStatus = !route.status;
    route.status = newStatus;
    const updatedRoute = await route.save();

    let agentIds = [];

    try {
      const routeSetup = await RouteSetup.findOne({ routeId: id });

      if (routeSetup?.salesAgents?.length > 0) {
        agentIds = routeSetup.salesAgents.map(agent => agent.agentId);
        

        const updateResult = await SalesAgent.updateMany(
          { _id: { $in: agentIds } },
          { $set: { routeStatus: newStatus } }
        );

        // Send notification only when status is true (route is enabled)
        if (newStatus === true) {
          const agents = await SalesAgent.find({ _id: { $in: agentIds } });

          const title = 'Order Fast';
          const message = 'Hello Customers, today is your day — order fast!';

          for (const agent of agents) {
            if (agent.oneSignalPlayerId) {
              await sendNotificationToPlayer(agent.oneSignalPlayerId, title, message, {
                routeId: route._id.toString(),
                routeStatus: newStatus.toString(),
                agentId: agent._id.toString(),
              });
            }
          }

          console.log(`Updated and notified ${updateResult.modifiedCount} sales agents`);
        } else {
          console.log(`Route disabled - no notifications sent to ${updateResult.modifiedCount} sales agents`);
        }
      } else {
        console.log(`No route setup or agents for route ID: ${id}`);
      }
    } catch (agentUpdateError) {
      console.error('Error updating agents:', agentUpdateError);
    }

    res.status(200).json({
      success: true,
      message: `Route ${newStatus ? 'enabled' : 'disabled'} and agents updated`,
      data: {
        id: updatedRoute._id,
        name: updatedRoute.name,
        status: updatedRoute.status,
        createdAt: updatedRoute.formattedCreatedAt,
      },
    });

  } catch (error) {
    console.error('Error updating route status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating route status',
      error: error.message,
    });
  }
});

// Route to register agent's OneSignal player ID
router.post('/register-agent-player',verifyToken, async (req, res) => {
  
  try {
    
    const agentId = req.userId;
    const { playerId } = req.body;

    if (!agentId || !playerId) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID and Player ID are required'
      });
    }

    // Update agent with OneSignal player ID
    const agent = await SalesAgent.findByIdAndUpdate(
      agentId,
      { oneSignalPlayerId: playerId },
      { new: true }
    );

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Try to set initial tags in OneSignal
    // Note: Don't use 'app_id' as a tag name - OneSignal reserves this
    const tagSuccess = await updateAgentTags(playerId, {
      agent_id: agentId.toString(), // Ensure it's a string
      route_status: agent.routeStatus ? 'true' : 'false',
      
      registered_at: new Date().toISOString()
    });

    // Don't fail the entire registration if tagging fails
    res.json({
      success: true,
      message: 'Agent Player ID registered successfully',
      tagsUpdated: tagSuccess,
      ...(tagSuccess ? {} : {
        warning: 'Player ID saved but initial tags could not be set. Tags will be updated on next notification.'
      })
    });
  } catch (error) {
    console.error('Error registering agent player ID:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> 

// GET /api/routes - Get all routes
router.get('/', async (req, res) => {
  try {
     const { search, page = 1, limit = 100, status } = req.query;
    const skip = (page - 1) * limit;
   
    // Build query object
    let query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' }; // Case-insensitive search
    }

    const routes = await Route.find(query).sort({ createdAt: -1 });

    // Format response to match frontend expectations
    const formattedRoutes = routes.map(route => ({
      id: route._id,
      name: route.name,
      status: route.status,
      createdAt: route.formattedCreatedAt
    }));

    res.status(200).json({
      success: true,
      count: formattedRoutes.length,
      data: formattedRoutes
    });

  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching routes',
      error: error.message
    });
  }
});

// POST /api/routes - Create new route
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Route name is required'
      });
    }

    // Check if route with same name already exists
    const existingRoute = await Route.findOne({
      name: { $regex: `^${name.trim()}$`, $options: 'i' }
    });

    if (existingRoute) {
      return res.status(400).json({
        success: false,
        message: 'Route with this name already exists'
      });
    }

    // Create new route
    const newRoute = new Route({
      name: name.trim(),
      status: false
    });

    const savedRoute = await newRoute.save();

    // Format response
    const formattedRoute = {
      id: savedRoute._id,
      name: savedRoute.name,
      status: savedRoute.status,
      createdAt: savedRoute.formattedCreatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: formattedRoute
    });

  } catch (error) {
    console.error('Error creating route:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating route',
      error: error.message
    });
  }
});

// DELETE /api/routes/:id - Delete route
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid route ID format'
      });
    }

    const deletedRoute = await Route.findByIdAndDelete(id);

    if (!deletedRoute) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Route deleted successfully',
      data: {
        id: deletedRoute._id,
        name: deletedRoute.name
      }
    });

  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting route',
      error: error.message
    });
  }
});

// Add this import if missing

module.exports = router;