export declare class NotificationService {
    /**
     * Send a notification to a user (DB + External if needed)
     */
    static send(userId: number, title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error'): Promise<any>;
    /**
     * Simulate sending a WhatsApp message via provider (Twilio/Meta)
     */
    static sendWhatsApp(phone: string, message: string): Promise<{
        success: boolean;
        simulated: boolean;
    }>;
    /**
     * Mark notification as read
     */
    static markAsRead(id: number): Promise<void>;
    /**
     * Mark all for user as read
     */
    static markAllRead(userId: number): Promise<void>;
}
//# sourceMappingURL=notificationService.d.ts.map