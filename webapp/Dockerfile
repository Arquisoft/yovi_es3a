# ------ Fase de Construcción -----

# Usar imagen compatible con ARM para la compilación
FROM node:22-bookworm AS builder

WORKDIR /app

# Copiar manifestos de dependencias y compilar 
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copiar sources
COPY . .

# Aceptar urls de API y Gamey en tiempo de ejecución y compilar el binario final
ARG VITE_API_URL="http://localhost:3000"
ARG VITE_GAMEY_URL="http://localhost:4000"
RUN export VITE_API_URL=${VITE_API_URL} && export VITE_GAMEY_URL=${VITE_GAMEY_URL} && npm run build

# ----- Fase de Ejecución -----

# Imagen de producción para la ejecución
FROM nginx:stable-alpine

# Copiar el binario final
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Ejecutar el servidor
CMD ["nginx", "-g", "daemon off;"]