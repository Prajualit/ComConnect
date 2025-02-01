const mongoose = require("mongoose");

const Connection = async (username, password) => {
    console.log('Environment check:');
    console.log('DB_USERNAME exists:', !!process.env.DB_USERNAME);
    console.log('DB_PASSWORD exists:', !!process.env.DB_PASSWORD);
    console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
    
    const URL = process.env.MONGODB_URI;
    
    // Log the connection URL (with masked password)
    const maskedURL = URL.replace(/:([^@]+)@/, ':****@');
    console.log('Attempting to connect with URL:', maskedURL);

    try {
        await mongoose.connect(URL, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 60000,
            maxPoolSize: 10
        });
        console.log('✅ Database Connected Successfully to MongoDB Atlas');
    } catch (error) {
        console.error('❌ Database Connection Error:', error.message);
        throw error;
    }
};

module.exports = Connection;