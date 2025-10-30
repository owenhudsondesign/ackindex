# Use plain Apify Node.js 20 image (let Stagehand manage its own Playwright)
FROM apify/actor-node:20

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (Stagehand will bring its own Playwright)
RUN npm install --production

# Install Playwright browsers
RUN npx playwright install chromium --with-deps

# Copy source code
COPY . ./

# Run the actor
CMD npm start

