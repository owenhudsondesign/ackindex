FROM apify/actor-node-playwright-chrome:20

COPY package*.json ./
RUN npm ci --omit=dev --quiet || npm install --omit=dev --quiet

COPY . ./

CMD ["npm", "start", "--silent"]


