"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = __importDefault(require("../db/database"));
// import { sendEmail } from '../utils/emailSender'; // To be implemented or mocked
// import { sendSMS } from '../utils/smsSender';     // To be implemented or mocked
class CronService {
    static init() {
        console.log('Initializing Cron Service...');
        // Run every day at 8:00 AM - Calendar reminders
        node_cron_1.default.schedule('0 8 * * *', async () => {
            console.log('Running daily reminder check...');
            await this.checkReminders();
        });
        // Run every 2 hours - Intervention alerts
        node_cron_1.default.schedule('0 */2 * * *', async () => {
            console.log('Running intervention alerts check...');
            await this.checkInterventionAlerts();
            await this.checkTaskAlerts();
        });
    }
    static async checkTaskAlerts() {
        try {
            const overdueTasks = await database_1.default.query(`SELECT t.id, t.title, t.due_date, u.nom as assigned_name
                 FROM tasks t
                 LEFT JOIN users u ON t.assigned_to = u.id
                 WHERE t.due_date < NOW() 
                 AND t.status != 'done'`);
            overdueTasks.rows.forEach(task => {
                console.log(`[ALERTE TÂCHE] Tâche #${task.id} en retard: "${task.title}" (Assigné à: ${task.assigned_name || 'Personne'})`);
                // TODO: Notification Logic
            });
        }
        catch (error) {
            console.error('Error checking task alerts:', error);
        }
    }
    static async checkInterventionAlerts() {
        try {
            // 1. Urgent tickets not treated for > 24h
            const urgentResult = await database_1.default.query(`SELECT t.id, t.titre, t.description, t.date_creation, b.nom as building_name
                 FROM tickets t
                 LEFT JOIN lots l ON t.lot_id = l.id
                 LEFT JOIN buildings b ON l.building_id = b.id
                 WHERE t.priorite = 'Urgente' 
                 AND t.statut = 'Ouvert'
                 AND t.date_creation < NOW() - INTERVAL '24 hours'`);
            urgentResult.rows.forEach(ticket => {
                console.log(`[ALERTE URGENTE] Ticket #${ticket.id} (${ticket.building_name}) non traité depuis >24h: ${ticket.titre}`);
                // TODO: Send SMS/WhatsApp/Email to gestionnaire
            });
            // 2. Overdue interventions (scheduled_date passed, not closed)
            const overdueResult = await database_1.default.query(`SELECT t.id, t.titre, t.scheduled_date, p.name as provider_name, b.nom as building_name
                 FROM tickets t
                 LEFT JOIN providers p ON t.provider_id = p.id
                 LEFT JOIN lots l ON t.lot_id = l.id
                 LEFT JOIN buildings b ON l.building_id = b.id
                 WHERE t.scheduled_date < NOW()
                 AND t.statut NOT IN ('Clos', 'Résolu')`);
            overdueResult.rows.forEach(ticket => {
                console.log(`[ALERTE RETARD] Intervention #${ticket.id} en retard (prévue: ${ticket.scheduled_date}). Prestataire: ${ticket.provider_name}`);
                // TODO: Send notification
            });
            console.log(`Checked: ${urgentResult.rows.length} urgent, ${overdueResult.rows.length} overdue`);
        }
        catch (error) {
            console.error('Error checking intervention alerts:', error);
        }
    }
    static async checkReminders() {
        try {
            // 1. Get all active settings
            const settingsResult = await database_1.default.query('SELECT * FROM reminder_settings WHERE active = TRUE');
            const settings = settingsResult.rows;
            if (settings.length === 0)
                return;
            // 2. For each setting, find matching events
            for (const setting of settings) {
                // Determine target date based on delay
                // delay_days = -7 means we look for events starting in 7 days
                // target_date = now + 7 days
                // Note: This logic is simplified. Correct way:
                // If delay is -7, we want events where start_date = today + 7
                // We format dates to YYYY-MM-DD to compare
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + Math.abs(setting.delay_days));
                // Note: if delay is positive (after event), logic differs, assuming negative for "reminder before"
                const targetDateStr = targetDate.toISOString().split('T')[0];
                if (setting.event_type === 'payment') {
                    // Check Leases with matching due day (approx)
                    // This creates a complex query, for MVP we mock log
                    console.log(`[Mock] Check payment reminders for user ${setting.user_id} on ${targetDateStr} via ${setting.channel}`);
                }
                else if (setting.event_type === 'contract_end') {
                    const leases = await database_1.default.query(`SELECT l.id, t.nom, t.prenoms FROM leases l 
                          JOIN tenants t ON l.tenant_id = t.id
                          WHERE l.date_fin = $1 AND l.owner_id IN (SELECT owner_id FROM owner_user WHERE user_id = $2)`, [targetDateStr, setting.user_id]);
                    leases.rows.forEach(l => {
                        console.log(`[NOTIFICATION] Remind user ${setting.user_id}: Lease ending for ${l.nom} on ${targetDateStr} via ${setting.channel}`);
                    });
                }
                else if (setting.event_type === 'custom') {
                    // Check custom events
                    const events = await database_1.default.query(`SELECT * FROM calendar_events 
                          WHERE user_id = $1 AND start_date::date = $2`, [setting.user_id, targetDateStr]);
                    events.rows.forEach(e => {
                        console.log(`[NOTIFICATION] Remind user ${setting.user_id}: Event "${e.title}" on ${targetDateStr} via ${setting.channel}`);
                    });
                }
            }
        }
        catch (error) {
            console.error('Error in CronService:', error);
        }
    }
}
exports.CronService = CronService;
