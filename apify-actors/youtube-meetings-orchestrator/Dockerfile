# Use official Node.js 20 on Debian
FROM node:20-bullseye-slim

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy source code
COPY . ./

# Run the actor
CMD ["npm", "start"]
