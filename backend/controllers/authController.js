const User = require('../models/User');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, location, contactDetails, founderName, certificate } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    const newUser = new User({
      name,
      email,
      password, // In production, we would use bcrypt to hash this!
      role,
      location,
      contactDetails,
      founderName,
      certificate
    });

    await newUser.save();
    
    // Return user without password
    res.status(201).json({ 
        success: true, 
        data: { _id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role } 
    });
  } catch (error) {
    console.error('Error during registration:', error.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found. Please create an account.' });
    }
    if (user.password !== password) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    res.status(200).json({ 
        success: true, 
        data: { _id: user._id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

module.exports = {
  register,
  login
};
