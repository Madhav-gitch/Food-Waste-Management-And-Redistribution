const FoodRequest = require('../models/FoodRequest');
const User = require('../models/User');
const Food = require('../models/Food');

// Utility to mock coordinates from location strings as done in foodController
async function geocode(locStr) {
    if (!locStr) return {lat:0, lon:0};
    if (locStr.includes(',')) {
        const parts = locStr.split(',');
        return {lat: parseFloat(parts[0]), lon: parseFloat(parts[1])};
    }
    return {lat: 37.77 + (Math.random()*0.1), lon: -122.41 + (Math.random()*0.1)};
}

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

// @route   POST /api/requests/add
const createRequest = async (req, res) => {
    try {
        const { ngoId, foodType, quantityNeeded, unit, urgencyLevel } = req.body;
        
        const ngo = await User.findById(ngoId);
        if (!ngo) return res.status(404).json({ success: false, error: 'NGO not found' });
        
        let ngoLoc = await geocode(ngo.location);
        
        // Find ALL Restaurants
        const restaurants = await User.find({ role: 'Restaurant' });
        
        let notifiedRestIds = [];
        
        // AI Filter Logic: By Distance
        for (const rest of restaurants) {
            let rLoc = await geocode(rest.location);
            let dist = getDistanceKM(ngoLoc.lat, ngoLoc.lon, rLoc.lat, rLoc.lon);
            // Cap at 20km for notification
            if (dist < 20) {
                notifiedRestIds.push(rest._id);
            }
        }

        const newReq = new FoodRequest({
            ngoId, foodType, quantityNeeded, unit: unit || 'kg', urgencyLevel,
            notifiedRestaurants: notifiedRestIds
        });
        
        await newReq.save();
        res.status(201).json({ success: true, data: newReq });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @route   GET /api/requests/restaurant/:restId
// Fetch requests where the restaurant is in the notified filter
const getPendingRequests = async (req, res) => {
    try {
        const { restId } = req.params;
        const requests = await FoodRequest.find({ 
            notifiedRestaurants: restId, 
            status: 'Active' 
        }).populate('ngoId', 'name location contactDetails').sort({ createdAt: -1 });
        
        res.status(200).json({ success: true, data: requests });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @route   GET /api/requests/ngo/:ngoId
const getNgoHistory = async (req, res) => {
    try {
        const { ngoId } = req.params;
        const requests = await FoodRequest.find({ ngoId })
            .populate('fulfilledById', 'name')
            .sort({ createdAt: -1 });
        
        res.status(200).json({ success: true, data: requests });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// @route   PUT /api/requests/fulfill/:id
const fulfillRequest = async (req, res) => {
    try {
        const { restId } = req.body;
        const request = await FoodRequest.findById(req.params.id);
        
        if (!request) return res.status(404).json({ success: false, error: 'Request not found' });
        if (request.status !== 'Active') return res.status(400).json({ success: false, error: 'Request already fulfilled' });
        
        request.status = 'Fulfilled';
        request.fulfilledById = restId;
        await request.save();
        
        // Auto-generate the actual Food payload routing implicitly from the fulfilling restaurant to the requesting NGO!
        const newFood = new Food({
            name: `${request.foodType} (On Demand Fulfillment)`,
            quantity: request.quantityNeeded,
            unit: request.unit,
            days: 1,
            storage: 'Room',
            status: 'Fresh',
            deliveryStatus: 'EnRoute',
            donorId: restId,
            ngoId: request.ngoId,
            donated: true,
            autoAssigned: true,
            priorityScore: 100 // High priority since it was specifically demanded
        });
        await newFood.save();

        res.status(200).json({ success: true, data: request, generatedFood: newFood });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { createRequest, getPendingRequests, getNgoHistory, fulfillRequest };
