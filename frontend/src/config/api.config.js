// Define URLs
const PROD_API_URL = 'https://aws-comconnect-v2-backend.onrender.com/api';
const LOCAL_API_URL = 'http://localhost:5000/api';

// Determine which URL to use
let API_URL = LOCAL_API_URL;

if (process.env.REACT_APP_USE_PROD_API === 'true') {
    API_URL = PROD_API_URL;
    console.log('Using Production API:', PROD_API_URL);
} else {
    console.log('Using Local API:', LOCAL_API_URL);
}

// Debug logs
console.log('Environment:', process.env.NODE_ENV);
console.log('REACT_APP_USE_PROD_API:', process.env.REACT_APP_USE_PROD_API);
console.log('Final API_URL:', API_URL);

export { API_URL };