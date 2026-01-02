export type Operator = 'MTN' | 'MOOV' | 'CELTIPAY' | 'KKIAPAY' | 'FEDAPAY';
interface PaymentRequest {
    amount: number;
    phoneNumber: string;
    operator: Operator;
    transactionId?: string;
}
interface PaymentResponse {
    success: boolean;
    message: string;
    transactionId: string;
    status: 'pending' | 'success' | 'failed';
}
declare class MobileMoneyService {
    requestPayment(data: PaymentRequest): Promise<PaymentResponse>;
    checkStatus(transactionId: string): Promise<string>;
}
export declare const mobileMoneyService: MobileMoneyService;
export {};
//# sourceMappingURL=mobileMoneyService.d.ts.map