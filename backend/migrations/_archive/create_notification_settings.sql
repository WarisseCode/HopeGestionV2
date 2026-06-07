-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- e.g., 'PAYMENT_REMINDER', 'INTERVENTION', 'LEASE_EXPIRY'
    channel_email BOOLEAN DEFAULT TRUE,
    channel_whatsapp BOOLEAN DEFAULT FALSE,
    channel_sms BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, alert_type)
);

-- Index for faster lookups
CREATE INDEX idx_notification_settings_user ON notification_settings(user_id);
