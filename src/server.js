require('dotenv').config();
// eslint-disable-next-line 
const app = require('./app');
// const connectDB = require('./utils/db');
const port = process.env.PORT || 8080;

// connectDB();

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});