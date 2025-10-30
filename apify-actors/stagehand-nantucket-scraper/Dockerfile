# Use Apify's Node.js 20 base image with Playwright support (required for Stagehand)
# This image already has Playwright and Chromium installed
FROM apify/actor-node-playwright-chrome:20

# Copy package files
COPY package*.json ./

# Install Node.js dependencies only (Playwright already installed in base image)
RUN npm install --production

# Copy source code
COPY . ./

# Run the actor
CMD npm start

