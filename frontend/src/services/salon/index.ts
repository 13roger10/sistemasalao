// Salon Services - Export all
export { api, ApiException, buildQueryString } from './api';
export type { ApiResponse, ApiError } from './api';

export { clientService } from './clientService';
export { appointmentService } from './appointmentService';
export { professionalService } from './professionalService';
export { serviceService } from './serviceService';
export { financeService } from './financeService';

// Additional services
export { commissionService } from './commissionService';
export { promotionService } from './promotionService';
export { stockService } from './stockService';
export { loyaltyService } from './loyaltyService';
export { reviewService } from './reviewService';
export { unitService } from './unitService';
// export { userService } from './userService';

// PWA and notification services
export { notificationService } from './notificationService';
export { reminderService } from './reminderService';

// Audit and backup services
export { auditService, setAuditContext, clearAuditContext, withAuditLog } from './auditService';
