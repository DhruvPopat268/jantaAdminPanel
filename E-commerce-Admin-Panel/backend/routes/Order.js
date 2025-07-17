const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const SalesAgent = require('../models/salesAgent');
const verifyToken = require('../middleware/authMiddleware');
const RouteSetup = require('../models/routeSetup');
const Route = require('../models/route');
const mongoose = require('mongoose')
const Village = require('../models/village')
const jwt = require('jsonwebtoken')

router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { orderType, autoPrint = true } = req.body; // Add autoPrint option

    // Validate orderType
    const validOrderTypes = ['take-away', 'delivery'];
    if (orderType && !validOrderTypes.includes(orderType)) {
      return res.status(400).json({ message: 'Invalid order type' });
    }

    // Find the sales agent to get village code and route status
    const salesAgent = await SalesAgent.findById(userId);
    if (!salesAgent) {
      return res.status(404).json({ message: 'Sales agent not found' });
    }

    // Check if today's route is active
    if (!salesAgent.routeStatus) {
      return res.status(200).json({
        status: 'false',
        message: "આજે તમારો વારો નથી. તેથી તમે ઓર્ડર આપી શકતા નથી!"
      });
    }

    // Get cart items
    const cartItems = await Cart.find({ userId });
    if (!cartItems.length) {
      return res.status(200).json({ message: 'No items in cart to place order' });
    }

    // Prepare order items
    const orderItems = cartItems.map(item => {
      // Round the total to nearest whole number
      const attributes = {
        ...item.attributes.toObject ? item.attributes.toObject() : item.attributes,
        total: Math.round(item.attributes.total),
      };

      return {
        productId: item.productId?.toString(),
        productName: item.productName,
        image: item.image,
        quantity: item.quantity || 1,
        price: item.price || 0,
        attributes,
      };
    });


    console.log(salesAgent.villageName);

    // Create and save the new order
    const newOrder = new Order({
      userId,
      orders: orderItems,
      status: 'pending',
      villageCode: salesAgent.villageCode,
      orderType: orderType || 'delivery', // default to 'delivery' if not provided
    });

    await newOrder.save();
    await Cart.deleteMany({ userId });

    // Prepare response data
    const responseData = {
      status: 'true',
      message: 'Order placed successfully',
      order: newOrder,
      salesAgentName: salesAgent.name,
      salesAgentMobile: salesAgent.mobileNumber,
      villageName: salesAgent.villageName,
    };

    // Auto-print functionality (if enabled)
    let printStatus = null;
    if (autoPrint) {
      try {
        // Get io instance from app
        const io = req.app.get('io');

        if (io) {
          // Check if any printers are connected
          const printersRoom = io.sockets.adapter.rooms.get('printers');

          if (printersRoom && printersRoom.size > 0) {
            // Send print job to all connected printers
            io.to('printers').emit('print-order', {
              order: newOrder,
              salesAgentName: salesAgent.name,
              salesAgentMobile: salesAgent.mobileNumber,
              villageName: salesAgent.villageName,
              jobId: newOrder._id.toString()
            });

            console.log(`📄 Print request sent to ${printersRoom.size} printer(s) for order:`, newOrder._id);

            printStatus = {
              success: true,
              message: `Print request sent to ${printersRoom.size} printing server(s)`,
              connectedPrinters: printersRoom.size
            };
          } else {
            console.log('⚠️ No printers connected for auto-print');
            printStatus = {
              success: false,
              message: 'No printing servers are connected',
              connectedPrinters: 0
            };
          }
        } else {
          console.log('⚠️ Socket.IO not available for auto-print');
          printStatus = {
            success: false,
            message: 'Socket.IO not available',
            connectedPrinters: 0
          };
        }
      } catch (printError) {
        console.error('❌ Error in auto-print:', printError);
        printStatus = {
          success: false,
          message: 'Error sending print request',
          error: printError.message
        };
      }
    }

    // Add print status to response if auto-print was attempted
    if (printStatus) {
      responseData.printStatus = printStatus;
    }

    res.status(200).json(responseData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error placing order' });
  }
});

router.get('/all', async (req, res) => {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get status filter from query
    const statusFilter = req.query.status;

    // Build query filter
    let queryFilter = {};
    if (statusFilter) {
      queryFilter.status = { $regex: statusFilter, $options: 'i' }; // Case-insensitive search
    }

    // Get total count for pagination info (with filter applied)
    const totalOrders = await Order.countDocuments(queryFilter);

    // Fetch orders with pagination and filtering
    const rawOrders = await Order.find(queryFilter)
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit);

    // Get unique user IDs from orders
    const userIds = [...new Set(rawOrders.map(order => order.userId?.toString()))];

    // Fetch sales agents for these user IDs
    const agents = await SalesAgent.find({ _id: { $in: userIds } }).lean();

    // Create agent map for quick lookup
    const agentMap = new Map(agents.map(agent => [agent._id.toString(), agent]));
    console.log(agentMap)

    // Extract valid village IDs from agents
    const validVillageIds = agents
      .map(agent => agent.village?.toString())
      .filter(id => id && mongoose.Types.ObjectId.isValid(id));

    // Fetch village details
    const villages = await Village.find({ _id: { $in: validVillageIds } }).lean();
    const villageMap = new Map(villages.map(v => [v._id.toString(), v.name]));

    // Fetch route setups that contain any of our village IDs
    const routeSetups = await RouteSetup.find({
      'villages.villageId': {
        $in: validVillageIds.map(id => new mongoose.Types.ObjectId(id))
      }
    }).lean();

    // Create village to route mapping
    const villageToRouteMap = new Map();
    for (const setup of routeSetups) {
      const routeId = setup.routeId?.toString();
      if (routeId && setup.villages && Array.isArray(setup.villages)) {
        for (const village of setup.villages) {
          const villageId = village.villageId?.toString();
          if (villageId) {
            villageToRouteMap.set(villageId, routeId);
          }
        }
      }
    }

    // Get unique route IDs
    const routeIds = [...new Set([...villageToRouteMap.values()].filter(Boolean))];

    // Fetch route details
    const routes = await Route.find({ _id: { $in: routeIds } }).lean();
    const routeMap = new Map(routes.map(route => [route._id.toString(), route.name]));

    // Process orders with all details
    const ordersWithDetails = rawOrders.map(order => {
      // Calculate cart total
      const cartTotal = order.orders.reduce(
        (sum, item) => sum + (item.attributes?.total || 0),
        0
      );

      // Get agent details
      const agent = agentMap.get(order.userId?.toString());
      const villageId = agent?.village?.toString();
      const villageName = villageMap.get(villageId) || 'Unknown';

      // Get route details
      const routeId = villageToRouteMap.get(villageId);
      const routeName = routeMap.get(routeId) || 'Unknown';

      // Debug logging for troubleshooting
      if (routeName === 'Unknown') {
        console.warn(`⚠️ Route lookup failed:`, {
          orderId: order._id.toString(),
          userId: order.userId?.toString(),
          agentFound: !!agent,
          villageId: villageId,
          villageName: villageName,
          routeId: routeId,
          routeFound: routeId ? routeMap.has(routeId) : false
        });
      }

      return {
        ...order._doc,
        cartTotal,
        salesAgentName: agent?.name || 'Unknown',
        salesAgentMobile: agent?.mobileNumber || 'N/A',
        villageName,
        routeName,
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalOrders / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    res.status(200).json({
      message: statusFilter ? `${statusFilter} orders fetched successfully` : 'All orders fetched successfully',
      orders: ordersWithDetails,
      pagination: {
        currentPage: page,
        totalPages,
        totalOrders,
        limit,
        hasNextPage,
        hasPreviousPage,
        startIndex: skip + 1,
        endIndex: Math.min(skip + limit, totalOrders)
      }
    });
  } catch (error) {
    console.error('❌ Error in /all route:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

router.get('/cancelled', async (req, res) => {
  try {
    const cancelledOrders = await Order.find({ status: 'cancelled' }).sort({ orderDate: -1 });

    if (!cancelledOrders.length) {
      return res.status(200).json({ cancelledOrders: [] });
    }

    const enrichedOrders = await Promise.all(
      cancelledOrders.map(async (order) => {
        const salesAgent = await SalesAgent.findById(order.userId);

        return {
          _id: order._id,
          status: order.status,
          orderDate: order.orderDate,
          itemCount: order.orders.length,
          salesAgentName: salesAgent?.name || '',
          villageName: salesAgent?.villageName || '',
          mobileNumber: salesAgent?.mobileNumber || ''
        };
      })
    );

    res.status(200).json({ cancelledOrders: enrichedOrders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching cancelled orders' });
  }
});

router.get('/pending', async (req, res) => {
  try {
    const pendingOrders = await Order.find({ status: 'pending' }).sort({ orderDate: -1 });

    if (!pendingOrders.length) {
      return res.status(200).json({ pendingOrders: [] });
    }

    const enrichedOrders = await Promise.all(
      pendingOrders.map(async (order) => {
        const salesAgent = await SalesAgent.findById(order.userId);

        return {
          _id: order._id,
          status: order.status,
          orderDate: order.orderDate,
          itemCount: order.orders.length,
          salesAgentName: salesAgent?.name || '',
          villageName: salesAgent?.villageName || '',
          mobileNumber: salesAgent?.mobileNumber || ''
        };
      })
    );

    res.status(200).json({ pendingOrders: enrichedOrders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching pending orders' });
  }
});


// backend route: GET /api/orders/:id

router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----------------------------------------------->>> orderId for admin 

router.get('/printer/:orderId', async (req, res) => {

  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get agent info
    const agent = await SalesAgent.findById(order.userId).lean();
    const villageId = agent?.village?.toString();

    // Get village name
    const village = villageId && mongoose.Types.ObjectId.isValid(villageId)
      ? await Village.findById(villageId).lean()
      : null;

    // Find route setup that includes the village
    const routeSetup = villageId
      ? await RouteSetup.findOne({ 'villages.villageId': new mongoose.Types.ObjectId(villageId) }).lean()
      : null;

    const routeId = routeSetup?.routeId?.toString();
    const route = routeId ? await Route.findById(routeId).lean() : null;

    // Calculate cart total
    const cartTotal = order.orders.reduce(
      (sum, item) => sum + (item.attributes?.total || 0),
      0
    );

    // Build response
    const orderWithDetails = {
      ...order._doc,
      cartTotal,
      salesAgentName: agent?.name || 'Unknown',
      salesAgentMobile: agent?.mobileNumber || 'N/A',
      villageName: village?.name || 'Unknown',
      routeName: route?.name || 'Unknown',
    };

    res.status(200).json({
      message: 'Order fetched successfully',
      order: orderWithDetails,
    });
  } catch (error) {
    console.error('❌ Error fetching specific order:', error);
    res.status(500).json({ message: 'Error fetching the order' });
  }
});

// Bulk confirm orders - NEW ROUTE
router.patch('/confirm-bulk', async (req, res) => {
  try {
    const { orderIds } = req.body;

    // Validate orderIds
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: 'Order IDs array is required and must not be empty' });
    }

    // Find orders first to check if they exist and are pending
    const existingOrders = await Order.find({
      _id: { $in: orderIds },
      status: 'pending'
    });

    if (existingOrders.length === 0) {
      return res.status(404).json({ message: 'No pending orders found with the provided IDs' });
    }

    // Update all found orders to confirmed status
    const updateResult = await Order.updateMany(
      {
        _id: { $in: existingOrders.map(order => order._id) },
        status: 'pending'
      },
      {
        status: 'confirmed',
        confirmedAt: new Date() // Optional: add confirmation timestamp
      },
      {
        runValidators: true
      }
    );

    // Get the updated orders to return in response
    const updatedOrders = await Order.find({
      _id: { $in: existingOrders.map(order => order._id) }
    });

    res.status(200).json({
      message: `${updateResult.modifiedCount} order(s) confirmed successfully`,
      confirmedCount: updateResult.modifiedCount,
      totalRequested: orderIds.length,
      orders: updatedOrders
    });

  } catch (error) {
    console.error('Error confirming bulk orders:', error);
    res.status(500).json({ message: 'Error confirming orders' });
  }
});

// Bulk mark orders as out for delivery
router.patch('/out-for-delivery-bulk', async (req, res) => {
  try {
    const { orderIds } = req.body;

    // Validate orderIds
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        message: 'Order IDs array is required and must not be empty'
      });
    }

    // Find orders first to check if they exist and are confirmed
    const existingOrders = await Order.find({
      _id: { $in: orderIds },
      status: 'confirmed'
    });

    if (existingOrders.length === 0) {
      return res.status(404).json({
        message: 'No confirmed orders found with the provided IDs'
      });
    }

    // Update all found orders to out for delivery status
    const updateResult = await Order.updateMany(
      {
        _id: { $in: existingOrders.map(order => order._id) },
        status: 'confirmed'
      },
      {
        status: 'out for delivery',
        outForDeliveryAt: new Date() // Optional: add timestamp
      },
      {
        runValidators: true
      }
    );

    // Get the updated orders to return in response
    const updatedOrders = await Order.find({
      _id: { $in: existingOrders.map(order => order._id) }
    });

    res.status(200).json({
      message: `${updateResult.modifiedCount} order(s) marked as out for delivery successfully`,
      outForDeliveryCount: updateResult.modifiedCount,
      totalRequested: orderIds.length,
      orders: updatedOrders
    });

  } catch (error) {
    console.error('Error marking bulk orders as out for delivery:', error);
    res.status(500).json({ message: 'Error marking orders as out for delivery' });
  }
});

// Bulk cancel orders route
router.patch('/cancel-bulk', async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        message: 'Order IDs array is required and must not be empty'
      });
    }

    const existingOrders = await Order.find({
      _id: { $in: orderIds },
      status: { $in: ['pending', 'confirmed', 'out for delivery'] }
    });

    if (existingOrders.length === 0) {
      return res.status(404).json({
        message: 'No cancellable orders found with the provided IDs'
      });
    }

    const updateResult = await Order.updateMany(
      {
        _id: { $in: existingOrders.map(order => order._id) },
        status: { $in: ['pending', 'confirmed', 'out for delivery'] }
      },
      {
        $set: {
          status: 'cancelled',
          cancellationDate: new Date() // ✅ store timestamp of cancellation
        }
      },
      {
        runValidators: true
      }
    );

    const updatedOrders = await Order.find({
      _id: { $in: existingOrders.map(order => order._id) }
    });

    res.status(200).json({
      message: `${updateResult.modifiedCount} order(s) cancelled successfully`,
      cancelledCount: updateResult.modifiedCount,
      totalRequested: orderIds.length,
      orders: updatedOrders
    });

  } catch (error) {
    console.error('Error cancelling bulk orders:', error);
    res.status(500).json({ message: 'Error cancelling orders' });
  }
});

router.patch('/delivered-bulk', async (req, res) => {
  try {
    const { orderIds } = req.body;

    // Validate orderIds
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        message: 'Order IDs array is required and must not be empty'
      });
    }

    // Find orders first to check if they exist and can be marked as delivered
    const existingOrders = await Order.find({
      _id: { $in: orderIds },
      status: 'out for delivery' // Only allow out for delivery orders to be marked as delivered
    });

    if (existingOrders.length === 0) {
      return res.status(404).json({
        message: 'No out for delivery orders found with the provided IDs'
      });
    }

    // Update all found orders to delivered status
    const updateResult = await Order.updateMany(
      {
        _id: { $in: existingOrders.map(order => order._id) },
        status: 'out for delivery'
      },
      {
        status: 'delivered',
        deliveredAt: new Date() // Optional: add timestamp
      },
      {
        runValidators: true
      }
    );

    // Get the updated orders to return in response
    const updatedOrders = await Order.find({
      _id: { $in: existingOrders.map(order => order._id) }
    });

    res.status(200).json({
      message: `${updateResult.modifiedCount} order(s) marked as delivered successfully`,
      deliveredCount: updateResult.modifiedCount,
      totalRequested: orderIds.length,
      orders: updatedOrders
    });

  } catch (error) {
    console.error('Error marking bulk orders as delivered:', error);
    res.status(500).json({ message: 'Error marking orders as delivered' });
  }
});

router.patch('/returned-bulk', async (req, res) => {
  try {
    const { orderIds } = req.body;

    // Validate orderIds
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        message: 'Order IDs array is required and must not be empty'
      });
    }

    // Find orders first to check if they exist and can be marked as returned
    const existingOrders = await Order.find({
      _id: { $in: orderIds },
      status: 'delivered' // Only allow delivered orders to be marked as returned
    });

    if (existingOrders.length === 0) {
      return res.status(404).json({
        message: 'No delivered orders found with the provided IDs'
      });
    }

    // Update all found orders to returned status
    const updateResult = await Order.updateMany(
      {
        _id: { $in: existingOrders.map(order => order._id) },
        status: 'delivered'
      },
      {
        status: 'returned',
        returnedAt: new Date() // Optional: add timestamp
      },
      {
        runValidators: true
      }
    );

    // Get the updated orders to return in response
    const updatedOrders = await Order.find({
      _id: { $in: existingOrders.map(order => order._id) }
    });

    res.status(200).json({
      message: `${updateResult.modifiedCount} order(s) marked as returned successfully`,
      returnedCount: updateResult.modifiedCount,
      totalRequested: orderIds.length,
      orders: updatedOrders
    });

  } catch (error) {
    console.error('Error marking bulk orders as returned:', error);
    res.status(500).json({ message: 'Error marking orders as returned' });
  }
});

// ----------------------------------------------->>> for android 

router.post('/orderId', verifyToken, async (req, res) => {

  try {

    const { orderId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get agent info
    const agent = await SalesAgent.findById(order.userId).lean();
    const villageId = agent?.village?.toString();

    // Get village name
    const village = villageId && mongoose.Types.ObjectId.isValid(villageId)
      ? await Village.findById(villageId).lean()
      : null;

    // Find route setup that includes the village
    const routeSetup = villageId
      ? await RouteSetup.findOne({ 'villages.villageId': new mongoose.Types.ObjectId(villageId) }).lean()
      : null;

    const routeId = routeSetup?.routeId?.toString();
    const route = routeId ? await Route.findById(routeId).lean() : null;

    // Calculate cart total
    const cartTotal = order.orders.reduce(
      (sum, item) => sum + (item.attributes?.total || 0),
      0
    );

    // Build response
    const orderWithDetails = {
      ...order._doc,
      cartTotal,
      salesAgentName: agent?.name || 'Unknown',
      salesAgentMobile: agent?.mobileNumber || 'N/A',
      villageName: village?.name || 'Unknown',
      routeName: route?.name || 'Unknown',
    };

    res.status(200).json({
      message: 'Order fetched successfully',
      order: orderWithDetails,
    });
  } catch (error) {
    console.error('❌ Error fetching specific order:', error);
    res.status(500).json({ message: 'Error fetching the order' });
  }
});

router.post('/orderId/cancel', verifyToken, async (req, res) => {

  try {


    const userId = req.userId; // Extracted from the token
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    // Find the order for this user
    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found for this user' });
    }

    // Only allow cancellation if status is 'pending'
    if (order.status !== 'pending') {
      return res.status(400).json({ message: "You can't cancel this order" });
    }

    // Update the status to 'cancelled'
    order.status = 'cancelled';
    await order.save();

    res.status(200).json({ message: 'Order cancelled successfully', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error cancelling order' });
  }
});

router.post('/cancelled', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const cancelledOrders = await Order.find({ userId, status: 'cancelled' })
      .sort({ cancellationDate: -1 }); // ✅ sort by cancellation timestamp

    if (!cancelledOrders.length) {
      return res.status(200).json({ cancelledOrders: [] });
    }

    const filteredOrders = cancelledOrders.map(order => ({
      _id: order._id,
      status: order.status,
      orderDate: order.orderDate,
      cancellationDate: order.cancellationDate, // ✅ include in response
      itemCount: order.orders.length
    }));

    res.status(200).json({ cancelledOrders: filteredOrders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching cancelled orders' });
  }
});

router.post('/active', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const activeStatuses = ['pending', 'confirmed', 'out for delivery'];

    const activeOrders = await Order.find({ userId, status: { $in: activeStatuses } })
      .sort({ orderDate: -1 }); // -1 for descending order (most recent first)

    if (!activeOrders.length) {
      return res.status(200).json({ activeOrders: [] });
    }

    const filteredOrders = activeOrders.map(order => ({
      _id: order._id,
      status: order.status,
      orderDate: order.orderDate,
      itemCount: order.orders.length
    }));

    res.status(200).json({ activeOrders: filteredOrders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching active orders' });
  }
});

router.post('/delivered', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const deliveredOrders = await Order.find({ userId, status: 'delivered' })
      .sort({ orderDate: -1 }); // -1 for descending order (most recent first)

    if (!deliveredOrders.length) {
      return res.status(200).json({ deliveredOrders: [] });
    }

    const filteredOrders = deliveredOrders.map(order => ({
      _id: order._id,
      status: order.status,
      orderDate: order.orderDate,
      itemCount: order.orders.length
    }));

    res.status(200).json({ deliveredOrders: filteredOrders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching delivered orders' });
  }
});

module.exports = router;