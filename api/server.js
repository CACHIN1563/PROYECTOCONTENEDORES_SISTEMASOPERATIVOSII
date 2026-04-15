const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de la conexión a la base de datos PostgreSQL
// Las variables de entorno son inyectadas por Docker Compose
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Endpoint: Obtener puntos de interés (soporta filtro por categoría y por proximidad geoespacial)
app.get('/api/pois', async (req, res) => {
  try {
    const { category, lat, lng, radius } = req.query;
    
    // Consulta base usando ST_Y y ST_X para extraer latitud y longitud legibles
    let query = `
      SELECT id, name, description, category, 
             ST_Y(location::geometry) as lat, 
             ST_X(location::geometry) as lng
      FROM points_of_interest
    `;
    let queryParams = [];
    let conditions = [];

    // Filtro por categoría (ej. Cultural)
    if (category) {
      queryParams.push(category);
      conditions.push(`category = $${queryParams.length}`);
    }

    // Filtro geoespacial (ST_DWithin usa metros cuando se compara con GEOGRAPHY)
    if (lat && lng && radius) {
      queryParams.push(lng, lat, radius);
      let idxLng = queryParams.length - 2;
      let idxLat = queryParams.length - 1;
      let idxRad = queryParams.length;
      
      // Hacemos cast a 'geography' para que la distancia del radio se mida en metros
      conditions.push(`ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($${idxLng}, $${idxLat}), 4326)::geography, $${idxRad})`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error('Error en GET /api/pois:', err);
    res.status(500).json({ error: 'Error interno del servidor de la base de datos' });
  }
});

// Endpoint: Crear un nuevo punto de interés
app.post('/api/pois', async (req, res) => {
  try {
    const { name, description, category, lat, lng } = req.body;
    
    if (!name || !category || !lat || !lng) {
      return res.status(400).json({ error: 'Faltan campos requeridos (name, category, lat, lng)' });
    }

    // ST_SetSRID asigna el sistema de coordenadas WGS84 (4326)
    // Se inserta con el orden Longitud, Latitud
    const query = `
      INSERT INTO points_of_interest (name, description, category, location)
      VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326))
      RETURNING id, name, description, category, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
    `;
    
    const values = [name, description, category, lng, lat];
    const result = await pool.query(query, values);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error en POST /api/pois:', err);
    res.status(500).json({ error: 'Error interno guardando en la BD' });
  }
});

// Endpoint: Eliminar un punto de interés
app.delete('/api/pois/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM points_of_interest WHERE id = $1 RETURNING *', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Punto no encontrado' });
    }
    
    res.json({ message: 'Punto eliminado exitosamente', poi: result.rows[0] });
  } catch (err) {
    console.error('Error en DELETE /api/pois/:id:', err);
    res.status(500).json({ error: 'Error interno eliminando de la BD' });
  }
});

// Endpoint de prueba / ping
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Server funcionando en el puerto ${PORT}`);
});
