# Sistema de Registro de Puntos de Interés Geoespacial
### Proyecto 2 — Sistemas Operativos 2

Aplicación web basada en microservicios contenerizados para registrar, visualizar, filtrar y consultar puntos de interés utilizando datos geoespaciales reales. Todo el sistema corre localmente con Docker Compose, sin necesidad de servicios externos.

---

## Arquitectura

```
                        ┌─────────────────────────────────┐
 Navegador Web   ──────▶│  Nginx (Proxy Reverso) :80      │
                        │  Contenedor: so2_proxy           │
                        └────────┬───────────────┬─────────┘
                                 │               │
                    GET /        │               │ /api/*
                    (HTML/JS)    │               ▼
                                 │    ┌──────────────────────┐
                                 │    │  Node.js + Express   │
                                 │    │  Contenedor: so2_api │
                                 │    └──────────┬───────────┘
                                 │               │ SQL (TCP 5432)
                                 │               ▼
                                 │    ┌──────────────────────┐
                                 │    │  PostgreSQL + PostGIS│
                                 │    │  Contenedor: so2_db  │
                                 │    └──────────┬───────────┘
                                 │               │
                                 │         [Volumen: geo_db_data]
                                 │
                        ┌────────┘
                        │  Red Docker: geo_network_custom (bridge)
                        └────────────────────────────────────────
```

---

## Tecnologías Utilizadas

| Capa | Tecnología | Justificación |
|---|---|---|
| Base de datos | PostgreSQL 15 + PostGIS 3.3 | Estándar *de facto* para datos geoespaciales; funciones `ST_DWithin`, `ST_MakePoint`, índices GIST nativos |
| API Backend | Node.js 18 + Express | E/S asíncrona ideal para APIs REST que dependen de base de datos; pool de conexiones `pg` |
| Proxy / Frontend | Nginx Alpine + Leaflet.js | Alto rendimiento para archivos estáticos; proxy inverso elimina problemas de CORS |
| Contenerización | Docker + Docker Compose | Entorno reproducible, portátil y sin dependencias de host |

---

## Requisitos Previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y en ejecución
- Puertos **80** y **5432** libres en la máquina local

---

## Configuración

### 1. Clonar / descargar el proyecto

```bash
git clone <url-del-repositorio>
cd "Proyecto 2 Sistemas"
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

El archivo `.env` contiene los siguientes parámetros configurables:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `POSTGRES_USER` | `so2_user` | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | `so2_super_secret` | Contraseña de PostgreSQL |
| `POSTGRES_DB` | `geo_db` | Nombre de la base de datos |
| `API_PORT` | `3000` | Puerto interno de la API |
| `PROXY_PORT` | `80` | Puerto público del proxy (Nginx) |

---

## Ejecución

### Levantar el sistema completo

```bash
docker compose up -d --build
```

> La bandera `--build` reconstruye las imágenes si hay cambios en el código.  
> La bandera `-d` ejecuta los contenedores en segundo plano.

### Verificar que los servicios estén activos

```bash
docker compose ps
```

Resultado esperado (los 3 contenedores en estado `Up` o `healthy`):

```
NAME         IMAGE                       STATUS
so2_db       postgis/postgis:15-3.3      Up (healthy)
so2_api      proyecto2sistemas-api       Up
so2_proxy    nginx:alpine                Up
```

### Abrir en el navegador

👉 **http://localhost**

---

## Uso de la Aplicación

### Registrar un nuevo punto
1. Hacer clic en cualquier lugar del mapa → las coordenadas se capturan automáticamente
2. Rellenar **Nombre** y seleccionar una **Categoría**
3. Hacer clic en **＋ Guardar Punto**

### Filtrar por categoría
- Seleccionar una categoría en el menú **"Filtrar por Categoría"**
- El mapa y la lista se actualizan automáticamente

### Buscar por proximidad (radio)
1. Hacer clic en el mapa para definir el **centro de búsqueda**
2. Ingresar el **radio en kilómetros**
3. Hacer clic en **🔍 Buscar** — se dibuja el área de búsqueda y se muestran los puntos dentro

---

## Endpoints de la API

Base URL: `http://localhost/api`

### `GET /api/pois`

Obtener lista de puntos de interés. Soporta filtros opcionales.

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `category` | `string` | Filtra por categoría (ej. `Cultural`) |
| `lat` | `float` | Latitud del centro (para búsqueda por radio) |
| `lng` | `float` | Longitud del centro (para búsqueda por radio) |
| `radius` | `float` | Radio en **metros** (requiere `lat` y `lng`) |

**Ejemplos:**
```bash
# Todos los puntos
curl http://localhost/api/pois

# Solo culturales
curl "http://localhost/api/pois?category=Cultural"

# Puntos en radio de 2 km desde el centro de Guatemala
curl "http://localhost/api/pois?lat=14.6407&lng=-90.5133&radius=2000"
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "name": "Palacio Nacional de la Cultura",
    "description": "Sede del gobierno central de Guatemala y museo histórico.",
    "category": "Cultural",
    "lat": 14.643324,
    "lng": -90.513271
  }
]
```

---

### `POST /api/pois`

Registrar un nuevo punto de interés.

**Body (JSON):**

```json
{
  "name": "Nombre del lugar",
  "description": "Descripción opcional",
  "category": "Cultural",
  "lat": 14.6407,
  "lng": -90.5133
}
```

**Campos requeridos:** `name`, `category`, `lat`, `lng`

**Respuesta exitosa (201):**
```json
{
  "id": 6,
  "name": "Nombre del lugar",
  "description": "Descripción opcional",
  "category": "Cultural",
  "lat": 14.6407,
  "lng": -90.5133
}
```

---

### `DELETE /api/pois/:id`

Eliminar un punto de interés por su ID.

**Path Parameters:**
- `id`: ID único del punto a eliminar.

**Respuesta exitosa (200):**
```json
{
  "message": "Punto eliminado exitosamente",
  "poi": { ... }
}
```

---

### `GET /api/health`

Verificar que la API está activa.

```bash
curl http://localhost/api/health
# {"status":"ok","timestamp":"2026-04-14T..."}
```

---

## Detención y Limpieza

### Detener conservando los datos

```bash
docker compose down
```

### Detener Y eliminar la base de datos (⚠️ irreversible)

```bash
docker compose down -v
```

### Ver logs de los servicios

```bash
docker compose logs -f          # todos los servicios
docker compose logs -f api      # solo la API
docker compose logs -f db       # solo la base de datos
docker compose logs -f proxy    # solo Nginx
```

---

## Estructura del Proyecto

```
Proyecto 2 Sistemas/
├── .env                        ← Variables de entorno (no subir a git)
├── .env.example                ← Plantilla de variables de entorno
├── docker-compose.yml          ← Orquestación de los 3 servicios
├── README.md                   ← Este documento
├── INFORME_TECNICO.md          ← Informe técnico académico
│
├── api/
│   ├── Dockerfile              ← Imagen personalizada Node.js 18 Alpine
│   ├── package.json
│   └── server.js               ← API REST (Express + pg)
│
├── database/
│   └── init.sql                ← Script de inicialización y seed (5 puntos GT)
│
└── proxy/
    ├── nginx.conf              ← Configuración del proxy reverso
    └── html/
        ├── index.html          ← Interfaz de usuario (diseño dark mode)
        └── app.js              ← Lógica del mapa Leaflet.js
```

---

## Persistencia de Datos

Los datos de PostgreSQL sobreviven a reinicios de contenedores gracias al volumen Docker nombrado `geo_db_data`. Este volumen mapea el directorio interno `/var/lib/postgresql/data` del contenedor.

Al levantar el sistema por **primera vez**, el script `database/init.sql` se ejecuta automáticamente e inicializa:
1. La extensión **PostGIS**
2. La tabla `points_of_interest` con índice espacial **GIST**
3. **5 puntos de ejemplo** pre-cargados en la Ciudad de Guatemala

---

## Datos de Ejemplo (Seed)

| Nombre | Categoría | Coordenadas |
|---|---|---|
| Palacio Nacional de la Cultura | Cultural | 14.6433, -90.5133 |
| Kaminaljuyú | Arqueología | 14.6289, -90.5488 |
| Zoológico La Aurora | Entretenimiento | 14.5985, -90.5312 |
| Mercado Central | Comercial | 14.6407, -90.5126 |
| Catedral Metropolitana | Religión | 14.6421, -90.5117 |
