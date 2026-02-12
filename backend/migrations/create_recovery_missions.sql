-- Missions de Recouvrement (Impaiements)
CREATE TABLE IF NOT EXISTS recovery_missions (
    id SERIAL PRIMARY KEY,
    lease_id INT REFERENCES leases(id) ON DELETE CASCADE,
    agent_id INT REFERENCES users(id) ON DELETE SET NULL, -- Agent Recouvreur
    payment_schedule_id INT REFERENCES payment_schedules(id) ON DELETE CASCADE, -- Lien direct vers l'échéance impayée

    status VARCHAR(50) DEFAULT 'open', -- open, assigned, in_progress, resolved, escalated
    priority VARCHAR(20) DEFAULT 'normal', -- normal, high, critical

    amount_due DECIMAL(12, 2) NOT NULL, -- Montant à recouvrer

    assigned_at TIMESTAMP,
    resolved_at TIMESTAMP,

    last_contact_date TIMESTAMP,
    next_action_date TIMESTAMP,

    notes TEXT, -- Historique des actions

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_recovery_agent ON recovery_missions(agent_id);
CREATE INDEX IF NOT EXISTS idx_recovery_status ON recovery_missions(status);
