FROM node:18-slim

# Install wget for health checks
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Set working directory to /app/backend
WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies and nodemon globally
RUN npm install --include=dev && \
    npm install -g nodemon

# Copy the Firebase config file to the correct location
COPY comconnect-2b1d7-firebase-adminsdk-20r1n-c127902f6f.json ./config/comconnect-2b1d7-firebase-adminsdk-20r1n-c127902f6f.json

# Copy backend files
COPY backend/ .

EXPOSE 5000

# Run the backend server
CMD ["npm", "run", "dev"] 