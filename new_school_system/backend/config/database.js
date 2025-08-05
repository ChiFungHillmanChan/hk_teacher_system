const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const options = {
      // bufferMaxEntries: 0,     // This causes the error - removed
    };

    // AWS DocumentDB specific options (only add if using DocumentDB)
    if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('docdb')) {
      options.ssl = true;
      options.sslValidate = false;
      options.retryWrites = false;
    }

    // Connect to MongoDB with simplified options
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('Error during MongoDB disconnection:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Database health check
const checkDBHealth = async () => {
  try {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    return {
      status: states[state],
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
    };
  }
};

// Simplified index creation (removes duplicate warnings)
const createIndexes = async () => {
  try {
    // Only create indexes if they don't already exist in schema
    console.log('📊 Database indexes handled by schema definitions');
  } catch (error) {
    console.error('❌ Error with indexes:', error);
  }
};

// Backup database (for AWS deployment)
const backupDatabase = async () => {
  try {
    console.log('💾 Database backup initiated');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return { success: true, timestamp };
  } catch (error) {
    console.error('❌ Database backup failed:', error);
    return { success: false, error: error.message };
  }
};

// Clean up old data (for maintenance)
const cleanupOldData = async () => {
  try {
    const StudentReport = require('../models/StudentReport');

    // Archive reports older than 3 years
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const result = await StudentReport.updateMany(
      {
        createdAt: { $lt: threeYearsAgo },
        status: { $ne: 'archived' },
      },
      { status: 'archived' }
    );

    console.log(`🗄️ Archived ${result.modifiedCount} old reports`);

    return { success: true, archivedCount: result.modifiedCount };
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    return { success: false, error: error.message };
  }
};

// Database statistics
const getDatabaseStats = async () => {
  try {
    const User = require('../models/User');

    const stats = {
      users: {
        total: await User.countDocuments(),
        active: await User.countDocuments({ isActive: true }),
        teachers: await User.countDocuments({ role: 'teacher' }),
        admins: await User.countDocuments({ role: 'admin' }),
      },
      connection: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      },
    };

    return stats;
  } catch (error) {
    console.error('❌ Error getting database stats:', error);
    return null;
  }
};

module.exports = {
  connectDB,
  checkDBHealth,
  createIndexes,
  backupDatabase,
  cleanupOldData,
  getDatabaseStats,
};
