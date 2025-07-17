require('dotenv').config();
require('./utils/cronJob')
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const connectToDb = require('./database/db');
const verifyToken = require('./middleware/authMiddleware')

// Import routes
const AdminauthRoutes = require('./routes/AdminAuth');
const categoryRoutes = require('./routes/categoryRoutes');
const subCategoryRoutes = require('./routes/subCategoryRoutes');
const attributeRoutes = require("./routes/attributeRoutes");
const productRoutes = require('./routes/product');
const bannerRoutes = require('./routes/bannerRoutes');
const villageRoutes = require('./routes/village');
const salesAgentRoutes = require('./routes/salesAgentRoute');
const routeRoutes = require('./routes/route');
const routeSetupRoutes = require('./routes/routeSetupRputes');
const combineRoutes = require('./routes/combineRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/Order');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with proper CORS configuration
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://janta-admin-panel.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['polling', 'websocket']
});

// Connect to database
connectToDb();

app.set('trust proxy', 1);

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://e-commerce-admin-panel-eight-sigma.vercel.app"
  ],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// Store print job responses temporarily
const printJobResponses = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('📱 Client connected:', socket.id);

  // Handle printer registration
  socket.on('register-printer', (printerInfo) => {
    socket.join('printers');
    console.log('🖨️ Printer registered:', socket.id, printerInfo);
    socket.printerInfo = printerInfo;
    
    // Notify about successful registration
    socket.emit('registration-confirmed', {
      success: true,
      message: 'Printer registered successfully',
      timestamp: new Date().toISOString()
    });
  });

  // Handle print job responses from printer
  socket.on('print-success', (data) => {
    console.log('✅ Print successful for order:', data.orderId);
    printJobResponses.set(data.orderId, {
      success: true,
      data: data,
      timestamp: new Date()
    });
  });

  socket.on('print-error', (data) => {
    console.error('❌ Print failed for order:', data.orderId, 'Error:', data.error);
    printJobResponses.set(data.orderId, {
      success: false,
      error: data.error,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('📱 Client disconnected:', socket.id, 'Reason:', reason);
  });

  socket.on('error', (error) => {
    console.error('🔴 Socket error:', error);
  });
});

// Make io available to routes
app.set('io', io);

// Define routes
app.use('/auth/admin', AdminauthRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subCategoryRoutes);
app.use("/api/attributes", attributeRoutes);
app.use('/api/products', productRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/villages", villageRoutes);
app.use("/api/salesAgents", salesAgentRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/routesSetup", routeSetupRoutes);
app.use("/api/c/b/d", combineRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Print routes
app.post('/api/print/send-to-print',verifyToken, async (req, res) => {
  try {
    const requestData = req.body;
   
    // Extract data from the place order response structure
    const order = requestData.order;
    const salesAgentName = requestData.salesAgentName;
    const salesAgentMobile = requestData.salesAgentMobile;
    const villageName = requestData.villageName;

    // Validate required data
    if (!order || !order.orders || !Array.isArray(order.orders)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order data. Order and orders array are required.'
      });
    }

    if (!salesAgentName || !salesAgentMobile || !villageName) {
      return res.status(400).json({
        success: false,
        message: 'Sales agent information is required (salesAgentName, salesAgentMobile, villageName).'
      });
    }

    // Check if any printers are connected
    const printersRoom = io.sockets.adapter.rooms.get('printers');
    if (!printersRoom || printersRoom.size === 0) {
      return res.status(503).json({
        success: false,
        message: 'No printing servers are connected. Please ensure local printer is running.'
      });
    }

    // Send print job to all connected printers
    io.to('printers').emit('print-order', {
      order,
      salesAgentName,
      salesAgentMobile,
      villageName,
      jobId: order._id || Date.now().toString()
    });

    console.log(`📄 Print request sent to ${printersRoom.size} printer(s) for order:`, order._id);

    res.status(200).json({
      success: true,
      message: `Print request sent to ${printersRoom.size} printing server(s) successfully`,
      orderId: order._id,
      status: requestData.status,
      connectedPrinters: printersRoom.size
    });

  } catch (error) {
    console.error('❌ Error sending print request:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending print request',
      error: error.message
    });
  }
});



// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server using http server instead of app.listen
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🔗 Socket.IO server is ready for connections`);
});

module.exports = { app, server, io };