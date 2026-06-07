-- backend/db/migrations/create_document_templates.sql

CREATE TABLE IF NOT EXISTS document_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'lease', 'receipt', 'notice', 'other'
    content TEXT NOT NULL, -- The text content with {{Placeholders}}
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some default templates
INSERT INTO document_templates (name, type, content, is_default) VALUES 
('Contrat de Location Standard', 'lease', 'CONTRAT DE BAIL\n\nEntre les soussignés :\n\nLE BAILLEUR : {{OwnerName}}\nReprésenté par l''agence HopeImmo\n\nET\n\nLE PRENEUR : {{TenantName}}\n\nIL A ÉTÉ CONVENU CE QUI SUIT :\n\nLe Bailleur donne en location le bien situé à : {{PropertyAddress}}.\n\nLoyer mensuel : {{RentAmount}} FCFA.\nDate début : {{StartDate}}.\n', TRUE),
('Quittance de Loyer Simple', 'receipt', 'QUITTANCE DE LOYER\n\nPériode : {{Period}}\n\nReçu de M/Mme {{TenantName}}\nLa somme de {{Amount}} FCFA\nPour le loyer du bien situé à : {{PropertyAddress}}.\n\nFait le {{Date}}.', TRUE);
