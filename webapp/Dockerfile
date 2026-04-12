# ------ Fase de Construcción -----

# Usar imagen compatible con ARM para la compilación
FROM node:22.11-bookworm AS builder

WORKDIR /app

# Copiar manifestos de dependencias y compilar 
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copiar sources
COPY . .

# Aceptar url de la API en tiempo de ejecución y compilar el binario final
ARG VITE_API_URL="http://localhost:3000"
RUN export VITE_API_URL=${VITE_API_URL} && npm run build

# ----- Fase de Ejecución -----

# Imagen de producción para la ejecución
FROM nginx:stable-alpine

# Copiar el binario final
COPY --from=builder /app/dist /usr/share/nginx/html

# Asegurar fallback para rutas de SPA como /game
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Ejecutar el servidor
CMD ["nginx", "-g", "daemon off;"]
