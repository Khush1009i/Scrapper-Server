require('dotenv').config();
const app = require('./app');
const { initDB } = require('./db');

const PORT = process.env.PORT || 3000;

// Initialize Database and Start Server
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
});
