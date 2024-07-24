
const express = require('express');
const githubRoutes = require('./routes/git/githubRoutes.js');
const expressRoutes = require('./routes/framework/expressJSRoutes.js');
const masterRoutes = require('./routes/masterRoutes.js');
const deploymentRoutes = require('./routes/deployment/deploymentRoutes.js');
const cicdRoutes = require('./routes/cicd/cicdRoutes.js');
const containerizationRoutes = require('./routes/containerization/containerizationRoutes.js');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const YAML = require('yamljs');
const fs = require('fs');
const swaggerDocument = YAML.load(path.join(__dirname, '..', 'api-docs.yaml'));


const app = express();

app.use(express.json());
app.get('/', (req, res) => {
    try{
    res.status(200).send('Hello World');} 
    catch (error) {
        res.status(500).send('Error contacting server');
    }
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/github', githubRoutes);
app.use('/expressjs', expressRoutes);
app.use('/init', masterRoutes);
app.use('/deployment', deploymentRoutes)
app.use('/cicd', cicdRoutes);
app.use('/containerization', containerizationRoutes);
app.use('/configuration' , (req, res) => {
    const configuration = JSON.parse(fs.readFileSync(path.join(__dirname, '../configuration.json')));
    res.status(200).json(configuration);
})
// Serve API status for CICD tests
app.get('/status', (req, res) => {
    res.status(200).json({ message: 'API is working.' });
  });



module.exports = app;



