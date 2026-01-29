export type PaymentOperator = 'mtn' | 'moov';
export interface SubscriptionPlanInfo {
    planId: number;
    planName: string;
    planType: string;
    durationMonths: number;
}
export interface CreatePaymentRequest {
    userId: number;
    userEmail: string;
    userPhone: string;
    userName: string;
    amount: number;
    operator: PaymentOperator;
    plan: SubscriptionPlanInfo;
    internalReference?: string;
}
export interface PaymentResult {
    success: boolean;
    message: string;
    transactionId: string | null;
    paymentUrl: string | null;
    status: 'pending' | 'approved' | 'declined' | 'cancelled' | 'error';
    rawResponse?: any;
}
export interface WebhookPayload {
    entity: string;
    name: string;
    object: {
        id: number;
        klass: string;
        reference: string;
        amount: number;
        description: string;
        status: string;
        mode: string;
        custom_metadata?: {
            user_id?: string;
            plan_id?: string;
            plan_name?: string;
            plan_type?: string;
            internal_ref?: string;
        };
        customer?: {
            id: number;
            email: string;
            phone_number?: {
                number: string;
                country: string;
            };
        };
        created_at: string;
        updated_at: string;
    };
}
declare const log: {
    info: (context: string, message: string, data?: any) => void;
    error: (context: string, message: string, error?: any) => void;
    warn: (context: string, message: string, data?: any) => void;
};
declare class FedaPayService {
    /**
     * Create a payment transaction and get a payment URL
     * User will be redirected to FedaPay to complete payment
     */
    createPaymentTransaction(request: CreatePaymentRequest): Promise<PaymentResult>;
    /**
     * Check transaction status by ID
     */
    getTransactionStatus(transactionId: string): Promise<{
        status: string;
        transaction?: any;
    }>;
    /**
     * Validate webhook payload structure
     */
    validateWebhookPayload(payload: any): payload is WebhookPayload;
    /**
     * Extract metadata from webhook payload
     */
    extractMetadataFromWebhook(payload: WebhookPayload): {
        userId: number | null;
        planId: number | null;
        planName: string | null;
        planType: string | null;
        durationMonths: number | null;
        internalRef: string | null;
    };
    /**
     * Calculate subscription end date based on plan duration
     */
    calculateEndDate(startDate: Date, durationMonths: number): Date;
}
export declare const fedapayService: FedaPayService;
export { log as fedapayLogger };
//# sourceMappingURL=fedapayService.d.ts.map