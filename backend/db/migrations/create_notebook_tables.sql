-- backend/db/migrations/create_notebook_tables.sql

CREATE TABLE IF NOT EXISTS notebook_notes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL, -- Created by
    title VARCHAR(255),
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'note', -- 'note', 'reminder', 'observation'
    entity_type VARCHAR(50), -- 'bien', 'lot', 'locataire'
    entity_id INT,
    visibility VARCHAR(20) DEFAULT 'private', -- 'private', 'shared'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notebook_contacts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100), -- 'plombier', 'syndic'
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notebook_field_actions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'visite', 'intervention', 'check'
    description TEXT,
    photo_url TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'done'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
