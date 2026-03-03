# ------ Fase de Construcción -----

# Usar una imagen ligera Rust para la compilación
FROM rust:slim AS builder

WORKDIR /app/gamey

# Copiar manifestos de dependencias
COPY gamey/Cargo.toml gamey/Cargo.lock ./

# Crear directorio para cacheado de dependencias
RUN mkdir -p src && echo "fn main() {}" > src/main.rs

# Compilar y cachear dependencias
RUN cargo build --release

# Copiar archivos restantes
COPY gamey/src ./src
COPY gamey/benches ./benches

# Compilar el binario final
RUN cargo build --release

# ----- Fase de Ejecución -----

# Usar una imagen mínima para la ejecución
FROM debian:bookworm-slim

WORKDIR /app/gamey

# Copiar el binario final
COPY --from=builder /app/gamey/target/release/gamey .

# Exponer el puerto
EXPOSE 4000

# Ejecutar el servidor en el puerto 4000
CMD ["./gamey", "--mode", "server", "--port", "4000"]