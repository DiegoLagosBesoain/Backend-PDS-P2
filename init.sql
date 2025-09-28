-- init.sql
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS elements CASCADE;
DROP TABLE IF EXISTS components CASCADE;
DROP TABLE IF EXISTS processes CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS simulations CASCADE;
-- Tabla de proyectos
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  firebase_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE,
  display_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  name VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabla de procesos
CREATE TABLE IF NOT EXISTS processes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE
);

-- Tabla de componentes
CREATE TABLE IF NOT EXISTS components (
  id UUID PRIMARY KEY,
  process_id UUID REFERENCES processes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT,
  pos_x NUMERIC,
  pos_y NUMERIC,
  params JSONB DEFAULT '{}'
);

-- Tabla de conexiones
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY,
  process_id UUID REFERENCES processes(id) ON DELETE CASCADE,
  from_component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  to_component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  sourceHandle TEXT,
  targetHandle TEXT,
  markerEnd JSONB DEFAULT '{"type":"arrow","width":12,"height":12,"color":"#000"}'
);

-- Tabla de elementos
CREATE TABLE IF NOT EXISTS elements (
  id UUID PRIMARY KEY,
  project_id SERIAL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  params JSONB DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS simulations (
  id UUID PRIMARY KEY,
  process_id UUID REFERENCES processes(id) ON DELETE CASCADE, -- o UUID según tu projects.id
  process_def JSONB NOT NULL,
  duration INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  results JSONB DEFAULT '{}' ,
  stats JSONB DEFAULT '{}' 
);

