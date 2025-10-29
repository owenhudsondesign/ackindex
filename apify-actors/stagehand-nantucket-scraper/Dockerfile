# Use Apify's Playwright image with Node.js 20
FROM apify/actor-node-playwright-chrome:20

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version

# Copy source code
COPY . ./

# Start the actor
CMD npm start --silent

