# ------ Fase de Construcción -----

# Usar imagen Rust estable
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

# Copiar benches y src
COPY benches ./benches
COPY src ./src

# Compilar el binario final
RUN cargo build --release

# ----- Fase de Ejecución -----

# Usar imagen Debian Bookworm para consistencia
FROM debian:bookworm-slim

WORKDIR /app

# Instalar las librerías necesarias para ejecutar el binario Rust
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libgcc-s1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar el binario final
COPY --from=builder /app/target/release/gamey .

# Exponer el puerto 4000
EXPOSE 4000

# Configurar nivel de logs y desactivar buffering
ENV RUST_LOG=info
ENV RUST_BACKTRACE=1
ENV RUST_LOG_STYLE=always

# Ejecutar el servidor sin sh wrapper
CMD ["./gamey", "--mode", "server", "--port", "4000"]
