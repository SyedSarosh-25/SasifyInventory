'use client';

import { useState, type SyntheticEvent } from 'react';
import { ArrowRight, Send, Sparkles } from 'lucide-react';

export function ToolRequest() {
  const [toolName, setToolName] = useState('');
  const [requirement, setRequirement] = useState('');
  const [priority, setPriority] = useState('moderate');
  const [contactNumber, setContactNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/commerce?action=tool-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, requirement, priority, contactNumber }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not send the request.');
      setToolName('');
      setRequirement('');
      setPriority('moderate');
      setContactNumber('');
      setNotice('Request received. We will contact you when this tool is available.');
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="tool-request-page">
      <section className="tool-request-intro">
        <div>
          <span className="section-kicker"><Sparkles size={16} /> Tool requests</span>
          <h1>Can&apos;t find a tool?</h1>
          <p>Send us the name and your requirements. We&apos;ll check availability and contact you when it&apos;s ready.</p>
          <a className="tool-request-browse" href="/inventory">Browse available tools <ArrowRight size={16} /></a>
        </div>
      </section>
      <section className="tool-request-card" aria-labelledby="tool-request-title">
        <div className="panel-heading"><div><span className="section-kicker"><Send size={16} /> Send a request</span><h2 id="tool-request-title">Tell us what you need</h2><p>Add the plan, duration or access type so we can find the right option.</p></div></div>
        {error && <p className="commerce-error" role="alert">{error}</p>}
        {notice && <p className="admin-notice tool-request-notice" role="status">{notice}</p>}
        <form className="tool-request-form" onSubmit={submit}>
          <label>Tool name<input value={toolName} onChange={event => setToolName(event.target.value)} required maxLength={160} placeholder="For example, Runway or a specific AI tool" /></label>
          <label>What do you need?<small>Tell us the plan, duration, seats or access type you need.</small><textarea value={requirement} onChange={event => setRequirement(event.target.value)} required minLength={10} maxLength={4000} rows={6} placeholder="I need a one-month plan for..." /></label>
          <div className="tool-request-form-grid">
            <label>Priority<select value={priority} onChange={event => setPriority(event.target.value)}><option value="urgent">Urgent</option><option value="moderate">Moderate</option><option value="low">Low</option></select><small>Urgent requests are reviewed first when possible.</small></label>
            <label>Contact number<input type="tel" value={contactNumber} onChange={event => setContactNumber(event.target.value)} required maxLength={40} autoComplete="tel" placeholder="+92 3XX XXXXXXX" /><small>We&apos;ll use this number to inform you manually.</small></label>
          </div>
          <button className="primary-button" disabled={busy}>{busy ? 'Sending request…' : 'Send tool request'} <Send size={17} /></button>
        </form>
      </section>
    </main>
  );
}
