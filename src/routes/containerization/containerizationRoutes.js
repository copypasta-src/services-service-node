const express = require('express');
const dockerController = require('../../controllers/containerization/dockerController.js');

const router = express.Router();

router.get('/',  (req, res) => {
    res.status(200).send('Hello from containerzation routes');
});

router.get('/docker', (req, res) => {
    dockerController.createDockerfile(req, res, null);
});

module.exports = router;