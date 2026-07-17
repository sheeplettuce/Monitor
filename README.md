# Monitor830 — Backend

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=plastic&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-ESM-3178C6?style=plastic&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Express-black?style=plastic&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Prisma-5.22.0-2D3748?style=plastic&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=plastic&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/pnpm-F69220?style=plastic&logo=pnpm&logoColor=white" alt="pnpm" />
</p>
<p align="center">
  <img src="https://img.shields.io/badge/React_Native-Expo-61DAFB?style=plastic&logo=react&logoColor=black" alt="React Native + Expo" />
  <img src="https://img.shields.io/badge/Backblaze_B2-Almacenamiento-E21E29?style=plastic&logo=backblaze&logoColor=white" alt="Backblaze B2" />
  <img src="https://img.shields.io/badge/JWT-Autenticación-000000?style=plastic&logo=jsonwebtokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/Estado-En_desarrollo-yellow?style=plastic" alt="Estado" />
  <img src="https://img.shields.io/badge/Uso-Interno-lightgrey?style=plastic" alt="Licencia" />
</p>

Backend del sistema de gestión integral de siniestros para **Tractoreconstrucciones San Quintín S.A. de C.V.**, empresa dedicada a la reconstrucción de equipo de transporte (tractocamiones, autobuses, remolques, tanques, dollies, entre otros), ubicada en carretera Aguascalientes–Villa Hidalgo km 1, Los Negritos, Aguascalientes. El sistema centraliza el registro de ingreso, seguimiento de estado y salida de los tractocamiones siniestrados, así como el resguardo de expedientes, evidencias fotográficas y documentos asociados a cada siniestro.

Este proyecto nació como estadía profesional de **Carlos Santiago Delgado Oliva**, TSU en Desarrollo de Software Multiplataforma (Universidad Tecnológica de Aguascalientes), bajo asesoría académica de Francisco Javier Huerta Juárez y asesoría organizacional de Rocío Abilene Jiménez Jasso. Digitaliza procesos que antes se llevaban en papel y en hojas de Excel/Word almacenadas localmente en un único equipo, cuyo disco duro SSD se averió y provocó pérdida total de información; Monitor830 elimina ese punto único de falla centralizando el resguardo en base de datos y almacenamiento en nube.

## Descripción funcional

El sistema administra el ciclo de vida completo de un siniestrado a través de cuatro estados:

**Ingreso → Restauración → Pendiente de salida → Salida**

### Módulos principales

- **Autenticación y usuarios**: login mediante usuario y contraseña con JWT, contraseñas hasheadas, tres roles (Administrador, Operador, Técnico). El Administrador puede listar, registrar, modificar y eliminar usuarios sin afectar el historial ya almacenado.
- **Registro de ingreso**: captura de datos del cliente, del tractocamión, de la aseguradora (cuando aplica) y levantamiento de daños. Genera automáticamente un expediente inicial y asigna el estado "Ingreso".
- **Gestión de evidencias**: carga de fotografías y documentos por siniestro. Administrador y Operador pueden subir y visualizar; solo el Administrador puede eliminar, y siempre mediante confirmación previa. Técnico tiene acceso de solo lectura.
- **Seguimiento y gestión de estados**: actualización del estado del siniestrado y registro de historial de cambios (quién, cuándo y qué se modificó).
- **Listado y consulta**: búsqueda y filtrado por cliente, tractocamión, aseguradora o estado; consulta cronológica de expedientes.
- **Salida y entrega**: registro de entrega, carga de evidencias de salida, finiquito (obligatorio con aseguradora, opcional para particulares) y cierre automático del expediente.
- **Expedientes y documentos**: generación de expedientes a partir de plantillas fijas de la empresa (Excel), descarga e impresión.
- **Respaldo**: respaldo periódico de información y evidencias, con opción de almacenamiento local o en nube.

### Roles

| Rol | Alcance |
|---|---|
| Administrador | Acceso total: usuarios, expedientes, evidencias (incluye eliminación), respaldo, configuración |
| Operador | Registro y edición de siniestrados, carga de evidencias, sin permisos de administración de usuarios ni eliminación de evidencias |
| Técnico | Acceso de solo lectura, alcance limitado a pantallas específicas |

## Stack técnico

- **Runtime**: Node.js + Express + TypeScript, resolución de módulos **ESM** (los imports internos requieren extensión `.js` aunque el código fuente sea `.ts`)
- **ORM**: Prisma **5.22.0** sobre PostgreSQL. La actualización a Prisma 6.x está descartada: el backend corre sobre tres plataformas distintas (Linux 32-bit, Windows 10 64-bit, macOS Catalina) y el cambio de binary engine introduce riesgo de incompatibilidad.
- **Gestor de paquetes**: pnpm
- **Autenticación**: `jsonwebtoken`, middlewares propios (`verificarToken`, `soloAdmin`, `soloAdminOOperador`) sobre `AuthRequest`
- **Almacenamiento de evidencias**: Backblaze B2 mediante el SDK de AWS S3 (compatible S3), URLs firmadas (presigned) con expiración de 15 minutos para acceso a bucket privado. Los archivos nuevos se marcan con `ubicacion_almacenamiento: "Local"` y pasan a `"Nube"` tras el respaldo manual (`POST /respaldar`), momento en el que se elimina el archivo local y se actualiza `ruta` a la key de B2.
- **Generación de documentos**: `xlsx-template` sobre plantillas fijas de Excel de la empresa (solo sustitución de datos, sin generación dinámica de formato)
- **Frontend**: React Native + Expo (TypeScript), React Navigation (native stack), compilado a APK para Android y a build web mediante React Native for Web. Se usa la carpeta `Screens/` en lugar de `app/` para evitar que Expo Router active el ruteo basado en archivos.

## Convenciones del proyecto

- Exports con funciones nombradas, no clases, en los servicios y controladores.
- Import nombrado `{ prisma }` desde `../config/prisma.js`.
- Middlewares de rol explícitos (`soloAdmin`, `soloAdminOOperador`) en lugar de wrappers genéricos de verificación de rol.
- La eliminación de archivos en disco al borrar un expediente va en un `try/catch` separado de la transacción de Prisma, para que un fallo de filesystem no revierta un borrado exitoso en base de datos.
- Multer sube evidencias a `evidencias/{no_siniestro}/evidencias` y `evidencias/{no_siniestro}/DOCUMENTOS REPARACION`.

## Requisitos previos

- Node.js 18 o superior
- pnpm
- PostgreSQL (instancia local o accesible en red)
- Cuenta y bucket de Backblaze B2 (o servicio S3-compatible equivalente) para almacenamiento en nube
- Para builds de Android: Android SDK, Java 21 (Eclipse Adoptium Temurin), Gradle 8.14.3

## Instalación

1. **Clonar el repositorio**

   ```bash
   git clone <url-del-repositorio>
   cd monitor830-backend
   ```

2. **Instalar dependencias**

   ```bash
   pnpm install
   ```

3. **Configurar variables de entorno**

   Crear un archivo `.env` en la raíz del proyecto:

   ```env
   PORT=3000
   DATABASE_URL="postgresql://usuario:password@localhost:5432/monitor830"
   JWT_SECRET="clave_secreta_larga_y_unica"

   # Backblaze B2 (S3-compatible)
   B2_BUCKET_NAME="nombre-del-bucket"
   B2_ENDPOINT="https://s3.us-west-002.backblazeb2.com"
   B2_REGION="us-west-002"
   B2_KEY_ID="tu_key_id"
   B2_APPLICATION_KEY="tu_application_key"
   B2_PRESIGNED_URL_EXPIRY=900
   ```

4. **Generar el cliente de Prisma y aplicar el esquema**

   ```bash
   pnpm prisma generate
   pnpm prisma migrate deploy
   ```

   Importante: no correr `pnpm add -D prisma@latest` ni actualizar a Prisma 6.x. La versión está fijada en `5.22.0` por compatibilidad de binary engines entre las plataformas donde corre el backend.

5. **Compilar TypeScript (si se trabaja desde fuente)**

   ```bash
   pnpm build
   ```

6. **Levantar el servidor**

   ```bash
   pnpm start
   # o en desarrollo
   pnpm dev
   ```

   El servidor queda disponible en `http://localhost:3000` (o el puerto definido en `PORT`).

### Notas para build de frontend (Android / Web)

- El build de Android requiere Java 21 y que la versión de Gradle (8.14.3) coincida con el JDK configurado.
- Para probar el descubrimiento de servicios por Zeroconf/mDNS en red local es necesario un dispositivo físico: los emuladores no soportan multicast. El APK requiere el permiso `CHANGE_WIFI_MULTICAST_STATE`.
- El backend necesita una librería de publicación mDNS (por ejemplo `bonjour-service`) para anunciar los registros PTR/SRV; configurar solo la resolución de hostname no es suficiente para que los dispositivos en la LAN descubran el servidor.

## Ejemplos de uso de la API

Reemplazar `http://localhost:3000` por la dirección real del servidor.

### Autenticación

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "usuario": "admin",
    "password": "contraseña"
  }'
```

### Registro de ingreso de siniestrado

```bash
curl -X POST http://localhost:3000/api/siniestros \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TOKEN' \
  -d '{
    "no_siniestro": "SQ-2026-001",
    "cliente": { "...": "..." },
    "aseguradora": { "...": "..." },
    "levantamiento_danos": { "...": "..." }
  }'
```

### Evidencias

```bash
# Subir evidencia (Administrador u Operador)
curl -X POST "http://localhost:3000/api/evidencias?tipo=fotografica" \
  -H 'Authorization: Bearer TOKEN' \
  -F 'archivo=@foto.jpg'

# Eliminar evidencia (solo Administrador)
curl -X DELETE http://localhost:3000/api/evidencias/123 \
  -H 'Authorization: Bearer TOKEN'
```

### Respaldo

```bash
# Estado del respaldo
curl -X GET http://localhost:3000/api/backup/status \
  -H 'Authorization: Bearer TOKEN'

# Ejecutar respaldo manual (mueve evidencias locales a B2 y actualiza ubicacion_almacenamiento)
curl -X POST http://localhost:3000/api/respaldar \
  -H 'Authorization: Bearer TOKEN'

# Consultar el log completo de respaldos
curl -X GET http://localhost:3000/api/backup/logs \
  -H 'Authorization: Bearer TOKEN'
```

Para la referencia completa de endpoints, revisar los controladores y servicios en `src/controllers` y `src/services`.

## Variables de configuración

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PORT` | Puerto en el que escucha el servidor | `3000` |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | (requerido) |
| `JWT_SECRET` | Clave para firmar y verificar tokens JWT | (requerido) |
| `B2_BUCKET_NAME` | Nombre del bucket de Backblaze B2 | (requerido) |
| `B2_ENDPOINT` | Endpoint S3-compatible de B2 | (requerido) |
| `B2_REGION` | Región del bucket | (requerido) |
| `B2_KEY_ID` | Key ID de la aplicación B2 | (requerido) |
| `B2_APPLICATION_KEY` | Application key de B2 | (requerido) |
| `B2_PRESIGNED_URL_EXPIRY` | Expiración en segundos de las URLs firmadas | `900` |
| `BACKUP_PATH` | Ruta local para respaldos temporales | `./backups` |
| `DISK_CHECK_THRESHOLD` | Umbral de uso de disco (%) para alertas de respaldo | `80` |
| `BACKUP_SCHEDULE_CRON` | Cron para respaldos automáticos programados | (no definido) |

## Estado actual del proyecto y pendientes conocidos

- Endpoints de restauración de respaldo, configuración de nube y respaldo programado (cron) aún no existen; bloquean tres acciones en la pantalla de Respaldo del frontend.
- Ajustes pendientes en el módulo de evidencias: `tipo` como query param en la carga, eliminación por `/:id`, corrección de permisos de borrado.
- Dos campos booleanos del modelo `checklist` (`a` y `t`) están sin identificar semánticamente; pendiente de aclarar con la empresa.
- El límite de 200 entradas en el log de respaldo (JSON) puede requerir revisión si el volumen de operaciones crece.
- Falta mostrar en la tabla de log de respaldo la columna `Usuario`, aunque el dato ya existe en backend.
- Revisar posible inconsistencia de nombres de carpetas: `middleware` vs `middlewares`.

## Requisitos no funcionales relevantes

- Tiempo de respuesta esperado menor a 2 segundos en operaciones principales dentro de la red local.
- Debe soportar múltiples conexiones simultáneas en la LAN sin degradación notable.
- Las funciones críticas (ingreso, seguimiento, salida) deben operar mientras la red local y el almacenamiento estén disponibles, sin depender de internet salvo para el respaldo en nube.

## Estructura del proyecto

```
monitor830-backend/
├── src/
│   ├── controllers/       # Lógica de entrada por endpoint (funciones nombradas)
│   ├── services/           # Lógica de negocio y acceso a datos vía Prisma
│   ├── middleware/          # verificarToken, soloAdmin, soloAdminOOperador
│   ├── config/              # prisma.js (instancia de PrismaClient), config de B2
│   ├── types/               # Interfaces TypeScript (formatos.ts, AuthRequest, etc.)
│   └── routes/              # Definición de rutas Express
├── prisma/
│   └── schema.prisma        # Esquema fijado a Prisma 5.22.0
├── db/
│   └── monitor.sql          # Respaldo del esquema en SQL plano
├── dist/                    # Salida compilada (ESM, con extensiones .js en imports)
└── .env
```

Nota: revisar si en el repo actual coexisten `middleware` y `middlewares` como nombres de carpeta; es una inconsistencia detectada pendiente de unificar.

## Scripts disponibles

| Script | Descripción |
|---|---|
| `pnpm dev` | Levanta el servidor en modo desarrollo con recarga |
| `pnpm build` | Compila TypeScript a `dist/` |
| `pnpm start` | Ejecuta la build compilada (`node dist/index.js`) |
| `pnpm prisma generate` | Regenera el cliente de Prisma tras cambios en el schema |
| `pnpm prisma migrate dev` | Crea y aplica una nueva migración en desarrollo |
| `pnpm prisma migrate deploy` | Aplica migraciones existentes en producción |
| `pnpm prisma studio` | Explorador visual de la base de datos |

## Arquitectura general

Monitor830 sigue una separación clara entre backend (Node.js/Express, lógica de negocio y persistencia) y frontend (React Native + Expo, interfaz de usuario), comunicados por HTTP/JSON dentro de una red LAN local. El almacenamiento de evidencias es híbrido: local durante la operación diaria y en nube (Backblaze B2) tras el respaldo, sin depender de conexión a internet para las funciones críticas de ingreso, seguimiento y salida.

```
[App móvil Android / Web (React Native + Expo)]
              │  HTTP/JSON (LAN)
              ▼
[Backend Express + TypeScript ESM]
      │                    │
      ▼                    ▼
[PostgreSQL vía Prisma]   [Backblaze B2 (S3-compatible)]
```

## Roadmap (requisitos futuros del ERS)

Funcionalidades contempladas para versiones posteriores, fuera del alcance de la estadía actual:

- Sistema de notificaciones por cambios de estado, fechas de entrega o actualización de expedientes.
- Soporte para múltiples sucursales (actualmente el sistema está acotado a la sede de Aguascalientes).
- Firma digital y validación de documentos.
- Panel de estadísticas operativas (tiempos de entrega, siniestrados atendidos, estados de unidades).
- Módulo de seguimiento fotográfico cronológico del progreso de restauración.

## Alcance explícito (lo que el sistema no hace)

- No gestiona pagos, facturación ni procesos contables.
- No sustituye las decisiones operativas del personal administrativo o técnico.
- No permite acceso público; solo usuarios autorizados.
- No hace monitoreo en tiempo real de los tractocamiones, solo cambio de estado informativo.
- No gestiona inventarios, refacciones ni herramientas de restauración.
- No funciona como canal de comunicación externa con clientes o aseguradoras.

## Contacto y créditos

- **Desarrollo**: Carlos Santiago Delgado Oliva
- **Asesor académico**: Francisco Javier Huerta Juárez (Universidad Tecnológica de Aguascalientes)
- **Asesora organizacional**: Rocío Abilene Jiménez Jasso (Tractoreconstrucciones San Quintín S.A. de C.V.)
- **Metodología**: Scrum, con requisitos documentados bajo IEEE 830-1998

## Licencia

Uso interno para Tractoreconstrucciones San Quintín S.A. de C.V.
