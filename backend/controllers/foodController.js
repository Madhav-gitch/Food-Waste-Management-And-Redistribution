const Food = require('../models/Food');
const User = require('../models/User');
const axios = require('axios');

function getDistanceKM(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 5;
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function geocode(locStr) {
    if (!locStr) return {lat:0, lon:0};
    if (locStr.includes(',')) {
        const parts = locStr.split(',');
        return {lat: parseFloat(parts[0]), lon: parseFloat(parts[1])};
    }
    return {lat: 37.77 + (Math.random()*0.1), lon: -122.41 + (Math.random()*0.1)};
}

// Fetch ML Prediction
const fetchPrediction = async (foodData) => {
  try {
    const response = await axios.post('http://127.0.0.1:5001/predict', foodData);
    return response.data.status || 'Expiring';
  } catch (error) {
    console.error('ML API Error:', error.message);
    return 'Expiring'; // Default fallback
  }
};

// @route   POST /api/food/add
const addFood = async (req, res) => {
  try {
    const { name, quantity, unit, days, storage, donorId, hoursValid } = req.body;

    const status = await fetchPrediction({ quantity, days, storage });

    let expiresAt = null;
    if (hoursValid) {
       expiresAt = new Date(Date.now() + (Number(hoursValid) * 60 * 60 * 1000));
    }

    // AI Prioritization & Auto-Assignment matching engine
    let basePriority = 10;
    if (status === 'Expiring') basePriority += 50;
    if (storage === 'Room') basePriority += 20;

    const ngos = await User.find({ role: 'NGO' });
    let bestNgo = null;
    let highestScore = -9999;
    
    // Evaluate donor location
    const donor = await User.findById(donorId);
    let donorCoords = donor ? await geocode(donor.location) : {lat:0, lon:0};

    if (ngos.length > 0) {
        for (const ngo of ngos) {
            let ngoCoords = await geocode(ngo.location);
            let dist = getDistanceKM(donorCoords.lat, donorCoords.lon, ngoCoords.lat, ngoCoords.lon);
            let score = basePriority - dist; // Closer yields better score
            
            if (score > highestScore) {
                highestScore = score;
                bestNgo = ngo;
            }
        }
    }

    const isAutoAssigned = bestNgo ? true : false;

    const newFood = new Food({
      name,
      quantity,
      unit: unit || 'kg',
      days,
      storage,
      status,
      donorId: donorId || null,
      deliveryStatus: isAutoAssigned ? 'EnRoute' : 'Available',
      expiresAt: expiresAt,
      priorityScore: highestScore > -9000 ? highestScore : basePriority,
      autoAssigned: isAutoAssigned,
      ngoId: isAutoAssigned ? bestNgo._id : null,
      donated: isAutoAssigned
    });
    
    await newFood.save();
    res.status(201).json({ success: true, data: newFood, autoAssigned: isAutoAssigned });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route   PUT /api/food/:id/donate
// Marks an item as donated from the admin dashboard or physics bin
const donateFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ success: false, error: 'Food not found' });
    if (food.donated) return res.status(400).json({ success: false, error: 'Food already donated' });

    food.donated = true;
    food.deliveryStatus = 'Completed';
    await food.save();

    res.status(200).json({ success: true, data: food });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route   GET /api/food
// For Restaurant: pass ?donorId=... to get their history.
// For Admin: pass nothing to get all.
const getFoods = async (req, res) => {
  try {
    const donorId = req.query.donorId;
    let query = {};
    if (donorId) query.donorId = donorId;
    
    // Auto-delete expired available items
    const now = new Date();
    await Food.deleteMany({
      deliveryStatus: 'Available',
      expiresAt: { $ne: null, $lt: now }
    });

    // Populate donor info for admin/others
    const foods = await Food.find(query).populate('donorId', 'name location').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: foods });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route   GET /api/food/available
// For NGO: getting available matches
const getAvailableFoods = async (req, res) => {
  try {
    const now = new Date();
    
    // Auto-delete expired available items
    await Food.deleteMany({
      deliveryStatus: 'Available',
      expiresAt: { $ne: null, $lt: now }
    });

    // Fetch all foods that are available and not expired
    const foods = await Food.find({ 
      deliveryStatus: 'Available', 
      $or: [
        { expiresAt: { $eq: null } },
        { expiresAt: { $gt: now } }
      ]
    }).populate('donorId', 'name location contactDetails');
    res.status(200).json({ success: true, data: foods });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route   GET /api/food/incoming
// For NGO: getting their claiming deliveries
const getIncomingFoods = async (req, res) => {
  try {
    const ngoId = req.query.ngoId;
    if (!ngoId) return res.status(400).json({ success: false, error: 'ngoId required' });
    
    const foods = await Food.find({ 
      deliveryStatus: { $in: ['EnRoute', 'Completed'] }, 
      ngoId 
    }).populate('donorId', 'name location contactDetails').sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: foods });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route   PUT /api/food/:id/accept
// For NGO: accept donation
const acceptFood = async (req, res) => {
  try {
    const { ngoId } = req.body;
    if (!ngoId) return res.status(400).json({ success: false, error: 'ngoId required' });

    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ success: false, error: 'Food not found' });
    if (food.deliveryStatus !== 'Available') return res.status(400).json({ success: false, error: 'Already accepted' });

    food.ngoId = ngoId;
    food.deliveryStatus = 'EnRoute';
    food.donated = true; // Mark as donated
    await food.save();

    res.status(200).json({ success: true, data: food });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route   DELETE /api/food/:id
// For Restaurant: delete a mistakenly logged item
const deleteFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ success: false, error: 'Food not found' });
    
    // Prevent deleting if it's already claimed/En Route
    if (food.deliveryStatus !== 'Available' || food.donated) {
        return res.status(400).json({ success: false, error: 'Cannot delete item that has already been accepted by an NGO.' });
    }

    await Food.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route   PUT /api/food/:id/receive
// For NGO: Marks food as physically received/Completed
const receiveFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ success: false, error: 'Food not found' });
    
    // Safety check
    if (food.deliveryStatus === 'Completed') return res.status(400).json({ success: false, error: 'Already marked as received.' });

    food.deliveryStatus = 'Completed';
    await food.save();

    res.status(200).json({ success: true, data: food });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { addFood, getFoods, getAvailableFoods, getIncomingFoods, acceptFood, donateFood, deleteFood, receiveFood };
