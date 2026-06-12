const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');

// Connect to MongoDB
connectDB();

const app = express();

// CORS Configuration - Enable frontend access from any local port
// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow requests with no origin (like curl, mobile, or postman)
//     if (!origin) return callback(null, true);
    
//     // Allow localhost on any port
//     if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
//       return callback(null, true);
//     }
    
//     return callback(new Error('Not allowed by CORS'));
//   },
//   credentials: true
// }));
app.use(cors("https://stylehub-frontend-chi.vercel.app/"));
// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static images in uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);

// Root Route (Welcome/API status)
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to StyleHub Enterprise Product Management System API' });
});

// Global Error Handler (e.g., for Multer size validation or unhandled middleware errors)
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  
  // If headers are already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected server error occurred'
  });
});

const PORT = process.env.PORT || 5000;

// Listen on configured port 5001 (updated to avoid conflicts)
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
