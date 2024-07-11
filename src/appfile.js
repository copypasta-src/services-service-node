
const express = require('express');
const githubRoutes = require('./routes/git/githubRoutes.js');
const expressRoutes = require('./routes/framework/expressJSRoutes.js');
const masterRoutes = require('./routes/masterRoutes.js');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const YAML = require('yamljs');
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
// Serve API status for CICD tests
app.get('/status', (req, res) => {
    res.status(200).json({ message: 'API is working.' });
  });



module.exports = app;



