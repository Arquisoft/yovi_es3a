# ------ Fase de Construcción -----

# Usar imagen compatible con ARM para la compilación
FROM node:22-bookworm

WORKDIR /app

# Copiar manifestos de dependencias y compilar 
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copiar sources
COPY . .

# Exponer el puerto 3000
EXPOSE 3000

# Ejecutar el paquete
CMD ["node", "users-service.js"]