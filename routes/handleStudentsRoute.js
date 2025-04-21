const express = require('express');
const router = express.Router();
const handlePostController = require("../controllers/handleStudentsController");

router.get('/', handlePostController.handleStudentController)
     .post('/', handlePostController.handlePostStudentsController)
     .delete('/:id', handlePostController.handleDeleteStudentReq);  // Changed to include :id parameter

module.exports = router;