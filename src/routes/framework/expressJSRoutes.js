// ! These take routes and execute functions based on the route

const express = require('express');
const expressJSController = require('../../controllers/framework/expressJSController.js');

const router = express.Router();

router.get('/',  (req, res) => {
    res.status(200).send('Hello from ExpressJS route');
});

router.get('/create', (req,res) => {
    expressJSController.createExpressApi(req, res);
});

module.exports = router;