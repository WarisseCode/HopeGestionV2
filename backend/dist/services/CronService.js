"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = __importDefault(require("../db/database"));
const notificationService_1 = require("./notificationService");
class CronService {
    static init() {
        console.log('Initializing Cron Service...');
        // Chaque jour à 8h — rappels calendrier
        node_cron_1.default.schedule('0 8 * * *', async () => {
            console.log('[CRON] Vérification rappels calendrier...');
            await this.checkReminders();
        });
        // Toutes les 2h — alertes interventions et tâches
        node_cron_1.default.schedule('0 */2 * * *', async () => {
            console.log('[CRON] Vérification alertes interventions et tâches...');
            await this.checkInterventionAlerts();
            await this.checkTaskAlerts();
        });
    }
    // ─── Tâches en retard ────────────────────────────────────────────────────
    static async checkTaskAlerts() {
        try {
            const overdueTasks = await database_1.default.query(`SELECT t.id, t.title, t.due_date,
                        t.assigned_to,
                        t.created_by,
                        u.nom as assigned_name
                 FROM tasks t
                 LEFT JOIN users u ON t.assigned_to = u.id
                 WHERE t.due_date < NOW()
                   AND t.status != 'done'`);
            for (const task of overdueTasks.rows) {
                const dueDate = new Date(task.due_date).toLocaleDateString('fr-FR');
                // Notifier l'assigné (si différent du créateur)
                if (task.assigned_to) {
                    await notificationService_1.NotificationService.send(task.assigned_to, 'Tâche en retard', `La tâche "${task.title}" était due le ${dueDate} et n'est pas encore terminée.`, 'warning', 'task_overdue');
                }
                // Notifier le créateur si différent de l'assigné
                if (task.created_by && task.created_by !== task.assigned_to) {
                    await notificationService_1.NotificationService.send(task.created_by, 'Tâche en retard', `La tâche "${task.title}" assignée à ${task.assigned_name || 'un collaborateur'} était due le ${dueDate}.`, 'warning', 'task_overdue');
                }
            }
            if (overdueTasks.rows.length > 0) {
                console.log(`[CRON] ${overdueTasks.rows.length} tâche(s) en retard — notifications envoyées.`);
            }
        }
        catch (error) {
            console.error('[CRON] Erreur checkTaskAlerts:', error);
        }
    }
    // ─── Alertes interventions ────────────────────────────────────────────────
    static async checkInterventionAlerts() {
        try {
            // 1. Tickets urgents non traités depuis plus de 24h
            const urgentResult = await database_1.default.query(`SELECT t.id, t.titre, t.date_creation,
                        b.nom as building_name,
                        ou.user_id as gestionnaire_id
                 FROM tickets t
                 LEFT JOIN lots l ON t.lot_id = l.id
                 LEFT JOIN buildings b ON l.building_id = b.id
                 LEFT JOIN owner_user ou ON l.owner_id = ou.owner_id AND ou.is_active = TRUE
                 WHERE t.priorite = 'Urgente'
                   AND t.statut = 'Ouvert'
                   AND t.date_creation < NOW() - INTERVAL '24 hours'`);
            for (const ticket of urgentResult.rows) {
                if (ticket.gestionnaire_id) {
                    await notificationService_1.NotificationService.send(ticket.gestionnaire_id, 'Ticket urgent non traité', `Le ticket #${ticket.id} "${ticket.titre}" (${ticket.building_name}) est ouvert depuis plus de 24h.`, 'error', 'ticket_urgent');
                }
            }
            // 2. Interventions dont la date planifiée est dépassée
            const overdueResult = await database_1.default.query(`SELECT t.id, t.titre, t.scheduled_date,
                        p.name as provider_name,
                        b.nom as building_name,
                        ou.user_id as gestionnaire_id
                 FROM tickets t
                 LEFT JOIN providers p ON t.provider_id = p.id
                 LEFT JOIN lots l ON t.lot_id = l.id
                 LEFT JOIN buildings b ON l.building_id = b.id
                 LEFT JOIN owner_user ou ON l.owner_id = ou.owner_id AND ou.is_active = TRUE
                 WHERE t.scheduled_date < NOW()
                   AND t.statut NOT IN ('Clos', 'Résolu')`);
            for (const ticket of overdueResult.rows) {
                if (ticket.gestionnaire_id) {
                    const scheduled = new Date(ticket.scheduled_date).toLocaleDateString('fr-FR');
                    await notificationService_1.NotificationService.send(ticket.gestionnaire_id, 'Intervention en retard', `L'intervention #${ticket.id} "${ticket.titre}" prévue le ${scheduled} chez ${ticket.provider_name || 'prestataire inconnu'} n'est pas clôturée.`, 'warning', 'intervention_overdue');
                }
            }
            console.log(`[CRON] Interventions — ${urgentResult.rows.length} urgent(s), ${overdueResult.rows.length} en retard.`);
        }
        catch (error) {
            console.error('[CRON] Erreur checkInterventionAlerts:', error);
        }
    }
    // ─── Rappels calendrier ───────────────────────────────────────────────────
    static async checkReminders() {
        try {
            const settingsResult = await database_1.default.query('SELECT * FROM reminder_settings WHERE active = TRUE');
            const settings = settingsResult.rows;
            if (settings.length === 0)
                return;
            for (const setting of settings) {
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + Math.abs(setting.delay_days));
                const targetDateStr = targetDate.toISOString().split('T')[0];
                if (setting.event_type === 'contract_end') {
                    const leases = await database_1.default.query(`SELECT l.id, t.nom, t.prenoms
                         FROM leases l
                         JOIN tenants t ON l.tenant_id = t.id
                         WHERE l.date_fin = $1
                           AND l.owner_id IN (
                               SELECT owner_id FROM owner_user WHERE user_id = $2 AND is_active = TRUE
                           )`, [targetDateStr, setting.user_id]);
                    for (const lease of leases.rows) {
                        await notificationService_1.NotificationService.send(setting.user_id, 'Fin de bail imminente', `Le bail de ${lease.nom} ${lease.prenoms} arrive à échéance le ${targetDateStr}.`, 'warning', 'contract_end');
                    }
                }
                else if (setting.event_type === 'custom') {
                    const events = await database_1.default.query(`SELECT * FROM calendar_events
                         WHERE user_id = $1 AND start_date::date = $2`, [setting.user_id, targetDateStr]);
                    for (const evt of events.rows) {
                        await notificationService_1.NotificationService.send(setting.user_id, 'Rappel événement', `Rappel : "${evt.title}" est prévu le ${targetDateStr}.`, 'info', 'custom_event');
                    }
                }
            }
        }
        catch (error) {
            console.error('[CRON] Erreur checkReminders:', error);
        }
    }
}
exports.CronService = CronService;
