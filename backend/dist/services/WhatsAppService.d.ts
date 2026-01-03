export declare class WhatsAppService {
    private static client;
    private static isConfigured;
    static init(): void;
    /**
     * Send a WhatsApp message
     * @param to Recipient number (e.g., '+22966000000')
     * @param body Message content
     */
    static send(to: string, body: string): Promise<boolean>;
}
//# sourceMappingURL=WhatsAppService.d.ts.map