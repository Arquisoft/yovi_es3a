# ------ Fase de Construcción -----

# Usar una imagen ligera Rust para la compilación
FROM rust:slim AS builder

WORKDIR /app

# Copiar manifestos de dependencias
COPY Cargo.toml Cargo.lock ./

# Copiar benches para evitar fallos de Cargo build
COPY benches ./benches

# Crear directorio para cacheado de dependencias
RUN mkdir -p src && echo "fn main() {}" > src/main.rs && echo "" > src/lib.rs

# Compilar y cachear dependencias
RUN cargo build --release

# Copiar archivos restantes
COPY src ./src

# Compilar el binario final
RUN cargo build --release

# ----- Fase de Ejecución -----

# Usar una imagen mínima para la ejecución
FROM debian:bookworm-slim

WORKDIR /app

# Copiar el binario final
COPY --from=builder /app/target/release/gamey .

# Exponer el puerto 4000
EXPOSE 4000

# Ejecutar el servidor
CMD ["./gamey", "--mode", "server", "--port", "4000"]