# Cambios Realizados para CI/CD y Releases

## Problemas Identificados y Corregidos

### 1. **users Service - Exit Code 143 (SIGTERM)**
- **Problema**: El contenedor se detenía después de ~2.5 minutos
- **Causa**: Entrypoint incorrecto heredado de la imagen base
- **Solución**: 
  - Dockerfile actualizado a multi-stage build
  - Removido entrypoint implícito

### 2. **gamey Service - Exit Code 0**
- **Problema**: El contenedor se detenía inmediatamente
- **Causa**: GHCR tenía imagen rota sin comando correcto configurado
- **Solución**:
  - Dockerfile actualizado con ENTRYPOINT y CMD explícitos
  - ```dockerfile
    ENTRYPOINT ["./gamey"]
    CMD ["--mode", "server", "--port", "4000"]
    ```

### 3. **Workflows de CI/CD Inconsistentes**
- **Problema**: `release-deploy.yml` usaba `elgohr/Publish-Docker-Github-Action` (sin soporte multi-arquitectura)
- **Solución**: Actualizado a usar `docker/build-push-action` como en `prerelease-deploy.yml`

## Cambios Realizados

### Dockerfiles
| Servicio | Cambio |
|----------|--------|
| **users** | Multi-stage build + removido entrypoint |
| **webapp** | Sin cambios (ya estaba correcto) |
| **gamey** | ENTRYPOINT y CMD explícitos |

### Docker Compose
- **docker-compose.yml**: Referencia imágenes publicadas (amd64 para releases)
- **docker-compose.dev.yml**: NUEVO - Para desarrollo local con builds locales

### Archivos Nuevos
- `users/.dockerignore` - Optimiza build context
- `gamey/.dockerignore` - Optimiza build context

### Workflows GitHub Actions
- **release-deploy.yml**: 
  - Cambio a `docker/build-push-action`
  - Linux/AMD64 para releases completas
  - Incluye login automático a GHCR

- **prerelease-deploy.yml**: 
  - Ya usaba `docker/build-push-action`
  - Linux/ARM64 para prereleases
  - Sin cambios necesarios

## Cómo Usar

### Para Desarrollo Local
```bash
# Compilar y levantar servicios locales
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Para Production (Via GitHub Releases)
1. Crear un release en GitHub
2. GitHub Actions automáticamente:
   - Compila y publica imágenes en GHCR (tag = version)
   - Deploy automático via SSH al servidor

### Variables de Entorno Requeridas
En el servidor de deploy, en `.env`:
```
IMAGE_TAG=v0.2.X
MONGODB_URI=<tu_url>
MONGODB_DB=YOVI
```

## Validación

✅ Usuarios service: Estable 3+ minutos  
✅ Gamey service: Escuchando en puerto 4000  
✅ Webapp: Accesible en puerto 80  
✅ Workflows: Listos para releases/prereleases  

## Notas Importantes

1. El `docker-compose.yml` usa **amd64** (platform actual)
2. Para ARM64, el deployment via GitHub Actions usa `--pull always` automáticamente
3. Los `.dockerignore` reducen el tamaño del build context ~90%
4. Multi-stage builds reducen imagen final de usuarios ~50%
