// ! These take routes and execute functions based on the route

const express = require('express');
const masterController = require('../controllers/masterController.js');

const router = express.Router();

router.get('/',  (req, res) => {
    console.log('Hello from MasterController route');
    res.status(200).send('Hello from MasterController route');
});

router.get('/create', masterController.createMicroservice);

module.exports = router;