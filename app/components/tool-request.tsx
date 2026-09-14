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
      <section className="tool-request-card" aria-labelledby="tool-request-title">
        <header className="tool-request-header">
          <span className="tool-request-header-icon" aria-hidden="true"><Sparkles size={22} /></span>
          <div>
            <span className="section-kicker">Tool request</span>
            <h1 id="tool-request-title">What are you looking for?</h1>
            <p>Tell us the tool and plan you need. We&apos;ll contact you when it becomes available.</p>
          </div>
        </header>
        {error && <p className="commerce-error" role="alert">{error}</p>}
        {notice && <output className="admin-notice tool-request-notice">{notice}</output>}
        <form className="tool-request-form" onSubmit={submit}>
          <div className="tool-request-field-grid">
            <label htmlFor="tool-request-name">Tool name<input id="tool-request-name" value={toolName} onChange={event => setToolName(event.target.value)} required maxLength={160} placeholder="e.g. Runway, ChatGPT or Canva" /></label>
            <label htmlFor="tool-request-contact">Contact number<input id="tool-request-contact" type="tel" value={contactNumber} onChange={event => setContactNumber(event.target.value)} required maxLength={40} autoComplete="tel" inputMode="tel" placeholder="+92 3XX XXXXXXX" /></label>
          </div>
          <label htmlFor="tool-request-details">Requirements<small>Include the plan, duration, seats or access type.</small><textarea id="tool-request-details" value={requirement} onChange={event => setRequirement(event.target.value)} required minLength={10} maxLength={4000} rows={4} placeholder="I need a one-month Pro plan for..." /></label>
          <fieldset className="tool-request-urgency">
            <legend>How urgent is it?</legend>
            <div className="tool-request-urgency-options">
              {(['urgent', 'moderate', 'low'] as const).map(option => (
                <label className={priority === option ? 'selected' : ''} key={option}>
                  <input type="radio" name="priority" value={option} checked={priority === option} onChange={() => setPriority(option)} />
                  <span>{option[0].toUpperCase() + option.slice(1)}</span>
                </label>
              ))}
            </div>
            <small>Urgent requests are reviewed first when possible.</small>
          </fieldset>
          <div className="tool-request-actions">
            <a className="tool-request-browse" href="/inventory">Browse available tools <ArrowRight size={16} /></a>
            <button className="primary-button" disabled={busy}>{busy ? 'Sending request…' : 'Send request'} <Send size={17} /></button>
          </div>
        </form>
      </section>
    </main>
  );
}
