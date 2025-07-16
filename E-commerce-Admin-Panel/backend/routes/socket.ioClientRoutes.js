const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const router = express.Router();

// Create HTTP server and Socket.IO server for message brokering
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Configure this for production
    methods: ["GET", "POST"]
  }
});

app.use(express.json());

// Store print job responses temporarily (you might want to use Redis in production)
const printJobResponses = new Map();

// Socket.IO connection handling for printer clients
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle printer registration
  socket.on('register-printer', (printerInfo) => {
    socket.join('printers');
    console.log('Printer registered:', socket.id, printerInfo);
    
    // Optional: Store printer info
    socket.printerInfo = printerInfo;
  });

  // Handle print job responses from printer
  socket.on('print-success', (data) => {
    console.log('Print successful for order:', data.orderId);
    printJobResponses.set(data.orderId, {
      success: true,
      data: data,
      timestamp: new Date()
    });
  });

  socket.on('print-error', (data) => {
    console.error('Print failed for order:', data.orderId, 'Error:', data.error);
    printJobResponses.set(data.orderId, {
      success: false,
      error: data.error,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// POST endpoint to send print jobs to connected printers
router.post('/send-to-print', async (req, res) => {
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

    console.log(`Print request sent to ${printersRoom.size} printer(s) for order:`, order._id);

    res.json({
      success: true,
      message: `Print request sent to ${printersRoom.size} printing server(s) successfully`,
      orderId: order._id,
      status: requestData.status,
      connectedPrinters: printersRoom.size
    });

  } catch (error) {
    console.error('Error sending print request:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending print request',
      error: error.message
    });
  }
});

// GET endpoint to check printing server connection status
router.get('/print-status', (req, res) => {
  const printersRoom = io.sockets.adapter.rooms.get('printers');
  const connectedPrinters = printersRoom ? printersRoom.size : 0;
  
  res.json({
    connectedPrinters: connectedPrinters,
    totalConnections: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});

// GET endpoint to check print job status
router.get('/print-job-status/:orderId', (req, res) => {
  const orderId = req.params.orderId;
  const jobResponse = printJobResponses.get(orderId);
  
  if (jobResponse) {
    res.json({
      orderId: orderId,
      found: true,
      ...jobResponse
    });
    
    // Clean up old responses (optional)
    if (Date.now() - jobResponse.timestamp.getTime() > 300000) { // 5 minutes
      printJobResponses.delete(orderId);
    }
  } else {
    res.json({
      orderId: orderId,
      found: false,
      message: 'Print job status not found or still processing'
    });
  }
});

// Start the message broker server
const PORT = process.env.PRINT_BROKER_PORT || 3001;
server.listen(PORT, () => {
  console.log(`Print message broker running on port ${PORT}`);
  console.log('Waiting for printer clients to connect...');
});

module.exports = router;