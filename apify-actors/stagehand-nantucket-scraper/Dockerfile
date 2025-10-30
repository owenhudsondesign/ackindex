# Use Apify's Node.js 18 base image
FROM apify/actor-node:18

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . ./

# Run the actor
CMD npm start

