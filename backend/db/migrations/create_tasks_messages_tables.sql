-- backend/db/migrations/create_tasks_messages_tables.sql

-- 1. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(50), -- 'lot', 'ticket', 'common_area', etc.
    entity_id INT,
    assigned_to INT, -- User ID
    created_by INT, -- User ID
    priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, urgent
    status VARCHAR(50) DEFAULT 'todo', -- todo, in_progress, overdue, done
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 2. Messages Table (Centralized communication)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL, -- User ID
    recipient_id INT, -- User ID (nullable if room/context)
    context_type VARCHAR(50), -- 'task', 'ticket', 'general'
    context_id INT, -- Link to task_id or ticket_id
    channel VARCHAR(50) DEFAULT 'internal', -- internal, sms, whatsapp, email
    content TEXT,
    attachments JSONB DEFAULT '[]'::jsonb, -- URLs of photos/docs
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Notification Preferences (User settings)
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id INT PRIMARY KEY,
    preferred_channels JSONB DEFAULT '["email", "internal"]'::jsonb,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    alert_types JSONB DEFAULT '{"task_assigned": true, "task_overdue": true, "new_message": true}'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
