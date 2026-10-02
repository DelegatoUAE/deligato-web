import { useNavigate } from 'react-router-dom';
import { PageHeader, useToast, Button } from '../design/ui';
import SubNav from '../components/SubNav';
import CapitalNeedForm from '../components/capital/CapitalNeedForm';
import { useCompany } from '../components/company-context';
import { runMatch } from '../lib/capital';

export default function CapitalNeedPage() {
  const { capitalNeedConfirmed, reloadCompanies, reloadRun } = useCompany();
  const navigate = useNavigate();
  const toast = useToast();

  async function onSaved(out, { andFind }) {
    reloadCompanies();
    if (!andFind) {
      toast.push({ tone: 'ok', title: 'Saved', message: 'Re-run matches to see the effect.', action: <Button size="sm" variant="link" onClick={() => navigate('/capital/find?step=routing')}>Re-run</Button> });
      return;
    }
    const res = await runMatch(out.company.id);
    reloadRun();
    navigate(`/capital/matches${res.run_id ? `?run=${res.run_id}` : ''}`);
  }

  return (
    <div>
      <SubNav section="capital" />
      <PageHeader title="Capital need" subtitle="What you're raising. These are hard filters, so be exact." />
      <CapitalNeedForm firstRun={!capitalNeedConfirmed} onSaved={onSaved} />
    </div>
  );
}
