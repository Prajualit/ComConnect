FROM node:18-slim

# Install wget for health checks
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app/backend

# Copy backend package files
COPY package*.json ./

# Install dependencies and nodemon globally
RUN npm install --include=dev && \
    npm install -g nodemon

# Don't copy the application files as they will be mounted
# COPY . .

EXPOSE 5000

# Run the backend server with nodemon for auto-reloading
CMD ["nodemon", "--legacy-watch", "server.js"] 