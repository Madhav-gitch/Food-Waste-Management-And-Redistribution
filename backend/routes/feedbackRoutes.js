const express = require('express');
const router = express.Router();
const { submitFeedback, getFeedback } = require('../controllers/feedbackController');

// @route   POST /api/feedback
// @desc    Submit new feedback
router.post('/', submitFeedback);

// @route   GET /api/feedback
// @desc    Get all feedback (for admins)
router.get('/', getFeedback);

module.exports = router;
