# Yovi_es3a - Juego Y en UniOvi

[![Release — Test, Build, Publish, Deploy](https://github.com/arquisoft/yovi_es3a/actions/workflows/release-deploy.yml/badge.svg)](https://github.com/arquisoft/yovi_es3a/actions/workflows/release-deploy.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es3a&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es3a)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es3a&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es3a)

[![Logo](/webapp/public/vite.svg)](https://github.com/Arquisoft/yovi_es3a)

Este es un proyecto base para la asignatura de Arquitectura del Software en 2024/2025.
Yovi es una aplicación centrada en el juego de conexión Y, permitiendo a los usuarios disfrutar de partidas interactivas tanto contra la inteligencia artificial como contra otros jugadores.

Wiki: https://github.com/Arquisoft/yovi_es3a/wiki

Docs: https://arquisoft.github.io/yovi_es3a/ 

Aplicación: http://158.179.212.71

## Miembros del Equipo
👤Colaborador | 🌐Cuenta Git | 📧Email de contacto  
-- | -- | -- 
Andrés Zhou Blanco Rodríguez| <a href="https://github.com/AndresZbr">AndresZbr</a> | UO300351@uniovi.es  
Ben James Coleman Kheyyali| <a href="https://github.com/uo284238">uo284238</a> | UO284238@uniovi.es  
Carlos Cabrera Moral| <a href="https://github.com/latiose">uo288595</a> | UO288595@uniovi.es  
Carmen Méndez Camino | <a href="https://github.com/Carmenmndzcmno">Carmenmndzcmno</a> | UO295526@uniovi.es  
Emilio García Fernández| <a href="https://github.com/pispidu">pispidu</a> | UO287892@uniovi.es  

## Resumen de la aplicación

### Funcionalidad principal
La funcionalidad central de YOVI es permitir a los usuarios jugar al juego de conexión Y sobre un tablero triangular. El objetivo es conectar los tres lados del triángulo con una cadena continua de piezas. La aplicación gestiona el estado del juego, valida los movimientos y determina el ganador siguiendo las reglas clásicas del juego.

### Otras características de la aplicación
- **Sistema de Autenticación**: Registro e inicio de sesión de usuarios para mantener un perfil personalizado.
- **Estadísticas e Historial**: Consulta de récords personales, partidas ganadas/perdidas e historial detallado de movimientos.
- **Diferentes Niveles de Bots**: Posibilidad de enfrentarse a distintos bots con variadas estrategias y niveles de dificultad.
- **API Abierta**: Acceso programático para consultar datos de usuarios y juegos, permitiendo incluso la integración de bots externos.
- **Arquitectura Políglota**: Combinación de la potencia de Rust para la lógica de juego y TypeScript para una experiencia web moderna y fluida.

### Vídeo
AQUÍ IRÁ EL VÍDEO DEL PROYECTO

## Estructura del Proyecto

El proyecto está dividido en tres componentes principales, cada uno en su propio directorio:

- `webapp/`: Una aplicación frontend construida con React, Vite y TypeScript.
- `users/`: Un servicio backend para gestionar usuarios, construido con Node.js y Express.
- `gamey/`: Un motor de juego y servicio de bots en Rust.
- `docs/`: Fuentes de documentación de arquitectura siguiendo la plantilla Arc42.

Cada componente tiene su propio archivo `package.json` con los scripts necesarios para ejecutar y probar la aplicación.

## Características Básicas

- **Registro de Usuarios**: La aplicación web proporciona un formulario sencillo para registrar nuevos usuarios.
- **Servicio de Usuarios**: El servicio de usuarios recibe la solicitud de registro, simula cierto procesamiento y devuelve un mensaje de bienvenida.
- **GameY**: Un motor de juego básico que solo elige una pieza aleatoria.

## Componentes

### Webapp

La `webapp` es una aplicación de página única (SPA) creada con [Vite](https://vitejs.dev/) y [React](https://reactjs.org/).

- `src/App.tsx`: El componente principal de la aplicación.
- `src/RegisterForm.tsx`: El componente que renderiza el formulario de registro de usuarios.
- `package.json`: Contiene scripts para ejecutar, construir y probar la webapp.
- `vite.config.ts`: Archivo de configuración para Vite.
- `Dockerfile`: Define la imagen Docker para la webapp.

### Servicio de Usuarios

El servicio `users` es una API REST sencilla construida con [Node.js](https://nodejs.org/) y [Express](https://expressjs.com/).

- `users-service.js`: El archivo principal para el servicio de usuarios. Define un endpoint `/createuser` para manejar la creación de usuarios.
- `package.json`: Contiene scripts para iniciar el servicio.
- `Dockerfile`: Define la imagen Docker para el servicio de usuarios.

### Gamey

El componente `gamey` es un motor de juego basado en Rust con soporte para bots, construido con [Rust](https://www.rust-lang.org/) y [Cargo](https://doc.rust-lang.org/cargo/).

- `src/main.rs`: Punto de entrada para la aplicación.
- `src/lib.rs`: Exportaciones de la librería para el motor gamey.
- `src/bot/`: Implementación y registro de bots.
- `src/core/`: Lógica central del juego, incluyendo acciones, coordenadas, estado del juego y gestión de jugadores.
- `src/notation/`: Soporte para notación de juego (YEN, YGN).
- `src/web/`: Componentes de la interfaz web.
- `Cargo.toml`: Manifiesto del proyecto con dependencias y metadatos.
- `Dockerfile`: Define la imagen Docker para el servicio gamey.

## Ejecución del Proyecto

Puedes ejecutar este proyecto usando Docker (recomendado) o localmente sin Docker.

### Con Docker

Esta es la forma más fácil de poner en marcha el proyecto. Necesitas tener instalados [Docker](https://www.docker.com/) y [Docker Compose](https://docs.docker.com/compose/).

1. **Construir y ejecutar los contenedores:**
    Desde el directorio raíz del proyecto, ejecuta:

```bash
docker-compose up --build
```

Este comando construirá las imágenes Docker tanto para la `webapp` como para el servicio de `users` y los iniciará.

2. **Acceder a la aplicación:**
- Aplicación web: [http://localhost](http://localhost)
- API del servicio de usuarios: [http://localhost:3000](http://localhost:3000)
- API de Gamey: [http://localhost:4000](http://localhost:4000)

### Sin Docker

Para ejecutar el proyecto localmente sin Docker, necesitarás ejecutar cada componente en una terminal separada.

#### Requisitos previos

* [Node.js](https://nodejs.org/) y npm instalados.

#### 1. Ejecutar el Servicio de Usuarios

Navega al directorio `users`:

```bash
cd users
```

Instala las dependencias:

```bash
npm install
```

Ejecuta el servicio:

```bash
npm start
```

El servicio de usuarios estará disponible en `http://localhost:3000`.

#### 2. Ejecutar la Aplicación Web

Navega al directorio `webapp`:

```bash
cd webapp
```

Instala las dependencias:

```bash
npm install
```

Ejecuta la aplicación:

```bash
npm run dev
```

La aplicación web estará disponible en `http://localhost:5173`.

#### 3. Ejecutar la aplicación GameY

En este momento la aplicación GameY no es necesaria, pero una vez que lo sea, también deberías iniciarla desde la línea de comandos.

## Scripts Disponibles

Cada componente tiene su propio conjunto de scripts definidos en su `package.json`. Aquí están algunos de los más importantes:

### Webapp (`webapp/package.json`)

- `npm run dev`: Inicia el servidor de desarrollo para la webapp.
- `npm test`: Ejecuta las pruebas unitarias.
- `npm run test:e2e`: Ejecuta las pruebas de extremo a extremo (e2e).
- `npm run start:all`: Un script de conveniencia para iniciar tanto la `webapp` como el servicio `users` simultáneamente.

### Usuarios (`users/package.json`)

- `npm start`: Inicia el servicio de usuarios.
- `npm test`: Ejecuta las pruebas para el servicio.

### Gamey (`gamey/Cargo.toml`)

- `cargo build`: Construye la aplicación gamey.
- `cargo test`: Ejecuta las pruebas unitarias.
- `cargo run`: Ejecuta la aplicación gamey.
- `cargo doc`: Genera la documentación para la aplicación del motor GameY
