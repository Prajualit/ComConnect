const mongoose = require("mongoose");

const Connection = async (username, password) => {
    // Log environment variables (safely)
    console.log('Environment check:');
    console.log('DB_USERNAME exists:', !!process.env.DB_USERNAME);
    console.log('DB_PASSWORD exists:', !!process.env.DB_PASSWORD);
    console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
    
    const URL = process.env.MONGODB_URI || `mongodb+srv://${username}:${password}@cluster0.t7rpzk9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
    
    // Log the connection URL (with masked password)
    const maskedURL = URL.replace(/:([^@]+)@/, ':****@');
    console.log('Attempting to connect with URL:', maskedURL);

    const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        bufferCommands: false,
        autoIndex: true,
        retryWrites: true,
        retryReads: true,
        maxPoolSize: 10
    };

    try {
        await mongoose.connect(URL, options);
        console.log('✅ Database Connected Successfully to MongoDB Atlas');
    } catch (error) {
        console.error('❌ Database Connection Error:', error.message);
        throw error;
    }
};

module.exports = Connection;