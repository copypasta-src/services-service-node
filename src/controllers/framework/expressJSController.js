require('dotenv').config();
const execSync = require('child_process').execSync;
const fs = require('fs');
const path = require('path');
const errorHandler = require('../../middleware/errorHandler').errorHandler;
const requestResponseHandler = require('../../middleware/requestResponseHandler').requestResponseHandler;


module.exports.createExpressApi = async function(req, res, repoName = null)  {
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

    // ! -----*****----------------
    try{
        if (repoName === null){
            repoName = req.body.repoName;
        }
        console.log(repoName);
        const dirpath = path.resolve(__dirname, '..', 'temp', repoName); // Adjust path as needed

        // If the directory does not exist, create it
        if (!fs.existsSync(dirpath)) {
            fs.mkdirSync(dirpath, { recursive: true })
        }

        // Create a new React project
        // TODO make sure this creates from a copypasta custom template or a user provided template
        const options = { cwd: path.join(__dirname, `../temp/${repoName}`) };
        execSync(`npx create-react-app ${repoName}`, options, (error, stdout, stderr) => {
            if (error) {
            // console.error(`Error executing command: ${error.message}`);
            throw Error(`Error executing command: ${error.message}`)
            }

            if (stderr) {
            throw Error(`Standard Error: ${stderr}`);
            }
        });

        // Move the files from the created React project to the temp directory
        newProjectPath = path.join(__dirname, `../temp/${repoName}`);
        currentProjectPath = path.join(__dirname, `../temp/${repoName}/${repoName}`);
        console.log(`Moving files from ${currentProjectPath}`);
        console.log(`DirName: ${__dirname}`)
        console.log(`Current Path: ${currentProjectPath}`)
        console.log(`New Path: ${newProjectPath}`)
        moveDirSync(currentProjectPath, newProjectPath);
  
        // Send response 
        requestResponseHandler(req, res, {message: 'Express API created successfully', data: {repoName: repoName, newProjectPath: newProjectPath,}, status : 200})
        
        
        

    } catch (error) {
        errorHandler(error, req, res, null, {message: 'Error creating express api', status: 500});
    }
}