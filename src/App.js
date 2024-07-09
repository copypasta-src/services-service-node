
const express = require('express');
// const errorHandler = require('./middlewares/errorHandler.js');
// const automationRoutes = require('./routes/automationRoutes.js');
// const helloWorldRoutes = require('./routes/helloWorldRoutes.js');
// const swaggerUi = require('swagger-ui-express');
const path = require('path');
// const YAML = require('yamljs');
// const swaggerDocument = YAML.load(path.join(__dirname, '..', 'api-docs.yaml'));
// const apiKeyAuth = require('./middlewares/apiKeyAuth.js');
// const { recordRequest } = require('./middlewares/gaeUsageHandler.js');
// const usageRoutes = require('./routes/usageRoutes'); // Import the usage routes

// const swaggerDocument = require('./api-docs.json');

const app = express();

// Middleware
app.use(express.json());
// app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.get('/', (req, res) => {
    res.send('Hello World');
  
});

// // Serve landing page HTML
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'html', 'homePage.html'));
//   });
// // Serve API status for CICD tests
// app.get('/status', (req, res) => {
//     res.status(200).json({ message: 'API is working.' });
//   });
// // Serve API documentation
// app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// app.use('/hello', helloWorldRoutes);
// app.use('/automation', automationRoutes)
// // This route will return the number of requests made and the number of requests made to each endpoint
// app.use('/api/usage', usageRoutes);



// Error Handling
// app.use(errorHandler);

module.exports = app;



