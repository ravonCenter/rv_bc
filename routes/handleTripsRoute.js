const express = require('express');
const router = express.Router();
const tripsController = require("../controllers/handleTripsController");

// GET all trips
router.get('/', tripsController.handleGetTrips)
    // POST new trip
    .post('/', tripsController.handlePostTripsController)
    // DELETE trip by ID
    .delete('/:id', tripsController.handleDeleteTrip);

module.exports = router;