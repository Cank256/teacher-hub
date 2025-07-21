FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY packages/backend/package*.json ./
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/backend/src ./src
COPY packages/backend/tsconfig.json ./

# Install dev dependencies for building
RUN npm ci

# Build the application
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]