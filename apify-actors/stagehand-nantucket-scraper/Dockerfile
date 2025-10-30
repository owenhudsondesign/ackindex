# Use Apify's Node.js 18 base image with Playwright support
FROM apify/actor-node-playwright-chrome:18

# Copy package files
COPY package*.json ./

# Install dependencies and Playwright browsers
RUN npm install --production && \
    npx playwright install --with-deps chromium

# Copy source code
COPY . ./

# Run the actor
CMD npm start

