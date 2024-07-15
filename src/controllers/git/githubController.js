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
  const redirectUri = `${process.env.GH_AUTH_REDIRECT_URL_BASE}/github/auth/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_COPYPASTA_APP_CLIENT_ID}&redirect_uri=${redirectUri}&scope=repo,user,delete_repo`;
  
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
  console.log(code);
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

    // TODO this should store the token in the database
    // TODO then you should return the token to the client for client side storing
    await res.status(200).send('Authentication successful! You can now make commits on behalf of the user. Remember to store the token in the database. Your auth token has been printed to the console and is embeded in the body of this response');
    
    // Save the access token for the user, e.g., in a database
    console.log(accessToken);
    // res.send('Authentication successful! You can now make commits on behalf of the user.');
  } catch (error) {
    res.status(500).send('Error exchanging code for access token');
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
  // TODO this will get replaced with a call to the database for the user token
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

    // delete temp repo
    fs.rmSync(path.join(__dirname, `../temp`), { recursive: true, force: true });
    if (!res == null) {
    res.status(200).send({
      'message' : 'Repository has been created successfully. Main branch has been created.',
      'status' : 200
    }); }
    else {
      return {
        'message' : 'Repository has been created successfully. Main branch has been created.',
        'status' : 200
      }
    }

} catch (error) {
  fs.rmSync(path.join(__dirname, `../temp`), { recursive: true, force: true });
  await octokit.rest.repos.delete({
    owner: organization,
    repo: repoName
});
  console.log('Repository deleted successfully');
  console.error(error);
  if (!res == null) {
    res.status(500).send({'message' :'Error creating repository', 'content' : error});
  }
  else {
    throw new Error('Error creating repository');
  }


  }
}

exports.createBranchAndCommitDirectories = async function(branchName, directoryPath, repoName, repoOwner, token) {
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

  // Initialize Octokit
  const octokit = new Octokit({
    auth: token
  });

  // Local path to clone the repository
  const repoUrl = `https://github.com/${repoOwner}/${repoName}.git`;
  const dirpath = path.resolve(__dirname, '..', 'clone', `${repoName}`); // Adjust path as needed
  fs.mkdirSync(dirpath, { recursive: true })
  
  const git = simpleGit();

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


  return {
    'message': `${branchName} branch created and files committed successfully`,
    'status': 200
  };

}
// TODO this needs to be reviewed.
// SHould not be referenceing an env var for that GH token
// Token should be that of the user calling the endpoint and should be an input variable
exports.confirmRepoNameAvailable = async (req, res) => {
  repoName = req.body.repoName;
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
      // TODO change to input parameter
      owner: process.env.GITHUB_ORGANIZATION_NAME,
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