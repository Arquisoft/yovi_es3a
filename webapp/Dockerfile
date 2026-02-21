# Build stage
FROM --platform=linux/arm64 node:22-alpine AS builder
WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy sources
COPY . .

# Accept build-time API url (defaults to localhost:3000)
ARG VITE_API_URL="http://localhost:3000"
RUN export VITE_API_URL=${VITE_API_URL} && npm run build

# Production image
FROM --platform=linux/arm64 nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]