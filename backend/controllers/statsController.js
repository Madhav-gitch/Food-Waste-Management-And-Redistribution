const Food = require('../models/Food');
const User = require('../models/User');

// @route   GET /api/stats
const getGlobalStats = async (req, res) => {
  try {
    const allDonatedCount = await Food.countDocuments({ donated: true });
    
    // Sum global quantities for donated items
    const donatedFoods = await Food.find({ donated: true });
    let totalFoodSaved = 0;
    donatedFoods.forEach(f => {
      totalFoodSaved += f.quantity;
    });

    const mealsProvided = totalFoodSaved * 2; // approximation
    const co2Reduced = (totalFoodSaved * 2.5) / 1000; // approximation (tons)

    const restaurantCount = await User.countDocuments({ role: 'Restaurant' });
    const ngoCount = await User.countDocuments({ role: 'NGO' });

    res.status(200).json({
      success: true,
      data: {
        totalFoodSaved,
        mealsProvided,
        co2Reduced: co2Reduced.toFixed(1),
        activePartners: restaurantCount + ngoCount,
        restaurantCount,
        ngoCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getGlobalStats };
