-- backend/db/migrations/create_calendar_tables.sql

CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL, -- Creator
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    type VARCHAR(50) DEFAULT 'event', -- 'event', 'rdv', 'rappel', 'payment', 'contract'
    entity_type VARCHAR(50), -- 'bien', 'lot', 'locataire', 'ticket'
    entity_id INT,
    is_all_day BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminder_settings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'payment', 'contract_end', 'custom'
    delay_days INT NOT NULL, -- e.g., -7 (7 days before), 0 (on day), 1 (1 day after)
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'whatsapp'
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings for common events
-- This might need to be done per user on signup, but here is a template or we insert for existing users manually if needed.
-- For now, we leave it empty, settings will be created on demand or lazily.
