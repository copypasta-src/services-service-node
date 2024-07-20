// This will be the controller that creates a Dockerfile for the project and build/deploys the docker image.
const yaml = require('yamljs');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const errorHandler = require('../../middleware/errorHandler').errorHandler;
const requestResponseHandler = require('../../middleware/requestResponseHandler').requestResponseHandler;

// Dynamically import @octokit/rest
let Octokit;

exports.createDockerfile = async (req, res, configuration = null) => {
    if (!Octokit) {
        const octokitModule = await import('@octokit/rest');
        Octokit = octokitModule.Octokit;
    }
    // Pass the configuration json into the function and we will parse it from there
    if (configuration == null) {
        configuration = req.body.configuration;
    }

    const tempDir = path.join(__dirname, 'temp');

    try {
        // Initialize Octokit
        const octokit = new Octokit({
        auth: configuration.git.token
        });
        // TODO this should be dynamic from a database or use a npm hosted package
        const sourceRepoUrl = `https://github.com/${configuration.git.organizationName}/${configuration.meta.projectName}.git`;

        const git = simpleGit();
        // Step 1: Clone the source repository
        await git.clone(sourceRepoUrl, tempDir);

        const repo = simpleGit(tempDir)

        await repo.checkout('development');

        const filePath = path.join(tempDir, 'Dockerfile');

        const dockerfile = exports.writeDockerfile(configuration);
        
        fs.writeFileSync(filePath, dockerfile, 'utf8');

        // Step 5: Set the new remote repository and push
        await repo.add(filePath);
        // Step 6: Commit the changes
        await repo.commit('Created Dockerfile');
        // Step 7: Push the new branch to the remote repository
        await repo.push('origin', 'development');
        // Step 8: Cleanup the temporary directory
        fs.rmSync(tempDir, { recursive: true, force: true });

        // send response
        requestResponseHandler(req, res,{message: 'Dockerfile created successfully', status: 200});
    }
    catch (error) {
        fs.rmSync(tempDir, { recursive: true, force: true });

        errorHandler(error, req, res, null, {'message' : 'Error creating Dockerfile', status: 500});
    }
}

exports.writeDockerfile = (configuration) => {
    runtime = ''
    runCommand = ''
    cmd = ''

    if (configuration.framework.framework == 'express') {
        runtime = 'node:14'
        copy = 'package*.json ./'
        runCommand = 'npm install'
        cmd = '["npm", "start"]'
    }
    let dockerfile = 
    
    `
    FROM ${runtime}
    WORKDIR /usr/src/app
    COPY ${copy}
    RUN ${runCommand}
    COPY . .
    EXPOSE ${configuration.containerization.port ?? 8080}
    CMD ${cmd}
    `;
    return dockerfile;
}