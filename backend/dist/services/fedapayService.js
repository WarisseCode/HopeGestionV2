"use strict";
// backend/services/fedapayService.ts
// FedaPay Payment Integration Service
// Expert Implementation with comprehensive logging, error handling, and metadata tracking
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.fedapayLogger = exports.fedapayService = void 0;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// FedaPay SDK (CommonJS style import for compatibility)
const FedaPay = require('fedapay').FedaPay;
const Transaction = require('fedapay').Transaction;
const Customer = require('fedapay').Customer;
// ============================================================================
// CONFIGURATION
// ============================================================================
const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY || '';
const FEDAPAY_MODE = process.env.FEDAPAY_MODE || 'sandbox';
const FEDAPAY_CALLBACK_URL = process.env.FEDAPAY_CALLBACK_URL || 'http://localhost:5000/api/webhooks/fedapay';
// URL where user is redirected AFTER payment (browser redirect, not webhook)
const FEDAPAY_RETURN_URL = process.env.FEDAPAY_RETURN_URL || 'http://localhost:5173/dashboard/abonnement';
// Initialize FedaPay SDK
if (FEDAPAY_SECRET_KEY) {
    FedaPay.setApiKey(FEDAPAY_SECRET_KEY);
    FedaPay.setEnvironment(FEDAPAY_MODE);
    console.log(`✅ [FedaPay] Service initialized in ${FEDAPAY_MODE.toUpperCase()} mode`);
}
else {
    console.warn('⚠️ [FedaPay] FEDAPAY_SECRET_KEY not configured. Payments will fail.');
}
// ============================================================================
// OPERATOR MAPPING
// ============================================================================
const OPERATOR_TO_FEDAPAY_MODE = {
    'mtn': 'mtn_open',
    'moov': 'moov_open'
};
// ============================================================================
// LOGGING UTILITY
// ============================================================================
const log = {
    info: (context, message, data) => {
        console.log(`[FedaPay][${context}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    error: (context, message, error) => {
        console.error(`[FedaPay][ERROR][${context}] ${message}`, error?.message || error || '');
    },
    warn: (context, message, data) => {
        console.warn(`[FedaPay][WARN][${context}] ${message}`, data || '');
    }
};
exports.fedapayLogger = log;
// ============================================================================
// SERVICE CLASS
// ============================================================================
class FedaPayService {
    /**
     * Create a payment transaction and get a payment URL
     * User will be redirected to FedaPay to complete payment
     */
    async createPaymentTransaction(request) {
        const context = 'CREATE_TRANSACTION';
        log.info(context, 'Initiating payment transaction', {
            userId: request.userId,
            amount: request.amount,
            operator: request.operator,
            plan: request.plan.planName
        });
        if (!FEDAPAY_SECRET_KEY) {
            log.error(context, 'FEDAPAY_SECRET_KEY not configured');
            return {
                success: false,
                message: 'Configuration FedaPay manquante',
                transactionId: null,
                paymentUrl: null,
                status: 'error'
            };
        }
        try {
            // In sandbox mode, don't force the payment mode - let user choose on FedaPay page
            // In production, we can specify the mode based on operator selection
            const isSandbox = FEDAPAY_MODE === 'sandbox';
            const fedapayMode = isSandbox ? undefined : OPERATOR_TO_FEDAPAY_MODE[request.operator];
            if (!isSandbox && !fedapayMode) {
                throw new Error(`Opérateur non supporté: ${request.operator}`);
            }
            // Build transaction payload
            const transactionPayload = {
                description: `Abonnement ${request.plan.planName} - HopeGestion`,
                amount: request.amount,
                currency: { iso: 'XOF' },
                callback_url: FEDAPAY_CALLBACK_URL, // Webhook (server-to-server)
                // Note: return_url is NOT supported in Transaction.create()
                // FedaPay uses the token.url for redirect, we'll handle return via frontend
                custom_metadata: {
                    user_id: String(request.userId),
                    plan_id: String(request.plan.planId),
                    plan_name: request.plan.planName,
                    plan_type: request.plan.planType,
                    duration_months: String(request.plan.durationMonths),
                    internal_ref: request.internalReference || ''
                },
                customer: {
                    firstname: request.userName.split(' ')[0] || 'Client',
                    lastname: request.userName.split(' ').slice(1).join(' ') || 'HopeGestion',
                    email: request.userEmail || 'client@hopegestion.com',
                    phone_number: {
                        number: request.userPhone.replace(/\D/g, ''),
                        country: 'BJ' // Benin by default
                    }
                }
            };
            // Only add mode in production
            if (fedapayMode) {
                transactionPayload.mode = fedapayMode;
            }
            // Create transaction with metadata for traceability
            const transaction = await Transaction.create(transactionPayload);
            log.info(context, 'Transaction created successfully', {
                transactionId: transaction.id,
                status: transaction.status,
                reference: transaction.reference
            });
            // Generate payment token/URL
            const token = await transaction.generateToken();
            log.info(context, 'Payment token generated', {
                transactionId: transaction.id,
                tokenUrl: token.url
            });
            return {
                success: true,
                message: 'Transaction créée. Redirection vers le paiement...',
                transactionId: String(transaction.id),
                paymentUrl: token.url,
                status: 'pending',
                rawResponse: {
                    id: transaction.id,
                    reference: transaction.reference,
                    status: transaction.status
                }
            };
        }
        catch (error) {
            log.error(context, 'Transaction creation failed', error);
            return {
                success: false,
                message: error.message || 'Erreur lors de la création de la transaction',
                transactionId: null,
                paymentUrl: null,
                status: 'error',
                rawResponse: error
            };
        }
    }
    /**
     * Check transaction status by ID
     */
    async getTransactionStatus(transactionId) {
        const context = 'CHECK_STATUS';
        try {
            const transaction = await Transaction.retrieve(transactionId);
            log.info(context, 'Transaction status retrieved', {
                id: transaction.id,
                status: transaction.status,
                amount: transaction.amount
            });
            return {
                status: transaction.status,
                transaction: {
                    id: transaction.id,
                    reference: transaction.reference,
                    status: transaction.status,
                    amount: transaction.amount,
                    mode: transaction.mode,
                    custom_metadata: transaction.custom_metadata
                }
            };
        }
        catch (error) {
            log.error(context, 'Failed to retrieve transaction', error);
            return { status: 'error' };
        }
    }
    /**
     * Validate webhook payload structure
     */
    validateWebhookPayload(payload) {
        if (!payload || !payload.entity || !payload.name || !payload.object) {
            return false;
        }
        if (payload.entity !== 'transaction') {
            return false;
        }
        return true;
    }
    /**
     * Extract metadata from webhook payload
     */
    extractMetadataFromWebhook(payload) {
        const meta = payload.object.custom_metadata || {};
        return {
            userId: meta.user_id ? parseInt(meta.user_id) : null,
            planId: meta.plan_id ? parseInt(meta.plan_id) : null,
            planName: meta.plan_name || null,
            planType: meta.plan_type || null,
            durationMonths: meta.duration_months ? parseInt(meta.duration_months) : null,
            internalRef: meta.internal_ref || null
        };
    }
    /**
     * Calculate subscription end date based on plan duration
     */
    calculateEndDate(startDate, durationMonths) {
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + durationMonths);
        return endDate;
    }
}
// Export singleton instance
exports.fedapayService = new FedaPayService();
//# sourceMappingURL=fedapayService.js.map