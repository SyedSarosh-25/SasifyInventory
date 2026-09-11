'use client';

import { useEffect, useState, type SyntheticEvent } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileImage,
  Send,
  ShieldAlert,
} from 'lucide-react';

type Evidence = { filename: string; type: string; data: string };
type Identifier = { platform: string; value: string };
type ReportSummary = {
  id: string;
  name: string;
  summary: string;
  amountPkr: number | null;
  identifierCount: number;
  paymentMethodCount: number;
  createdAt: string;
};
type Report = {
  id: string;
  name: string;
  description: string;
  amountPkr: number | null;
  identifiers: Identifier[];
  paymentMethods: string[];
  evidence: Evidence[];
  createdAt: string;
};
type ApiError = { error?: string };

const maxEvidenceBytes = 600 * 1024;
const localDemoReport: Report = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Demo report — local preview only',
  description:
    'This is sample content for checking the public scam-report flow. A fictional seller accepted payment for a digital service and did not deliver it. This record is not a real accusation and is never loaded in production.',
  amountPkr: 25000,
  identifiers: [
    { platform: 'Telegram', value: '@demo-seller' },
    { platform: 'WhatsApp', value: '+92 300 0000000' },
  ],
  paymentMethods: ['NayaPay', 'Bank transfer'],
  evidence: [],
  createdAt: '2026-09-10T00:00:00.000Z',
};
const localDemoSummary: ReportSummary = {
  id: localDemoReport.id,
  name: localDemoReport.name,
  summary: localDemoReport.description,
  amountPkr: localDemoReport.amountPkr,
  identifierCount: localDemoReport.identifiers.length,
  paymentMethodCount: localDemoReport.paymentMethods.length,
  createdAt: localDemoReport.createdAt,
};
const isDevelopment = process.env.NODE_ENV !== 'production';

function amountLabel(amount: number | null) {
  return amount ? `PKR ${amount.toLocaleString('en-PK')}` : 'Not provided';
}

export function ScamReports() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [amountPkr, setAmountPkr] = useState('');
  const [identifiers, setIdentifiers] = useState('');
  const [paymentMethods, setPaymentMethods] = useState('');
  const [description, setDescription] = useState('');
  const [submitterContact, setSubmitterContact] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function openReport(id: string, updateUrl = true) {
    if (updateUrl)
      window.history.pushState(
        {},
        '',
        `/scammers?report=${encodeURIComponent(id)}`,
      );
    setShowForm(false);
    setSelectedReport(null);
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await fetch(
        `/api/commerce?action=scam-report&id=${encodeURIComponent(id)}`,
        { cache: 'no-store' },
      );
      const data = (await response.json()) as Report & ApiError;
      if (!response.ok)
        throw new Error(data.error || 'This report is no longer available.');
      setSelectedReport(data);
    } catch (problem) {
      if (isDevelopment && id === localDemoReport.id)
        setSelectedReport(localDemoReport);
      else setDetailError((problem as Error).message);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeReport() {
    window.history.pushState({}, '', '/scammers');
    setSelectedReport(null);
    setDetailError('');
    setShowForm(false);
  }

  function openSubmission() {
    setSelectedReport(null);
    setDetailError('');
    setShowForm(true);
    window.history.pushState({}, '', '/scammers#submit-scam-report');
    window.setTimeout(
      () =>
        document
          .getElementById('submit-scam-report')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      0,
    );
  }

  useEffect(() => {
    let active = true;
    fetch('/api/commerce?action=scam-reports', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load scam reports.');
        return (await response.json()) as { reports?: ReportSummary[] };
      })
      .then((data) => {
        if (active) setReports(data.reports || []);
      })
      .catch(() => {
        if (active && isDevelopment) setReports([localDemoSummary]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const syncUrl = () => {
      const id = new URLSearchParams(window.location.search).get('report');
      if (id) void openReport(id, false);
      else {
        setSelectedReport(null);
        setDetailError('');
        setShowForm(false);
      }
    };
    syncUrl();
    window.addEventListener('popstate', syncUrl);
    return () => {
      active = false;
      window.removeEventListener('popstate', syncUrl);
    };
  }, []);

  async function addEvidence(files: FileList | null) {
    setError('');
    if (!files) return;
    const selected = [...files];
    if (selected.length + evidence.length > 3) {
      setError('You can attach up to 3 proof images.');
      return;
    }
    if (
      selected.some(
        (file) =>
          !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
          file.size > maxEvidenceBytes,
      )
    ) {
      setError('Each proof image must be PNG, JPG or WebP and under 600 KB.');
      return;
    }
    const loaded = await Promise.all(
      selected.map(
        (file) =>
          new Promise<Evidence>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result !== 'string')
                reject(new Error('Could not read one of the proof images.'));
              else
                resolve({
                  filename: file.name,
                  type: file.type,
                  data: reader.result,
                });
            };
            reader.onerror = () =>
              reject(new Error('Could not read one of the proof images.'));
            reader.readAsDataURL(file);
          }),
      ),
    );
    setEvidence((current) => [...current, ...loaded]);
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const parsedIdentifiers = identifiers
      .split('\n')
      .map((line) => {
        const separator = line.indexOf(':');
        return separator < 0
          ? { platform: 'Other', value: line.trim() }
          : {
              platform: line.slice(0, separator).trim(),
              value: line.slice(separator + 1).trim(),
            };
      })
      .filter((item) => item.value);
    try {
      const response = await fetch('/api/commerce?action=scam-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          amountPkr: Number(amountPkr),
          identifiers: parsedIdentifiers,
          paymentMethods: paymentMethods
            .split(/[,\n]/)
            .map((item) => item.trim())
            .filter(Boolean),
          description,
          submitterContact,
          evidence,
        }),
      });
      const data = (await response.json()) as ApiError;
      if (!response.ok)
        throw new Error(data.error || 'Could not submit the report.');
      setName('');
      setAmountPkr('');
      setIdentifiers('');
      setPaymentMethods('');
      setDescription('');
      setSubmitterContact('');
      setEvidence([]);
      setConfirmed(false);
      setNotice(
        'Report submitted for manual review. It will only appear here after approval.',
      );
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="scam-reports-page">
      <section className="scam-intro">
        <div className="scam-intro-copy">
          <span className="section-kicker">
            <ShieldAlert size={16} /> Community safety
          </span>
          <h1>Scam reports</h1>
          <p>
            Review verified community reports before sending money to an
            unfamiliar account, username or seller.
          </p>
          <div className="scam-intro-actions">
            <button
              type="button"
              className="scam-intro-submit"
              onClick={openSubmission}
              aria-controls="submit-scam-report"
              aria-expanded={showForm}
            >
              <Send size={18} /> Submit a scam report
            </button>
            <span>
              Every submission is checked by an admin before publication.
            </span>
          </div>
        </div>
        <div className="scam-disclaimer">
          <AlertTriangle size={20} />
          <p>
            Reports are user-submitted and reviewed manually by Sasify
            Solutions. A listing is not a court finding. Verify the details
            independently before taking action.
          </p>
        </div>
      </section>

      {!selectedReport && !detailLoading && (
        <section
          className="scam-listing-section"
          aria-labelledby="verified-scam-reports"
        >
          <div className="panel-heading">
            <div>
              <span className="section-kicker">
                <CheckCircle2 size={16} /> Verified listings
              </span>
              <h2 id="verified-scam-reports">Published scam reports</h2>
              <p>
                Open a report to view its full details, identifiers, payment
                methods and proof.
              </p>
            </div>
          </div>
          <div className="scam-report-grid" aria-live="polite">
            {loading && <div className="scam-empty">Loading reports…</div>}
            {!loading && !reports.length && (
              <div className="scam-empty">
                No approved reports have been published yet.
              </div>
            )}
            {reports.map((report) => (
              <a
                className="scam-report-card scam-report-link"
                href={`/scammers?report=${encodeURIComponent(report.id)}`}
                key={report.id}
                onClick={(event) => {
                  event.preventDefault();
                  void openReport(report.id);
                }}
              >
                <div className="scam-card-heading">
                  <div>
                    <span className="scam-reviewed">
                      <CheckCircle2 size={15} /> Verified report
                    </span>
                    <h3>{report.name}</h3>
                  </div>
                  <time dateTime={report.createdAt}>
                    {new Date(report.createdAt).toLocaleDateString()}
                  </time>
                </div>
                <div className="scam-list-facts">
                  <div>
                    <span>Reported amount</span>
                    <strong>{amountLabel(report.amountPkr)}</strong>
                  </div>
                  <div>
                    <span>Evidence</span>
                    <strong>
                      {report.identifierCount} identifier
                      {report.identifierCount === 1 ? '' : 's'} ·{' '}
                      {report.paymentMethodCount} payment method
                      {report.paymentMethodCount === 1 ? '' : 's'}
                    </strong>
                  </div>
                </div>
                <p className="scam-description">
                  {report.summary}
                  {report.summary.length >= 240 ? '…' : ''}
                </p>
                <span className="scam-open-link">
                  Open full report <ArrowRight size={16} />
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {(selectedReport || detailLoading || detailError) && (
        <section className="scam-detail-view" aria-live="polite">
          <button
            type="button"
            className="scam-detail-back"
            onClick={closeReport}
          >
            <ArrowLeft size={16} /> All verified reports
          </button>
          {detailLoading && (
            <div className="scam-empty">Loading report details…</div>
          )}
          {detailError && (
            <div className="scam-empty" role="alert">
              {detailError}
            </div>
          )}
          {selectedReport && (
            <article className="scam-detail-card">
              <div className="scam-detail-heading">
                <div>
                  <span className="scam-reviewed">
                    <CheckCircle2 size={15} /> Verified report
                  </span>
                  <h2>{selectedReport.name}</h2>
                </div>
                <time dateTime={selectedReport.createdAt}>
                  Reported{' '}
                  {new Date(selectedReport.createdAt).toLocaleDateString()}
                </time>
              </div>
              <div className="scam-detail-facts">
                <div>
                  <span>Reported amount</span>
                  <strong>{amountLabel(selectedReport.amountPkr)}</strong>
                </div>
                <div>
                  <span>Review status</span>
                  <strong>Verified by admin</strong>
                </div>
              </div>
              <section className="scam-card-section">
                <h3>What happened</h3>
                <p className="scam-description">{selectedReport.description}</p>
              </section>
              <section className="scam-card-section">
                <h3>Contact details and identifiers</h3>
                <ul className="scam-identifiers">
                  {selectedReport.identifiers.map((item, index) => (
                    <li key={`${item.platform}-${item.value}-${index}`}>
                      <span>{item.platform}</span>
                      <code>{item.value}</code>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="scam-card-section">
                <h3>Payment methods used</h3>
                <p>{selectedReport.paymentMethods.join(' · ')}</p>
              </section>
              {!!selectedReport.evidence.length && (
                <div className="scam-evidence">
                  <strong>Proof screenshots</strong>
                  <div>
                    {selectedReport.evidence.map((item, index) => (
                      <a
                        href={item.data}
                        target="_blank"
                        rel="noreferrer"
                        key={`${item.filename}-${index}`}
                      >
                        <img
                          src={item.data}
                          alt={`Proof screenshot ${index + 1} for ${selectedReport.name}`}
                        />
                        <span>{item.filename}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="scam-submit-cta">
                <div>
                  <strong>Did you get scammed also?</strong>
                  <p>Submit the details and proof for manual verification.</p>
                </div>
                <button
                  type="button"
                  className="secondary-button compact"
                  onClick={openSubmission}
                >
                  Submit a report now <ArrowRight size={16} />
                </button>
              </div>
            </article>
          )}
        </section>
      )}

      {showForm && (
        <section
          className="scam-submit-panel"
          id="submit-scam-report"
          aria-labelledby="submit-scam-report-title"
        >
          <div className="panel-heading">
            <div>
              <span className="section-kicker">
                <Send size={16} /> Submit information
              </span>
              <h2 id="submit-scam-report-title">Submit a scam report</h2>
              <p>
                Your submission stays pending until it is reviewed by an admin.
                Approved reports are then published in the verified listings.
              </p>
            </div>
          </div>
          {error && (
            <p className="commerce-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="admin-notice" role="status">
              {notice}
            </p>
          )}
          <form className="scam-form" onSubmit={submit}>
            <label>
              Reported name or alias
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={160}
                placeholder="Name, business name or alias"
              />
            </label>
            <label>
              Amount involved (PKR)
              <small>Enter the amount that was taken.</small>
              <input
                type="number"
                min="1"
                max="1000000000"
                step="1"
                value={amountPkr}
                onChange={(event) => setAmountPkr(event.target.value)}
                required
                placeholder="25000"
              />
            </label>
            <label>
              Public identifiers
              <small>One per line, for example: Telegram: @username</small>
              <textarea
                value={identifiers}
                onChange={(event) => setIdentifiers(event.target.value)}
                required
                rows={4}
                maxLength={3600}
                placeholder={
                  'Telegram: @username\nWhatsApp: +92...\nDiscord: username#0000'
                }
              />
            </label>
            <label>
              Payment methods used
              <small>Separate with commas or new lines.</small>
              <input
                value={paymentMethods}
                onChange={(event) => setPaymentMethods(event.target.value)}
                required
                maxLength={960}
                placeholder="NayaPay, Easypaisa, bank transfer"
              />
            </label>
            <label>
              What happened?
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                minLength={20}
                maxLength={4000}
                rows={6}
                placeholder="Describe the transaction and the issue using factual details."
              />
            </label>
            <label>
              How can we contact you? <span className="optional">Optional</span>
              <input
                value={submitterContact}
                onChange={(event) => setSubmitterContact(event.target.value)}
                maxLength={240}
                placeholder="Email or WhatsApp for follow-up"
              />
            </label>
            <label className="scam-file-input">
              Proof screenshots
              <small>
                Up to 3 PNG, JPG or WebP files, under 600 KB each. Redact
                passwords, private addresses and unrelated personal data.
              </small>
              <span>
                <FileImage size={18} /> Choose images
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(event) => {
                    void addEvidence(event.target.files);
                    event.currentTarget.value = '';
                  }}
                />
              </span>
            </label>
            {!!evidence.length && (
              <div
                className="scam-selected-evidence"
                aria-label="Selected proof images"
              >
                {evidence.map((item, index) => (
                  <button
                    type="button"
                    key={`${item.filename}-${index}`}
                    onClick={() =>
                      setEvidence((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    {item.filename} ×
                  </button>
                ))}
              </div>
            )}
            <label className="scam-confirm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                required
              />{' '}
              I confirm these details are accurate to the best of my knowledge
              and I have not included passwords, financial credentials or
              unrelated private information.
            </label>
            <button className="primary-button" disabled={busy || !confirmed}>
              {busy ? 'Submitting…' : 'Submit for review'} <Send size={17} />
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
