'use client';

import { useState } from 'react';
import { Mail, Phone, Plus, Save } from 'lucide-react';

type Requirement = {
  id: string;
  tool_name: string;
  description: string;
  status: 'open' | 'fulfilled' | 'closed';
  created_at: string;
  responses?: { id: string; name: string; email: string; username?: string | null; contact_number: string; created_at: string }[];
};
type AdminApi = (action: string, token?: string, body?: object) => Promise<any>;

export function AdminResellerRequirements({ requirements, api, token, busy, onRefresh }: { requirements: Requirement[]; api: AdminApi; token: string; busy: boolean; onRefresh: () => Promise<void> }) {
  const [toolName, setToolName] = useState('');
  const [description, setDescription] = useState('');
  const [notice, setNotice] = useState('');
  async function createRequirement() {
    const result = await api('admin-requirement-create', token, { toolName, description });
    setToolName(''); setDescription(''); setNotice(`Requirement published. ${result.notified || 0} reseller emails sent.`); await onRefresh();
  }
  async function updateStatus(requirementId: string, status: Requirement['status']) {
    await api('admin-requirement-update', token, { requirementId, status }); await onRefresh();
  }
  return <section className="admin-panel admin-enhancement-card">
    <div className="admin-enhancement-heading"><div><span className="admin-eyebrow">Reseller demand</span><h2>Required tools</h2><p>Publish what Sasify needs. Approved resellers receive an email and can respond with their contact number.</p></div><span className="admin-count-badge">{requirements.filter((item) => item.status === 'open').length} open</span></div>
    <form className="admin-requirement-create" onSubmit={(event) => { event.preventDefault(); void createRequirement(); }}>
      <label>Tool name<input required maxLength={160} value={toolName} onChange={(event) => setToolName(event.target.value)} placeholder="e.g. Canva Pro" /></label>
      <label>Requirement description<textarea required minLength={10} maxLength={4000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Sasify needs a reliable one-month Pro plan for customers…" /></label>
      <button className="primary-button" disabled={busy}><Plus size={15} /> Publish requirement</button>
    </form>
    {notice && <p className="admin-success"><Mail size={15} /> {notice}</p>}
    <div className="admin-requirement-list">{requirements.map((requirement) => <article className="admin-requirement-card" key={requirement.id}>
      <div className="admin-requirement-card-heading"><div><span className={`admin-state ${requirement.status}`}>{requirement.status}</span><h3>{requirement.tool_name}</h3></div><select value={requirement.status} onChange={(event) => void updateStatus(requirement.id, event.target.value as Requirement['status'])} disabled={busy}><option value="open">Open</option><option value="fulfilled">Fulfilled</option><option value="closed">Closed</option></select></div>
      <p>{requirement.description}</p>
      <div className="admin-requirement-responses"><strong>{requirement.responses?.length || 0} reseller responses</strong>{requirement.responses?.length ? requirement.responses.map((response) => <div className="admin-requirement-response" key={response.id}><span><strong>{response.name}</strong><small>{response.email} · @{response.username || '—'}</small></span><a href={`tel:${response.contact_number}`}><Phone size={14} /> {response.contact_number}</a></div>) : <small>No reseller has responded yet.</small>}</div>
    </article>)}</div>
    {!requirements.length && <div className="admin-empty-state"><h3>No requirements published</h3><p>Publish the first requirement to notify approved resellers.</p></div>}
  </section>;
}
