const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Note: In a real project, use process.env.MONGO_URI
    // For this local prototype, we will connect to a local MongoDB instance.
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food_waste', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
