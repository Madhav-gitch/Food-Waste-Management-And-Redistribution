const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Food = require('./models/Food');

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Successfully connected to MongoDB.');

    // Clear existing data
    await User.deleteMany();
    await Food.deleteMany();
    console.log('Cleared old data.');

    // 1. Create Default Users
    console.log('Creating sample users...');
    
    const adminUser = new User({
      name: 'Global Admin',
      email: 'admin@wasteai.com',
      password: 'password123',
      role: 'Admin',
      location: 'Central Office'
    });
    
    const restaurantUser = new User({
      name: 'Luigi\'s Pizza & Pasta',
      email: 'luigi@pizza.com',
      password: 'password123',
      role: 'Restaurant',
      location: 'Downtown District',
      contactDetails: '123-456-7890'
    });

    const ngoUser = new User({
      name: 'Hope Food Bank',
      email: 'contact@hopefood.org',
      password: 'password123',
      role: 'NGO',
      location: 'Northside Community Center',
      founderName: 'Jane Smith',
      capacity: {
        coldStorageMax: 200,
        coldStorageCurrent: 50,
        dryGoodsMax: 1000,
        dryGoodsCurrent: 400
      }
    });

    await adminUser.save();
    const savedRestaurant = await restaurantUser.save();
    const savedNGO = await ngoUser.save();
    console.log('Users created successfully.');

    // 2. Create Sample Foods
    console.log('Creating sample food inventory...');
    
    const foods = [
      {
        name: 'Fresh Tomatoes',
        quantity: 15,
        unit: 'kg',
        days: 5,
        storage: 'Room',
        status: 'Fresh',
        deliveryStatus: 'Available',
        donorId: savedRestaurant._id
      },
      {
        name: 'Excess Pizza Slices',
        quantity: 40,
        unit: 'items',
        days: 1,
        storage: 'Fridge',
        status: 'Expiring',
        deliveryStatus: 'Available',
        donorId: savedRestaurant._id
      },
      {
        name: 'Pasta Noodles',
        quantity: 10,
        unit: 'kg',
        days: 30,
        storage: 'Room',
        status: 'Fresh',
        deliveryStatus: 'Available',
        donorId: savedRestaurant._id
      },
      {
        name: 'Garlic Bread',
        quantity: 25,
        unit: 'items',
        days: 2,
        storage: 'Fridge',
        status: 'Expiring',
        deliveryStatus: 'Available',
        donorId: savedRestaurant._id
      },
      {
        name: 'Spoiled Milk',
        quantity: 5,
        unit: 'L',
        days: -2,
        storage: 'Fridge',
        status: 'Waste',
        deliveryStatus: 'Available',
        donorId: savedRestaurant._id
      }
    ];

    await Food.insertMany(foods);
    console.log('Food inventory populated!');
    
    console.log('\n================================');
    console.log('DATABASE SEEDING PERFECTLY FINISHED!');
    console.log('================================\n');

    process.exit();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
