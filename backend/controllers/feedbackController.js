const Feedback = require('../models/Feedback');

// POST /api/feedback
const submitFeedback = async (req, res) => {
  try {
    const { name, email, rating, message } = req.body;

    const newFeedback = new Feedback({
      name,
      email,
      rating: Number(rating),
      message
    });

    await newFeedback.save();
    res.status(201).json({ success: true, data: newFeedback });
  } catch (error) {
    console.error('Error submitting feedback:', error.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// GET /api/feedback
const getFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

module.exports = {
  submitFeedback,
  getFeedback
};
