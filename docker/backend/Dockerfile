FROM node:20-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY packages/backend/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY packages/backend/src ./src
COPY packages/backend/tsconfig.json ./

# Build the application
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]