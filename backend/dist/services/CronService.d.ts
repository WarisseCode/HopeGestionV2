export declare class CronService {
    /**
     * Initialize all scheduled jobs
     */
    static init(): void;
    /**
     * Check for active leases that haven't paid rent for the current month
     * Triggered if current day > 5 (or custom due date)
     */
    static checkLatePayments(force?: boolean): Promise<void>;
    /**
     * Check for leases ending in exactly 30 days
     */
    static checkLeaseExpirations(): Promise<void>;
}
//# sourceMappingURL=CronService.d.ts.map