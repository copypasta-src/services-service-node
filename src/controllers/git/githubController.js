const axios = require('axios');
// const { Octokit } = require("@octokit/rest");
const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const { dir } = require('console');
require('dotenv').config();
const execSync = require('child_process').execSync;
const expressJSController = require('../framework/expressJSController');


// Dynamically import @octokit/rest
let Octokit;

exports.auth = async (req, res) => {
  try {
  if (!Octokit) {
    const octokitModule = await import('@octokit/rest');
    Octokit = octokitModule.Octokit;
  }
  const redirectUri = 'http://localhost:3000/github/auth/callback';
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=repo`;
  
  // TODO return this to the client so that the client can redirect to this
  res.status(200).redirect(githubAuthUrl)
} catch (error) {
  res.status(500).send('Error authenticating with GitHub');
}
}

exports.authCallback = async (req, res) => {
  if (!Octokit) {
    const octokitModule = await import('@octokit/rest');
    Octokit = octokitModule.Octokit;
  }

  const code = req.query.code;
  try {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code
    }, {
      headers: {
        accept: 'application/json'
      }
    });
    const accessToken = response.data.access_token;

    // TODO this should store the token in the database
    // TODO then you should return the token to the client for client side storing
    await res.status(200).send('Authentication successful! You can now make commits on behalf of the user. Remember to store the token in the database.');
    
    // Save the access token for the user, e.g., in a database
    console.log(accessToken);
    // res.send('Authentication successful! You can now make commits on behalf of the user.');
  } catch (error) {
    res.status(500).send('Error exchanging code for access token');
  }
};


exports.initializeServiceRepository = async (req, res) => {
  if (!Octokit) {
    const octokitModule = await import('@octokit/rest');
    Octokit = octokitModule.Octokit;
  }
  // GitHub user and repo details
  const repoName = req.query.repoName;
  const organization = req.query.organization;
  // TODO this will get replaced with a call to the database for the user token
  const token = process.env.GITHUB_AUTH_TOKEN;
  console.log(token, repoName);

  // Initialize Octokit
  const octokit = new Octokit({
    auth: token
  });

  // Get user details
  const { data: { login: username } } = await octokit.users.getAuthenticated();
  try {
    // Create a new repository
    await octokit.repos.createInOrg({ name: repoName, org: organization });

    // Local path to clone the repository
    const repoUrl = `https://github.com/${organization}/${repoName}.git`;
    const dirpath = path.resolve(__dirname, '..', 'temp', repoName); // Adjust path as needed
    fs.mkdirSync(dirpath, { recursive: true })
    
    const git = simpleGit();

    await git.clone(repoUrl, dirpath);

    const repo = simpleGit(dirpath);

    const mainBranch = 'main';

    await repo.checkoutLocalBranch(mainBranch);

    // Create a new file and add some content
    const mainFilePath = path.join(dirpath, 'README.md');
    // TODO need to generate a standard README.md file
    fs.writeFileSync(mainFilePath, '');
    // Stage the new file
    await repo.add(mainFilePath);
    // Commit the changes
    await repo.commit('Created main branch');
    // Push the new branch to the remote repository
    await repo.push('origin', mainBranch);

    // Create a new branch
    const branchName = 'development';
    await repo.checkoutLocalBranch(branchName);

    // TODO will need to make this a conditional based on chosed flavor of API (react, flask, etc.)
    response = await expressJSController.createExpressApi(null, null, repoName);
    console.log(response);
    repoDirectory = response['data']['newProjectPath'];
    
    // TODO generate the .pasta file for the service

    // Stage the new files
    await repo.add(path.join(repoDirectory, '*'));

    // Commit the changes
    await repo.commit('Created project');

    // Push the new branch to the remote repository
    await repo.push('origin', branchName);

    // delete temp repo
    fs.rmSync(path.join(__dirname, `../temp`), { recursive: true, force: true });

    res.status(200).send({
      'message' : 'Repository has been created successfully. All files have been pushed to the development branch.',
      'status' : 200
    });

} catch (error) {
  fs.rmSync(path.join(__dirname, `../temp`), { recursive: true, force: true });

  console.error(error);
  //   await octokit.rest.repos.delete({
  //     owner: username,
  //     repo: repoName
  // });
    // console.log('Repository deleted successfully');

  }
}

exports.confirmRepoNameAvailable = async (req, res) => {
  repoName = req.query.repoName;
  if (!Octokit) {
    const octokitModule = await import('@octokit/rest');
    Octokit = octokitModule.Octokit;
  }

  const token = process.env.GITHUB_AUTH_TOKEN;
  // Initialize Octokit
  const octokit = new Octokit({
    auth: token
  });

  // Get user details
  const { data: { login: username } } = await octokit.users.getAuthenticated();

  try {
     // Attempt to get the repository details
     await octokit.repos.get({
      owner: username,
      repo: repoName,
    });

    // If the request succeeds, the repository name is taken
    res.status(400).send({
      'message': 'Repository name is already taken',
      'data': {
        'available': false
      },
      'status' : 400
    }
    );
  } catch (error) {
    // If the request fails, the repository name may be available
    // Check the error status code to be sure
    if (error.status === 404) {
      res.status(200).send({
        'message': 'Repository name is available',
        'data': {
          'available': true
        },
        'status' : 200
      }
      );
    }
  }



}