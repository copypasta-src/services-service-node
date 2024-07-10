// ! These take routes and execute functions based on the route

const express = require('express');
const githubController = require('../../controllers/git/githubController.js');

const router = express.Router();

router.get('/',  (req, res) => {
    res.status(200).send('Hello from GH route');
});

router.get('/auth', githubController.auth);

router.get('/auth/callback', githubController.authCallback);

router.get('/create', githubController.initializeServiceRepository);

router.get('/confirm-repo-name-available', githubController.confirmRepoNameAvailable);

module.exports = router;