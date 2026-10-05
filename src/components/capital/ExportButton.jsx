import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, useToast } from '../../design/ui';
import { useCompany } from '../company-context';
import { apiFetch } from '../../lib/auth';
import { canExport, exportFileName, exportPath, withBom } from '../../lib/capitalExport';
import { upgradeHref } from '../../lib/plan';

const WHAT = { matches: 'matches', shortlist: 'shortlist', pipeline: 'pipeline' };

/**
 * "Export" on Matches, Shortlist and Pipeline (Capital Raising, entitlement `export`). Downloads the
 * server's CSV (UTF-8 with BOM, opens in Excel). The server checks access, the plan, fair use and
 * which contact columns the plan may see; this button only asks. Hidden when the plan has no export.
 */
export default function ExportButton({ kind, size = 'sm' }) {
  const { company, companyId, entitlements } = useCompany();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!companyId || !canExport(entitlements)) return null;

  async function download() {
    setBusy(true);
    try {
      const text = await apiFetch(exportPath(companyId, kind), { headers: { Accept: 'text/csv' } });
      const blob = new Blob([withBom(typeof text === 'string' ? text : '')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFileName(kind, company?.name);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Your ${WHAT[kind] || kind} is downloading as a CSV file. It opens in Excel.`);
    } catch (e) {
      if (e.code === 'upgrade_required') {
        toast.push({ tone: 'info', message: 'Export is part of Capital Raising.', action: <Link to={upgradeHref('capital-raising')}>See plans</Link> });
      } else toast.error(e.code === 'rate_limited' || e.code === 'fair_use_limit' ? e.message : `Couldn't export: ${e.message}`);
    } finally { setBusy(false); }
  }

  return (
    <Button variant="secondary" size={size} iconLeft="download" onClick={download} loading={busy}
      aria-label={`Export ${WHAT[kind] || kind} as CSV`}>
      Export
    </Button>
  );
}
