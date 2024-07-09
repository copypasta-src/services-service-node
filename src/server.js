require('dotenv').config();
const app = require('./App');
// const connectDB = require('./utils/db');
const port = process.env.PORT || 3000;

// connectDB();

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});