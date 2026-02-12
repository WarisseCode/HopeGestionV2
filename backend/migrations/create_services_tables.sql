-- Catalogue des services (Ménage, Gardiennage, Nounou, Transport)
CREATE TABLE IF NOT EXISTS service_catalog (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_base DECIMAL(12, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'heure', -- heure, jour, forfait
    category VARCHAR(50) NOT NULL, -- cleaning, security, childcare, transport
    is_active BOOLEAN DEFAULT TRUE,
    provider_id INT REFERENCES providers(id) ON DELETE SET NULL, -- Default provider if any
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Réservations de services par les locataires
CREATE TABLE IF NOT EXISTS service_bookings (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    service_id INT REFERENCES service_catalog(id) ON DELETE RESTRICT,
    lot_id INT REFERENCES lots(id) ON DELETE SET NULL,
    booking_date TIMESTAMP NOT NULL, -- Date souhaitée
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, completed, cancelled
    total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, paid
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
