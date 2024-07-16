const { config } = require('dotenv');

githubController = require('../controllers/git/githubController.js');
ecrAppRunnerController = require('../controllers/deployment/ecrAppRunnerController.js');
expressJSController = require('../controllers/framework/expressJSController.js');
require('dotenv').config();
exports.createMicroservice = async (req, res) =>  {

    try {
    const configuration = req.body.configuration;
    console.log(configuration)
    exampleConfiguration = {
        meta : {
            name : 'Display Name',
            description : 'Description',
            projectName : 'formatted-project-name', // This is the repo name
            // TODO add more here
        },
        framework: { // required
            framework: 'express',
            template: 'template-name'
        },
        database : {

        }, 
        git : { // required
            gitProvider : 'github', 
            organizationName : "",
            token : ""
        },
        cicd: { // optional
            cicdProvider : 'githubActions' 
        },
        containerization : { // optional
            containerizationProvider : 'docker', 
            port : ''

        },
        deployment : { // optional
            deploymentProvider : 'aws',
            deploymentProviderConfiguration : {
                // This is all just provider specific stuff. Examples for AWS shown.
                deploymentModule : 'AppRunner',
                deploymentContainerRepositorty : 'ECR',
                autoDeploy : true,
            }
            
        }
    }

    // Basically just cycle through a bunch of conditionals to determine what kind of microservice to create
    // This is going to force you to name the functions the same thing in each controller
    gitController = null;
    frameworkController = null;
    containerizationController = null;

    if (configuration.git.gitProvider === 'github') {
        gitController = githubController;

        // Create a github repo
        await gitController.initializeServiceRepository(null, null, repoNameArg = configuration.meta.projectName, organizationArg = configuration.git.organizationName, tokenArg = configuration.git.token);
    }

    if (configuration.framework.framework === 'express') {
        frameworkController = expressJSController;
        // Create an express api and return the dir path
        response = await frameworkController.createExpressApi(null, null, configuration.meta.projectName);
        // extract the dir path
        repoDirectory = response.data.newProjectPath
        // commit the dir to the repo on a new branch
        await gitController.createBranchAndCommitDirectories(req = null, res = null , 'development', repoDirectory, configuration.meta.projectName , configuration.git.organizationName, configuration.git.token)
    }
    if (configuration.containerization) {
    if (configuration.containerization.containerizationProvider === 'docker') {
        // containerization controller = dockerController
        // Create a dockerfile
        // Create a .dockerignore file
        // commit the files to the development branch
    }}
    if (configuration.cicd) {
    if (configurations.cicd.cicdProvider === 'githubActions') {
        // Create a github actions workflow file
        // commit the file to the development branch
    }}
    if (configuration.deployment) {
    if (configurations.deployment.deploymentProvider === 'aws') {
        // work through the deployment provider configuration
        if (configurations.deployment.deploymentProviderConfiguration.deploymentModule === 'AppRunner') {
            if (containerizationController != null) {
                // this means that its appRunner + ecr 
                // create role 
                // create user
                // create ecr repo
                // create appRunner service
            } else {
                // this means that its appRunner using source code repository instead of contaner image
            }
        }
    } else if (configurations.deployment.deploymentProvider === 'google'){

    } else if (configurations.deployment.deploymentProvider === 'azure'){

    } }

    res.status(200).send({
        message: 'Microservice created successfully',
    });

} catch (error) {
    console.error(error);
    res.status(500).send('Error creating microservice');
}


}
       
