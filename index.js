const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');

require('dotenv').config();

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();

app.use(cors());
app.use(express.json());

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Database එකට සාර්ථකව Connect වුණා!');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

connectDB();

app.get('/api/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Backend API is healthy.',
    data: null,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/equipment', equipmentRoutes);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    data: null,
  });
});

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error.';

  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend Server runs on port ${PORT}`);
});