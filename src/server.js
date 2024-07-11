require('dotenv').config();
const app = require('./appfile');
const port = process.env.PORT || 8080;
const path = require('path');

global.appRoot = path.basename(path.join(__dirname, '..'));

// connectDB();

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
