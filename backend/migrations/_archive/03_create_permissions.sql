-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    role VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    can_read BOOLEAN DEFAULT FALSE,
    can_write BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_validate BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (role, module)
);

-- Insert default permissions for 'admin' (All access)
INSERT INTO role_permissions (role, module, can_read, can_write, can_delete, can_validate)
VALUES 
('admin', 'dashboard', TRUE, TRUE, TRUE, TRUE),
('admin', 'biens', TRUE, TRUE, TRUE, TRUE),
('admin', 'locataires', TRUE, TRUE, TRUE, TRUE),
('admin', 'finance', TRUE, TRUE, TRUE, TRUE),
('admin', 'users', TRUE, TRUE, TRUE, TRUE),
('admin', 'owners', TRUE, TRUE, TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- Insert default permissions for 'gestionnaire' (Standard usage)
INSERT INTO role_permissions (role, module, can_read, can_write, can_delete, can_validate)
VALUES 
('gestionnaire', 'dashboard', TRUE, FALSE, FALSE, FALSE),
('gestionnaire', 'biens', TRUE, TRUE, FALSE, FALSE),
('gestionnaire', 'locataires', TRUE, TRUE, FALSE, FALSE),
('gestionnaire', 'finance', TRUE, TRUE, FALSE, FALSE),
('gestionnaire', 'users', FALSE, FALSE, FALSE, FALSE),
('gestionnaire', 'owners', TRUE, FALSE, FALSE, FALSE)
ON CONFLICT DO NOTHING;

-- Insert default permissions for 'manager' (Supervisor)
INSERT INTO role_permissions (role, module, can_read, can_write, can_delete, can_validate)
VALUES 
('manager', 'dashboard', TRUE, TRUE, FALSE, TRUE),
('manager', 'biens', TRUE, TRUE, TRUE, TRUE),
('manager', 'locataires', TRUE, TRUE, TRUE, TRUE),
('manager', 'finance', TRUE, TRUE, FALSE, TRUE),
('manager', 'users', TRUE, TRUE, FALSE, FALSE),
('manager', 'owners', TRUE, TRUE, FALSE, TRUE)
ON CONFLICT DO NOTHING;
