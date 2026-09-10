/**
 * @hopegestion/api-client
 * Barrel exports — point d'entrée unique du package
 */

// Core HTTP client
export { initApiClient, apiCall, getApiUrl } from './core';
export type { ApiPlatform, ApiCallOptions } from './core';

// Auth
export {
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  registerDeviceToken,
  unregisterDeviceToken,
} from './authApi';
export type { AuthResponse, UserProfile } from './authApi';

// Biens
export {
  getImmeubles,
  getImmeuble,
  getLots,
  saveImmeuble,
  deleteImmeuble,
  saveLot,
  deleteLot,
} from './bienApi';

// Locataires
export {
  getLocataires,
  getLocataireDetails,
  createLocataire,
  updateLocataire,
  deleteLocataire,
  approveLocataire,
  rejectLocataire,
} from './locataireApi';

// Interventions
export { interventionApi } from './interventionApi';
export type { Ticket, Provider, PaginatedResponse } from './interventionApi';

// Finance
export { financeApi } from './financeApi';
export type { CreatePaymentData, FinanceStats } from './financeApi';

// Dashboard
export {
  getDashboardKPIs,
  getAlerts,
  markAlertRead,
  markAllAlertsRead,
} from './dashboardApi';
export type { DashboardKPIs, AlertItem } from './dashboardApi';
