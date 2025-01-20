FROM node:18-slim

WORKDIR /app/frontend

# Copy package files
COPY package*.json ./

# Install dependencies with specific Firebase packages
RUN npm install --legacy-peer-deps && \
    npm install firebase@11.1.0 \
    @firebase/app@0.9.27 \
    @firebase/auth@1.6.0 \
    @firebase/messaging@0.12.5 \
    nodemon -g

# Don't copy the rest of the application as it will be mounted
# COPY . .

EXPOSE 3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --spider http://localhost:3000 || exit 1

CMD ["npm", "start"] 