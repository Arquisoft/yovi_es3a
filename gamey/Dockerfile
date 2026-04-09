# ------ Fase de Construcción -----

# Usar una imagen Rust completa
FROM rust:latest AS builder

WORKDIR /app

# Instalar dependencias de compilación necesarias
RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copiar manifestos de dependencias
COPY Cargo.toml Cargo.lock ./

# Copiar benches para evitar fallos de Cargo build
COPY benches ./benches

# Crear directorio para cacheado de dependencias
RUN mkdir -p src && echo "fn main() {}" > src/main.rs && echo "" > src/lib.rs

# Compilar y cachear dependencias
RUN cargo build --release 2>&1

# Copiar archivos restantes
COPY src ./src

# Compilar el binario final
RUN cargo build --release 2>&1

# ----- Fase de Ejecución -----

# Usar una imagen con librerías necesarias
FROM debian:bookworm-slim

WORKDIR /app

# Instalar las librerías necesarias para ejecutar el binario Rust
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copiar el binario final
COPY --from=builder /app/target/release/gamey .

# Exponer el puerto 4000
EXPOSE 4000

# Configurar nivel de logs
ENV RUST_LOG=info

# Ejecutar el servidor con output visible
CMD ["./gamey", "--mode", "server", "--port", "4000"]