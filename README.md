# Teacher Hub Platform

A comprehensive web and mobile platform designed specifically for Ugandan teachers to facilitate collaboration, resource sharing, and professional development.

## Project Structure

This is a monorepo containing three main packages:

- `packages/backend` - Node.js/Express API server
- `packages/web` - React Progressive Web App
- `packages/mobile` - React Native mobile application

## Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd teacher-hub-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development environment with Docker**
   ```bash
   npm run docker:up
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

The application will be available at:
- Web App: http://localhost:3000
- API Server: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Elasticsearch: http://localhost:9200

## Development Commands

### Root Level Commands
- `npm run dev` - Start all development servers
- `npm run build` - Build all packages
- `npm run test` - Run tests for all packages
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier

### Package-Specific Commands
- `npm run dev:backend` - Start backend development server
- `npm run dev:web` - Start web development server
- `npm run dev:mobile` - Start React Native development server

### Docker Commands
- `npm run docker:up` - Start all services with Docker Compose
- `npm run docker:down` - Stop all Docker services
- `npm run docker:build` - Build Docker images

## Technology Stack

### Backend
- Node.js with Express.js
- TypeScript
- PostgreSQL with pg
- Redis for caching
- Elasticsearch for search
- JWT authentication
- Socket.io for real-time features

### Web Application
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Redux Toolkit for state management
- PWA capabilities with service workers
- Vitest for testing

### Mobile Application
- React Native
- TypeScript
- React Navigation
- Redux Toolkit
- SQLite for offline storage

### Development Tools
- ESLint and Prettier for code quality
- Jest and Vitest for testing
- Docker for containerization
- GitHub Actions for CI/CD

## Architecture

The platform follows a microservices architecture with:
- API Gateway for request routing
- Separate services for authentication, content management, messaging, etc.
- Offline-first design for mobile connectivity
- Progressive Web App capabilities
- Integration with Ugandan government education APIs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.