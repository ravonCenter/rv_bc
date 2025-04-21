const express = require('express');
const router = express.Router();
const handlePostController=require("../controllers/handleNewsController")

router.get('/',handlePostController.handleGetNewsController)
    .post('/',handlePostController.handlePostNewsController)
    .delete('/:id',handlePostController.handleDeleteNewsController)
    

module.exports = router;