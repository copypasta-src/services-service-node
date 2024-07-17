const axios = require('axios');
// const { Octokit } = require("@octokit/rest");
const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const { dir } = require('console');
require('dotenv').config();
const execSync = require('child_process').execSync;
const errorHandler = require('../../middleware/errorHandler').errorHandler;
const requestResponseHandler = require('../../middleware/requestResponseHandler').requestResponseHandler;
const expressJSController = require('../framework/expressJSController');


// Dynamically import @octokit/rest
let Octokit;

exports.auth = async (req, res) => {
  try {
  if (!Octokit) {
    const octokitModule = await import('@octokit/rest');
    Octokit = octokitModule.Octokit;
  }
  const redirectUri = `${process.env.GH_AUTH_REDIRECT_URL_BASE}/github/auth/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_COPYPASTA_APP_CLIENT_ID}&redirect_uri=${redirectUri}&scope=repo,user,delete_repo`;
  
  // TODO return this to the client so that the client can redirect to this
  res.status(200).redirect(githubAuthUrl)
} catch (error) {
  errorHandler(error, req, res, null, {message: 'Error authenticating with GitHub', status: 500});
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
      client_id: process.env.GITHUB_COPYPASTA_APP_CLIENT_ID,
      client_secret: process.env.GITHUB_COPYPASTA_APP_CLIENT_SECRET,
      code: code
    }, {
      headers: {
        accept: 'application/json'
      }
    });
    const accessToken = response.data.access_token;
    console.log(accessToken);

    return requestResponseHandler(req, res, {'message' : `Authentication successful! You can now make commits on behalf of the user. Remember to store the token in the database. Token ${accessToken}`, 'status' : 200});
    
    // TODO Save the access token for the user, e.g., in a database

  } catch (error) {
    errorHandler(error, req, res, null, {message: 'Error exchanging code for access token', status: 500});
  }
};


exports.initializeServiceRepository = async function(req, res, repoNameArg = null, organizationArg = null, tokenArg = null) {
  var repoName = ''
  var organization = ''
  var token = ''

  if (!Octokit) {
    const octokitModule = await import('@octokit/rest');
    Octokit = octokitModule.Octokit;
  }
  // GitHub user and repo details
  if (!req == null) {
   repoName = req.body.repoName;
   organization = req.body.organization;
   token = req.body.token;
} 
  
  else {
     repoName = repoNameArg;
     organization = organizationArg
     token = tokenArg
  }

  // Initialize Octokit
  const octokit = await new Octokit({
    auth: token
  });

  // Fetch the authenticated user's details
  const { data: user } = await octokit.users.getAuthenticated();
  const { data: emails } = await octokit.users.listEmailsForAuthenticatedUser();
  emails.length == 0 ? primaryEmail = emails :primaryEmail = emails.find(email => email.primary).email;
  
  try {
    // Create a new repository
    await octokit.repos.createInOrg({ name: repoName, org: organization });

    // Local path to clone the repository
    const repoUrl = `https://github.com/${organization}/${repoName}.git`;
    const dirpath = path.resolve(__dirname, '..', 'temp', repoName); // Adjust path as needed
    fs.mkdirSync(dirpath, { recursive: true })
    
    const git = simpleGit();
    // Set Git configuration with user details

      if (!primaryEmail ) {
        throw new Error("User name or email is missing from GitHub profile.");
      } if (!user.name) {
        user.name = 'GitHub User';
      }
      // Set Git configuration with user details
      execSync(`git config --global user.email "${primaryEmail}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error setting Git email: ${stderr}`);
          throw new Error(`Error setting Git email: ${stderr}`);
        }
        console.log(`Git email set to: ${primaryEmail}`);
      });
  
      execSync(`git config --global user.name "${user.name}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error setting Git name: ${stderr}`);
          throw new Error(`Error setting Git name: ${stderr}`);
        }
        console.log(`Git name set to: ${user.name}`);
      });
      // Set up Git credential helper
    execSync(`git config --global credential.helper store`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error setting Git credential helper: ${stderr}`);
        throw new Error(`Error setting Git credential helper: ${stderr}`);
      }
      console.log(`Git credential helper set.`);
    });

    // Store the GitHub token in the credential helper
    execSync(`echo "https://${user.login}:${token}@github.com" > ~/.git-credentials`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error storing GitHub token: ${stderr}`);
        throw new Error(`Error storing GitHub token: ${stderr}`);
      }
      console.log(`GitHub token stored.`);
    });

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

    // delete temp repo
    fs.rmSync(path.join(__dirname, `../temp`), { recursive: true, force: true });

    // Send your response
    return requestResponseHandler(req, res, {'message' : 'Repository has been created successfully. Main branch has been created.','status' : 200})

} catch (error) {
  fs.rmSync(path.join(__dirname, `../temp`), { recursive: true, force: true });
  await octokit.rest.repos.delete({
    owner: organization,
    repo: repoName
});
  console.log('Repository deleted successfully');

  errorHandler(error, req, res, null, {message: 'Error creating repository', status: 500});
  }
}

exports.createBranchAndCommitDirectories = async function(req, res, branchName, directoryPath, repoName, repoOwner, token) {
  // Helper function to move directories
  function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
  
    for (let entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
  
      if (entry.isDirectory()) {
        copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath); // This will overwrite the file if it exists
      }
    }
  }
  
  function deleteDirSync(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (let entry of entries) {
      const entryPath = path.join(dirPath, entry.name);

      entry.isDirectory() ? deleteDirSync(entryPath) : fs.unlinkSync(entryPath);
  }

  fs.rmdirSync(dirPath);

  }
    
  function moveDirSync(srcPath, destPath) {
  if (fs.existsSync(destPath)) {
      copyDirSync(srcPath, destPath);
      deleteDirSync(srcPath);} 
  else {
      fs.renameSync(srcPath, destPath);
      }
  }
  if (!Octokit) {
    const octokitModule = await import('@octokit/rest');
    Octokit = octokitModule.Octokit;
  }

  try {

    // Initialize Octokit
    const octokit = new Octokit({
      auth: token
    });

    // Local path to clone the repository
    const repoUrl = `https://github.com/${repoOwner}/${repoName}.git`;
    const dirpath = path.resolve(__dirname, '..', 'clone', `${repoName}`); // Adjust path as needed
    fs.mkdirSync(dirpath, { recursive: true })
    
    const git = simpleGit();

    // await git.addConfig('user.name', githubName); // Replace with your GitHub username
    // await git.addConfig('user.email', githubEmail);

    await git.clone(repoUrl, dirpath);

    const repo = simpleGit(dirpath);


    await repo.checkoutLocalBranch(branchName);

    // move files from temp dir to clone dir
    moveDirSync(directoryPath, dirpath);

    // Stage the new files
    await repo.add(path.join(dirpath, '*'));

    // Commit the changes
    await repo.commit(`Commit of files from ${directoryPath}`);

    // Push the new branch to the remote repository
    await repo.push('origin', branchName);

    fs.rmSync(dirpath, { recursive: true, force: true });

    fs.rmSync(directoryPath, { recursive: true, force: true });

    // Send your response
    return requestResponseHandler(req, res, {'message' : `${branchName} branch created and files committed successfully`, 'status' : 200})
    
} catch (error) {
    errorHandler(error, req, res, null, {message: 'Error creating branch and committing files', status: 500});
}

}

exports.confirmRepoNameAvailable = async (req, res) => {
  const repoName = req.body.repoName;
  const token = req.body.token;
  const organization = req.body.organization;
  if (!Octokit) {
    const octokitModule = await import('@octokit/rest');
    Octokit = octokitModule.Octokit;
  }

  // Initialize Octokit
  const octokit = new Octokit({
    auth: token
  });

  // Get user details
  const { data: { login: username } } = await octokit.users.getAuthenticated();

  try {
     // Attempt to get the repository details
    const result =  await octokit.repos.get({
      owner: organization,
      repo: repoName,
    });

    // If the request succeeds, the repository name is taken
    errorHandler(new Error('Repository name is already taken'), req, res, null, {message : 'Repository name is already taken',status: 400});

  } catch (error) {
    if (error.status === 404) {
      return requestResponseHandler(req, res, {status: 200, message: 'Repository name is available', data: {available: true}});
    }
  }
}

module.exports.createGithubSecret = async function(secretName, secretValue, repoName, owner, token) {
  if (!Octokit) {
    const octokitModule = await import('@octokit/rest');
    Octokit = octokitModule.Octokit;
  }

  // Initialize Octokit
  const octokit = new Octokit({
    auth: token
  });

  const response = await octokit.actions.createOrUpdateSecretForRepo({
    // This is the organization name
    owner: owner,
    repo: repoName,
    secret_name: secretName,
    encrypted_value: secretValue
  });

  return response;
}