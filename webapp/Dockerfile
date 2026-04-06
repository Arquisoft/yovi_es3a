# ------ Fase de Construcción -----

# Usar imagen compatible con ARM para la compilación
FROM node:22-bookworm AS builder

WORKDIR /app

# Copiar manifestos de dependencias y compilar 
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copiar sources
COPY . .

# Compilar - sin necesidad de variables de entorno
# La URL del WebSocket se resuelve en tiempo de ejecución en el navegador
RUN npm run build

# ----- Fase de Ejecución -----

# Imagen de producción para la ejecución
FROM nginx:stable-alpine

# Copiar el binario final
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de nginx
COPY webapp/nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Ejecutar el servidor
CMD ["nginx", "-g", "daemon off;"]