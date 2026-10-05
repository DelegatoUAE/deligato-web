// The Deligato product sub-label shown under the wordmark (app shell, landing, pricing, page titles).
//
// TODO(D74 (2), Bilal): choose the final wording. Until D73 the sub-label was "Capital Intelligence",
// which is now the name of the $29 plan, so it must not be used here (it would read as the plan).
// This neutral placeholder is the ONE place to change it; index.html carries the same words in its
// static <title>/meta (a test pins that it matches this constant). The API mirrors it as
// catalog.PRODUCT_SUB_LABEL (exposed on /billing/plans `brand`), which the api lane changes separately.
export const PRODUCT_SUB_LABEL = 'Capital Platform';

/** "Deligato · Capital Platform for founders and growing companies" (document titles). */
export const BRAND_TITLE = `Deligato · ${PRODUCT_SUB_LABEL} for founders and growing companies`;
