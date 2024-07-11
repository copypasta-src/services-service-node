require('dotenv').config();
const app = require('./appfile');
const port = process.env.PORT || 8080;

// connectDB();

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});