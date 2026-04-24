# ------ Fase de Construcción -----

# Usar imagen compatible con ARM para la compilación
FROM node:22-bookworm AS builder

WORKDIR /app

# Copiar manifestos de dependencias y compilar 
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copiar sources
COPY . .

# ----- Fase de Ejecución -----

FROM node:22-bookworm

# Cambiar al usuario "node" para mayor seguridad y evitar correr la app como root
USER node

WORKDIR /app

# Copiar dependencias y código desde builder
COPY --from=builder /app /app

# Exponer el puerto 3000
EXPOSE 3000

# Ejecutar el paquete
CMD ["node", "users-service.js"]
