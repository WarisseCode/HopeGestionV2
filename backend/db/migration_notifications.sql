-- Migration: Notifications System
-- Date: 2025-12-31
-- Description: Adds centralized notifications table

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'info', 'success', 'warning', 'error'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255), -- Optional link to redirect user
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Insert some demo notifications for existing users
INSERT INTO notifications (user_id, type, title, message)
SELECT id, 'info', 'Bienvenue sur HopeGestion', 'Votre espace est configuré avec succès.'
FROM users
ON CONFLICT DO NOTHING;
