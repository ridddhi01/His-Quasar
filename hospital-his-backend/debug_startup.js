// Debug script to find startup errors
require('dotenv').config();

const fs = require('fs');

try {
    console.log('Step 1: Loading routes...');
    const inventoryRoutes = require('./routes/inventoryManager.routes');
    console.log('Routes loaded successfully!');
} catch (error) {
    console.error('ERROR loading routes:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    fs.writeFileSync('startup_error.txt', error.stack);
}
