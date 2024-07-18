const express = require('express');
const cicdController = require('../../controllers/cicd/cicdController.js');

const router = express.Router();

router.get('/',  (req, res) => {
    res.status(200).send('Hello from cicd routes');
});

router.get('/github-actions', (req, res) => {
    cicdController.createGithubActionsWorkflow(req, res, null);
});

module.exports = router;