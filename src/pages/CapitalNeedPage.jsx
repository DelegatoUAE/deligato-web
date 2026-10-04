import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader, useToast, Button } from '../design/ui';
import SubNav from '../components/SubNav';
import CapitalNeedForm from '../components/capital/CapitalNeedForm';
import { useCompany } from '../components/company-context';

export default function CapitalNeedPage() {
  const { capitalNeedConfirmed, reloadCompanies, reloadRun } = useCompany();
  const navigate = useNavigate();
  const toast = useToast();
  const { hash } = useLocation();
  // "Set a target date" (Company Intelligence) lands on the field.
  useEffect(() => {
    // "Say what the money is for" (Find capital) lands on the purpose chips.
    if (['#purpose', '#collateral', '#dilution'].includes(hash)) {
      const el = document.getElementById(hash.slice(1));
      el?.scrollIntoView({ block: 'center' });
      el?.closest('.ui-field')?.querySelector('.ui-chip')?.focus({ preventScroll: true });
      return;
    }
    if (hash !== '#target-date') return;
    const el = document.getElementById('target-date');
    el?.scrollIntoView({ block: 'center' });
    el?.focus({ preventScroll: true });
  }, [hash]);

  async function onSaved(out, { andFind }) {
    reloadCompanies();
    if (!andFind) {
      toast.push({ tone: 'ok', title: 'Saved', message: 'Re-run matches to see the effect.', action: <Button size="sm" variant="link" onClick={() => navigate('/capital/find')}>See routes</Button> });
      return;
    }
    // Raise → routes → matches (16): routing first, then providers inside the routes.
    reloadRun();
    navigate('/capital/find');
  }

  return (
    <div>
      <SubNav section="capital" />
      <PageHeader title="Capital need" subtitle="What you're raising. These are hard filters, so be exact." />
      <CapitalNeedForm firstRun={!capitalNeedConfirmed} onSaved={onSaved} />
    </div>
  );
}
