// Advice layer (H7): readiness links + data gaps on top of capital unlocks.
import { apiFetch } from './auth';

export const getAdvice = (companyId) => apiFetch(`/api/v1/advice/${companyId}`);
