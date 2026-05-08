const express = require('express');
const router = express.Router();
const { createRequest, getPendingRequests, fulfillRequest, getNgoHistory } = require('../controllers/requestController');

router.post('/add', createRequest);
router.get('/restaurant/:restId', getPendingRequests);
router.get('/ngo/:ngoId', getNgoHistory);
router.put('/fulfill/:id', fulfillRequest);

module.exports = router;
