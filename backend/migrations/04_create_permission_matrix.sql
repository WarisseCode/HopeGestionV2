-- Create permission_matrix table (Distinct from existing RBAC tables)
CREATE TABLE IF NOT EXISTS permission_matrix (
    role VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    can_read BOOLEAN DEFAULT FALSE,
    can_write BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_validate BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (role, module)
);

-- Seed defaults
INSERT INTO permission_matrix (role, module, can_read, can_write, can_delete, can_validate)
VALUES 
-- ADMIN
('admin', 'dashboard', TRUE, TRUE, TRUE, TRUE),
('admin', 'biens', TRUE, TRUE, TRUE, TRUE),
('admin', 'locataires', TRUE, TRUE, TRUE, TRUE),
('admin', 'finance', TRUE, TRUE, TRUE, TRUE),
('admin', 'users', TRUE, TRUE, TRUE, TRUE),
('admin', 'owners', TRUE, TRUE, TRUE, TRUE),

-- GESTIONNAIRE
('gestionnaire', 'dashboard', TRUE, FALSE, FALSE, FALSE),
('gestionnaire', 'biens', TRUE, TRUE, FALSE, FALSE),
('gestionnaire', 'locataires', TRUE, TRUE, FALSE, FALSE),
('gestionnaire', 'finance', TRUE, FALSE, FALSE, FALSE),
('gestionnaire', 'users', FALSE, FALSE, FALSE, FALSE),
('gestionnaire', 'owners', TRUE, FALSE, FALSE, FALSE),

-- MANAGER
('manager', 'dashboard', TRUE, TRUE, FALSE, TRUE),
('manager', 'biens', TRUE, TRUE, TRUE, TRUE),
('manager', 'locataires', TRUE, TRUE, TRUE, TRUE),
('manager', 'finance', TRUE, TRUE, FALSE, TRUE),
('manager', 'users', TRUE, TRUE, FALSE, FALSE),
('manager', 'owners', TRUE, TRUE, FALSE, TRUE)
ON CONFLICT (role, module) DO NOTHING;
