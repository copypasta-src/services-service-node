// ! These take routes and execute functions based on the route

const express = require('express');
const ecrAppRunnerController = require('../../controllers/deployment/ecrAppRunnerController.js');

const router = express.Router();

router.get('/',  (req, res) => {
    res.status(200).send('Hello from deployment routes');
});

// * AWS App Runner and ECR with Docker
router.get('/aws', (req, res) => {
    res.status(200).send('Hello from AWS deployment routes');
});
router.get('/aws/apprunner', ecrAppRunnerController.createAppRunnerService);

router.get('/aws/ecr_repository', ecrAppRunnerController.createEcrRepository);

router.get('/aws/iam', ecrAppRunnerController.createIamRoleForEcrAppRunnerCreation);

module.exports = router;