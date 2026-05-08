const express = require('express');
const router = express.Router();
const { addFood, getFoods, getAvailableFoods, getIncomingFoods, acceptFood, donateFood, deleteFood, receiveFood } = require('../controllers/foodController');

router.post('/add', addFood);
router.get('/', getFoods);
router.get('/available', getAvailableFoods);
router.get('/incoming', getIncomingFoods);
router.put('/:id/accept', acceptFood);
router.put('/:id/donate', donateFood);
router.put('/:id/receive', receiveFood);
router.delete('/:id', deleteFood);

module.exports = router;
