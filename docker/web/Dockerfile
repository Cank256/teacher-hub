FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY packages/web/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY packages/web/src ./src
COPY packages/web/public ./public
COPY packages/web/index.html ./
COPY packages/web/vite.config.ts ./
COPY packages/web/tsconfig*.json ./

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]