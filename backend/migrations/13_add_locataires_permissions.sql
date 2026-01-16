-- Add missing permissions for locataires module
INSERT INTO permission_matrix (role, module, can_read, can_write, can_delete, can_validate) VALUES
('proprietaire', 'locataires', true, true, false, false),
('locataire', 'locataires', true, false, false, false)
ON CONFLICT DO NOTHING;
