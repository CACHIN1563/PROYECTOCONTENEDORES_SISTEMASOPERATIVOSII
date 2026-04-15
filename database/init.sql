-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create table for Points of Interest
CREATE TABLE IF NOT EXISTS points_of_interest (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    -- Geography type representing a point with WGS 84 (SRID 4326)
    location geometry(Point, 4326) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for spatial queries
CREATE INDEX point_location_idx ON points_of_interest USING GIST (location);

-- Seed initial data (5 points of interest in Guatemala)
-- ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
-- Lon / Lat syntax is used here.
INSERT INTO points_of_interest (name, description, category, location) VALUES
('Palacio Nacional de la Cultura', 'Sede del gobierno central de Guatemala y museo histórico.', 'Cultural', ST_SetSRID(ST_MakePoint(-90.513271, 14.643324), 4326)),
('Kaminaljuyú', 'Sitio arqueológico maya prehispánico ubicado en la Ciudad de Guatemala.', 'Arqueología', ST_SetSRID(ST_MakePoint(-90.548777, 14.628860), 4326)),
('Zoológico La Aurora', 'Parque zoológico más grande de la ciudad con áreas verdes y especies diversas.', 'Entretenimiento', ST_SetSRID(ST_MakePoint(-90.531238, 14.598516), 4326)),
('Mercado Central', 'Lugar céntrico y subterráneo famoso por sus artesanías y comida típica guatemalteca.', 'Comercial', ST_SetSRID(ST_MakePoint(-90.512613, 14.640652), 4326)),
('Catedral Metropolitana', 'Principal iglesia católica en el centro histórico frente al parque central.', 'Religión', ST_SetSRID(ST_MakePoint(-90.511736, 14.642055), 4326));
