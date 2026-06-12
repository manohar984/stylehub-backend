const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/StyleHubDB');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Seed default admin if it doesn't exist
    await seedDefaultAdmin();
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const seedDefaultAdmin = async () => {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await Admin.findOne({ username: 'admin' });
    
    if (!admin) {
      console.log('Admin user "admin" not found. Seeding default admin...');
      const defaultAdmin = new Admin({
        username: 'admin',
        password: hashedPassword
      });
      await defaultAdmin.save();
      console.log('Default admin created successfully! (Username: admin, Password: admin123)');
    } else {
      // Force update the password to admin123 to guarantee login access
      admin.password = hashedPassword;
      await admin.save();
      console.log('Admin user "admin" password verified/reset to "admin123".');
    }
  } catch (error) {
    console.error(`Admin Seeding Error: ${error.message}`);
  }
};

module.exports = connectDB;
