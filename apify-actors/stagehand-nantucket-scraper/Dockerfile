# Use plain Apify Node.js 20 image (let Stagehand manage its own Playwright)
FROM apify/actor-node:20

# Install system dependencies needed for Playwright's Chromium (Alpine Linux)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    wqy-zenhei

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Install Playwright's Chromium browser
RUN npx playwright install chromium

# Copy source code
COPY . ./

# Run the actor
CMD npm start

