# Build stage
FROM node:22-alpine
WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy sources
COPY . .

# Production image
EXPOSE 3000
CMD ["node", "users-service.js"]