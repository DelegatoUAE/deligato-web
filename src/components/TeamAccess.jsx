// Settings → Team and access (/settings/team) on api modules/team.
// The API is authoritative: roles, seats (402 seat_limit) and the last-owner
// rule are enforced there; this screen hides what would fail and shows the
// API's own message when something does.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, FormField, Input, Select, Skeleton, Table, useToast } from '../design/ui';
import useApi from '../lib/useApi';
import { getMembers, getInvites, createInvite, revokeInvite, changeMemberRole, removeMember } from '../lib/team';
import { ROLE_HELP, assignableRoles, canChangeRole, canManageTeam, canRemoveMember, roleLabel, seatSummary } from '../lib/access';
import { gateFor } from '../lib/plan';
import { fmtDate } from '../lib/format';

const unavailable = (e) => e && (e.status === 503 || e.code === 'team_unavailable');

const DELIVERY = {
  emailed: (email) => `We emailed the invitation to ${email}. You can also send them this link yourself.`,
  link_only: () => "Email isn't set up here, so send this link yourself. It is shown only once.",
  email_failed: () => "The email didn't go out. Send this link yourself. It is shown only once.",
};

function GateAlert({ error }) {
  const g = gateFor(error);
  return (
    <Alert tone="warn" title="No free seat on your plan">
      {g.message}{g.href && <> <Link to={g.href}>{g.cta}</Link></>}
    </Alert>
  );
}

function InviteForm({ companyId, roles, seats, onInvited }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(roles.includes('member') ? 'member' : roles[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null); setSent(null);
    try {
      const out = await createInvite(companyId, { email: email.trim(), role });
      setSent({ email: out.invite?.email || email.trim(), url: out.accept_url, delivery: out.delivery });
      setEmail('');
      onInvited();
    } catch (err) { setError(err); } finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(sent.url); toast.success('Invite link copied.'); }
    catch { toast.error("Couldn't copy. Select the link and copy it yourself."); }
  }

  return (
    <Card title="Invite a teammate" subtitle="They join this company with the role you choose. Invites expire after 7 days and work once.">
      {seats?.full && !error && (
        <Alert tone="info">All {seats.limit} seats on your plan are in use, counting pending invites. Withdraw an invite or remove a teammate to free one.</Alert>
      )}
      <form className="team-invite" onSubmit={submit} noValidate>
        <FormField label="Email address">
          <Input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required />
        </FormField>
        <FormField label="Role" hint={ROLE_HELP[role]}>
          <Select value={role} onChange={(e) => setRole(e.target.value)} options={roles.map((r) => ({ value: r, label: roleLabel(r) }))} />
        </FormField>
        <div className="team-invite-go">
          <Button type="submit" iconLeft="plus" loading={busy} disabled={!email.trim()}>Invite</Button>
        </div>
      </form>
      {error && (error.status === 402 ? <GateAlert error={error} /> : <Alert tone="bad">{error.message}</Alert>)}
      {sent && (
        <Alert tone="ok" title={`Invitation ready for ${sent.email}`}>
          <p>{(DELIVERY[sent.delivery] || DELIVERY.link_only)(sent.email)}</p>
          {sent.url && (
            <div className="team-link">
              <Input readOnly value={sent.url} aria-label="Invite link" onFocus={(e) => e.target.select()} />
              <Button variant="secondary" size="sm" iconLeft="file" onClick={copy}>Copy link</Button>
            </div>
          )}
        </Alert>
      )}
    </Card>
  );
}

export default function TeamAccess({ me, company, companyId, entitlementsRaw }) {
  const toast = useToast();
  const membersQ = useApi(() => (companyId ? getMembers(companyId) : null), [companyId]);
  const myRole = membersQ.data?.your_role || company?.access_role || null;
  const manage = canManageTeam(myRole);
  const invitesQ = useApi(() => (companyId && manage ? getInvites(companyId) : null), [companyId, manage]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(null);

  if (!companyId) return <Card title="Team and access"><p className="ui-muted">Your team starts once your company is set up.</p></Card>;
  if (membersQ.error) {
    return (
      <Card title="Team and access">
        <Alert tone="warn">{unavailable(membersQ.error) ? "Team access isn't switched on here yet." : membersQ.error.message}</Alert>
      </Card>
    );
  }
  if (!membersQ.data) return <Card title="Team and access"><Skeleton variant="text" lines={4} /></Card>;

  const members = membersQ.data.members || [];
  const myId = me?.user?.id;
  const owners = members.filter((m) => m.role === 'owner').length;
  const pending = (invitesQ.data?.invites || []).filter((i) => i.status === 'pending');
  const limit = entitlementsRaw?.limits?.seats;
  const seats = manage ? seatSummary(limit, members.length, pending.length) : null;
  const roles = assignableRoles(myRole);

  function reloadAll() { membersQ.reload(); if (manage) invitesQ.reload(); }

  async function setRole(m, role) {
    if (role === m.role) return;
    setBusy(m.user_id);
    try {
      await changeMemberRole(companyId, m.user_id, role);
      toast.success(`${m.full_name || m.email} is now ${roleLabel(role).toLowerCase()}.`);
      reloadAll();
    } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  }
  async function doConfirm() {
    const c = confirm;
    setBusy('confirm');
    try {
      if (c.kind === 'remove') {
        await removeMember(companyId, c.member.user_id);
        if (c.self) { toast.success(`You left ${company?.name || 'the company'}.`); window.location.assign('/'); return; }
        toast.success(`${c.member.full_name || c.member.email} was removed.`);
      } else {
        await revokeInvite(companyId, c.invite.id);
        toast.success(`Invite to ${c.invite.email} withdrawn.`);
      }
      setConfirm(null);
      reloadAll();
    } catch (e) { toast.error(e.message); setConfirm(null); } finally { setBusy(null); }
  }

  const columns = [
    { key: 'who', header: 'Teammate', render: (m) => (
      <div className="team-who">
        <strong>{m.full_name || m.email}{m.user_id === myId ? ' (you)' : ''}</strong>
        {m.full_name && <span className="ui-faint team-email">{m.email}</span>}
        <span className="ui-faint">{m.joined_at ? `Joined ${fmtDate(m.joined_at)}` : 'Joined date not on record'}</span>
      </div>
    ) },
    { key: 'role', header: 'Role', render: (m) => {
      const self = m.user_id === myId;
      if (!canChangeRole(myRole, m, { self, owners })) {
        return <span className="team-role"><Badge tone={m.role === 'owner' ? 'brand' : 'neutral'} size="sm">{roleLabel(m.role)}</Badge>{m.primary_owner && <span className="ui-faint">Primary owner</span>}</span>;
      }
      return (
        <Select className="team-role-select" aria-label={`Role for ${m.full_name || m.email}`} value={m.role} disabled={busy === m.user_id}
          onChange={(e) => setRole(m, e.target.value)} options={roles.map((r) => ({ value: r, label: roleLabel(r) }))} />
      );
    } },
    { key: 'act', header: <span className="ui-sr">Actions</span>, align: 'right', render: (m) => {
      const self = m.user_id === myId;
      if (!canRemoveMember(myRole, m, { self, owners })) return null;
      return <Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: 'remove', member: m, self })}>{self ? 'Leave' : 'Remove'}</Button>;
    } },
  ];

  return (
    <div className="ui-stack">
      <Card title="Team and access" subtitle={`People who can work on ${company?.name || 'this company'} in Deligato.`}
        action={<Badge tone="outline">Your role: {roleLabel(myRole)}</Badge>}>
        {seats ? (
          <p className="team-seats"><strong>{seats.used} of {seats.limit}</strong> {seats.limit === 1 ? 'seat' : 'seats'} used on your plan{pending.length ? `, including ${pending.length} pending ${pending.length === 1 ? 'invite' : 'invites'}` : ''}.</p>
        ) : manage ? (
          <p className="team-seats ui-muted">Your plan's seat limit couldn't be read. Deligato checks it when you send an invite.</p>
        ) : (
          <p className="team-seats ui-muted">Owners and admins manage the team. To change your role, ask one of them.</p>
        )}
        <Table dense rows={members} rowKey="user_id" columns={columns} empty="No teammates yet." />
      </Card>

      {manage && roles.length > 0 && (
        <InviteForm companyId={companyId} roles={roles} seats={seats} onInvited={reloadAll} />
      )}

      {manage && (
        <Card title="Pending invites">
          {invitesQ.error ? <Alert tone="warn">{invitesQ.error.message}</Alert>
            : !invitesQ.data ? <Skeleton variant="text" lines={2} />
              : pending.length ? (
                <Table dense rows={pending} rowKey="id" columns={[
                  { key: 'email', header: 'Email', render: (i) => <span className="team-email">{i.email}</span> },
                  { key: 'role', header: 'Role', render: (i) => roleLabel(i.role) },
                  { key: 'exp', header: 'Expires', render: (i) => fmtDate(i.expires_at) },
                  { key: 'act', header: <span className="ui-sr">Actions</span>, align: 'right', render: (i) => (
                    (i.role !== 'owner' || myRole === 'owner') ? <Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: 'revoke', invite: i })}>Withdraw</Button> : null
                  ) },
                ]} />
              ) : <EmptyState compact icon="info" title="No pending invites." />}
        </Card>
      )}

      <Card title="What each role can do">
        <dl className="facts">
          {['owner', 'admin', 'member', 'viewer'].map((r) => <div key={r}><dt>{roleLabel(r)}</dt><dd>{ROLE_HELP[r]}</dd></div>)}
        </dl>
      </Card>

      <ConfirmDialog open={Boolean(confirm)} busy={busy === 'confirm'} onCancel={() => setConfirm(null)} onConfirm={doConfirm}
        title={confirm?.kind === 'revoke' ? `Withdraw the invite to ${confirm.invite.email}?`
          : confirm?.self ? `Leave ${company?.name || 'this company'}?` : `Remove ${confirm?.member?.full_name || confirm?.member?.email}?`}
        body={confirm?.kind === 'revoke' ? 'The link stops working straight away, and the seat is freed.'
          : confirm?.self ? 'You lose access to this company straight away. An owner or admin can invite you again.'
            : 'They lose access to this company straight away. Nothing they added is deleted.'}
        confirmLabel={confirm?.kind === 'revoke' ? 'Withdraw invite' : confirm?.self ? 'Leave company' : 'Remove teammate'} />
    </div>
  );
}
