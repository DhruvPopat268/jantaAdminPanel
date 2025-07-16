const express = require('express');
const router = express.Router();
const RouteSetup = require('../models/routeSetup'); // Adjust path as needed
const Village = require('../models/village');
const SalesAgent = require('../models/salesAgent');
const Route = require('../models/route');

// Get route setup data (villages and sales agents for a specific route)
router.get('/:routeId/setup', async (req, res) => {
  try {
    const { routeId } = req.params;
    // Check if route exists
    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }
    // Get existing route setup
    let routeSetup = await RouteSetup.findOne({ routeId })
      .populate('villages.villageId')
      .populate('salesAgents.agentId');
    // Get all villages for the checkboxes
    const allVillages = await Village.find({ status: true }).sort({ name: 1 });
    // If no setup exists, return all villages as unselected
    if (!routeSetup) {
      const villagesData = allVillages.map(village => ({
        id: village._id.toString(),
        name: village.name,
        checked: false
      }));
      return res.status(200).json({
        success: true,
        data: {
          routeId,
          villages: villagesData,
          customers: [],
          hasExistingSetup: false
        }
      });
    }
    // Map villages with their selection status
    const villagesData = allVillages.map(village => {
      const isSelected = routeSetup.villages.some(
        setupVillage => setupVillage.villageId && setupVillage.villageId._id.toString() === village._id.toString()
      );
      return {
        id: village._id.toString(),
        name: village.name,
        checked: isSelected
      };
    });
    // Map sales agents to customer format - Filter out null/deleted agents
    const customers = routeSetup.salesAgents
      .filter(agent => agent.agentId !== null && agent.agentId !== undefined) // Filter out null agents
      .map(agent => ({
        id: agent.agentId._id,
        name: agent.agentName,
        villages: [agent.village],
        status: agent.status,
        email: agent.agentId.email || '',
        phone: agent.agentId.mobileNumber || ''
      }));
    res.status(200).json({
      success: true,
      data: {
        routeId,
        villages: villagesData,
        customers,
        hasExistingSetup: true
      }
    });
  } catch (error) {
    console.error('Error fetching route setup:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Save/Update route setup
// Save/Update route setup
router.post('/:routeId/setup', async (req, res) => {
  try {
    const { routeId } = req.params;
    const { selectedVillages, villageIds } = req.body;

    // Validate input
    if (!selectedVillages || selectedVillages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No villages selected'
      });
    }

    // Extract village IDs from the selectedVillages array
    const selectedVillageIds = selectedVillages.map(village => village.id);

    // Get all sales agents with populated village data
    const allSalesAgents = await SalesAgent.find({ status: true })
      .populate('village', 'name') // Populate village field with name
      .exec();

    // Filter sales agents based on village IDs
    const filteredSalesAgents = allSalesAgents.filter(agent => {
      if (!agent.village) return false;
      
      // Check if agent's village ID matches any selected village ID
      const agentVillageId = agent.village._id.toString();
      return selectedVillageIds.includes(agentVillageId);
    });

    // Transform to customer format (to match your frontend expectations)
    const customers = filteredSalesAgents.map(agent => ({
      id: agent._id,
      name: agent.name,
      villages: [agent.village.name], // Use the populated village name
      status: agent.status,
      email: agent.email || '',
      phone: agent.mobileNumber || ''
    }));

    // Get full village details
    const villageIdList = selectedVillages.map(village => village.id);
    const villages = await Village.find({ 
      _id: { $in: villageIdList } 
    });

    // Save or update the route setup
    let routeSetup = await RouteSetup.findOne({ routeId });

    if (routeSetup) {
      // Update existing setup
      routeSetup.villages = selectedVillages.map(village => ({
        villageId: village.id,
        villageName: village.name
      }));
      
      routeSetup.salesAgents = customers.map(customer => ({
        agentId: customer.id,
        agentName: customer.name,
        village: customer.villages[0],
        status: customer.status
      }));

      await routeSetup.save();
    } else {
      // Create new setup
      routeSetup = new RouteSetup({
        routeId,
        villages: selectedVillages.map(village => ({
          villageId: village.id,
          villageName: village.name
        })),
        salesAgents: customers.map(customer => ({
          agentId: customer.id,
          agentName: customer.name,
          village: customer.villages[0],
          status: customer.status
        }))
      });

      await routeSetup.save();
    }

    res.json({
      success: true,
      data: {
        customers: customers,
        selectedVillages: selectedVillages,
        villageDetails: villages,
        routeId: routeId
      }
    });

  } catch (error) {
    console.error('Error in route setup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup route',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete route setup
router.delete('/:routeId/setup', async (req, res) => {
  try {
    const { routeId } = req.params;

    const deletedSetup = await RouteSetup.findOneAndDelete({ routeId });

    if (!deletedSetup) {
      return res.status(404).json({
        success: false,
        message: 'Route setup not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Route setup deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting route setup:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get customers for specific villages (used for dynamic loading)
router.post('/:routeId/customers', async (req, res) => {
  try {
    const { routeId } = req.params;
    const { villageNames } = req.body;

    if (!villageNames || !Array.isArray(villageNames)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide village names'
      });
    }

  

    // Get sales agents for the specified villages with improved matching
    const allSalesAgents = await SalesAgent.find({ status: true });
    
    const filteredSalesAgents = allSalesAgents.filter(agent => {
      if (!agent.village) return false;
      
      return villageNames.some(selectedVillageName => {
        const agentVillage = agent.village.toLowerCase();
        const selectedVillage = selectedVillageName.toLowerCase();
        
        // Same improved matching logic
        if (agentVillage === selectedVillage) return true;
        if (agentVillage.includes(selectedVillage)) return true;
        if (selectedVillage.includes(agentVillage)) return true;
        
        const cleanAgentVillage = agentVillage.replace(/\([^)]*\)/g, '').trim();
        const cleanSelectedVillage = selectedVillage.replace(/\([^)]*\)/g, '').trim();
        
        if (cleanAgentVillage === cleanSelectedVillage) return true;
        if (cleanAgentVillage.includes(cleanSelectedVillage)) return true;
        if (cleanSelectedVillage.includes(cleanAgentVillage)) return true;
        
        return false;
      });
    });

    // Transform to customer format
    const customers = filteredSalesAgents.map(agent => ({
      id: agent._id,
      name: agent.name,
      villages: [agent.village],
      status: agent.status,
      email: agent.email || '',
      phone: agent.mobileNumber || ''
    }));

  

    res.status(200).json({
      success: true,
      data: customers
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;