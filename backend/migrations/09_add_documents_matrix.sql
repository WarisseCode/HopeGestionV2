-- Ajout des permissions pour le module 'documents'
DELETE FROM permission_matrix WHERE module = 'documents';

INSERT INTO permission_matrix (role, module, can_read, can_write, can_delete, can_validate) VALUES
('admin', 'documents', true, true, true, true),
('gestionnaire', 'documents', true, true, true, true),
('proprietaire', 'documents', true, true, true, false),
('locataire', 'documents', true, true, true, false);
