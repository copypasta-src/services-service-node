require('dotenv').config();
const execSync = require('child_process').execSync;
const fs = require('fs');
const path = require('path');


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
            repoName = req.query.repoName;
        }
        console.log(repoName);
        const dirpath = path.resolve(__dirname, '..', 'temp', repoName); // Adjust path as needed

        // If the directory does not exist, create it
        if (!fs.existsSync(dirpath)) {
            fs.mkdirSync(dirpath, { recursive: true })
        }

        // Create a new React project
        const options = { cwd: path.join(__dirname, `../temp/${repoName}`) };
        execSync(`npx create-react-app ${repoName}`, options, (error, stdout, stderr) => {
            if (error) {
            console.error(`Error executing command: ${error.message}`);
            }

            if (stderr) {
            console.error(`Standard Error: ${stderr}`);
            }
        });

        // Move the files from the created React project to the temp directory
        newProjectPath = path.join(__dirname, `../temp/${repoName}`);
        currentProjectPath = path.join(__dirname, `../temp/${repoName}/${repoName}`);
        console.log(`Moving files from ${currentProjectPath}`);
        moveDirSync(currentProjectPath, newProjectPath);

        // TODO dont think we really need this
        const filePath = path.join(dirpath, 'newfile.txt');
        fs.writeFileSync(filePath, 'Hello, world!');   
        
        // If the function was called directly
        if (req && res) {
            res.status(200).send({
                message: 'Express API created successfully',
                data: {
                    repoName: repoName,
                    newProjectPath: newProjectPath,
                }
            });
        }
        // If the function was called from another function 
        else {
            return {
                message: 'Express API created successfully',
                data: {
                    repoName: repoName,
                    newProjectPath: newProjectPath,
                }
            
            }
        
        } 

    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating express api');
    }
}