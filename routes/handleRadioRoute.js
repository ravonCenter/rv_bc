const express = require('express');
const router = express.Router();
const radioController = require('../controllers/handleRadioController');

router.get('/', radioController.handleRadioController);
router.post('/', radioController.handlePostRadioController);
router.delete('/:id', radioController.handleDeleteRadio);

module.exports = router;