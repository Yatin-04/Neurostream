FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production

# Copy application source
COPY . .

# Default port — override via ENV at runtime
ENV PORT=3001
EXPOSE ${PORT}

CMD ["node", "index.js"]
