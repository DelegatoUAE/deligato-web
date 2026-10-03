import useApi from './useApi';
import { getConsents, getConsentTexts, grantConsent } from './privacy';

/**
 * I-03 / D32: consent for AI explanations, asked at the point of use.
 * One hook per page: reads the company's ai_processing consent and the
 * exact consent text; grant() records it through the existing consents API.
 */
export default function useAiConsent(companyId) {
  const cQ = useApi(() => (companyId ? getConsents(companyId) : null), [companyId]);
  const tQ = useApi(() => getConsentTexts(), []);
  const st = cQ.data?.status?.ai_processing;
  const text = (tQ.data?.texts || []).find((t) => t.scope === 'ai_processing') || null;
  return {
    loading: cQ.loading && !cQ.data,
    granted: Boolean(st?.granted) && !st?.needs_reconsent,
    text,
    async grant() {
      await grantConsent('ai_processing', text?.version || st?.current_version, companyId);
      await cQ.reload();
    },
  };
}

