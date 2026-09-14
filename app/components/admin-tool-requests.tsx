'use client';

import {
  CheckCircle2,
  Clock3,
  MessageSquareMore,
  Phone,
  XCircle,
} from 'lucide-react';
import { AdminRecordControls, useRecordView } from './admin-record-controls';

type ToolRequest = {
  id: string;
  tool_name: string;
  requirement: string;
  priority: string;
  contact_number: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const priorityLabels: Record<string, string> = {
  urgent: 'Urgent',
  moderate: 'Moderate',
  low: 'Low',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  fulfilled: 'Fulfilled',
  closed: 'Closed',
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
}

export function AdminToolRequests({
  requests,
  busy,
  onStatus,
}: {
  requests: ToolRequest[];
  busy: boolean;
  onStatus: (requestId: string, status: 'new' | 'contacted' | 'fulfilled' | 'closed') => void;
}) {
  const view = useRecordView(
    requests,
    (request) =>
      `${request.tool_name} ${request.requirement} ${request.priority} ${request.contact_number} ${request.status}`,
  );

  return (
    <div className="admin-workspace tool-request-admin-page">
      <section className="admin-panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker"><MessageSquareMore size={16} /> Customer demand</span>
            <h2>Tool requests</h2>
            <p>Review requested tools, call the requester when stock is available, and keep the queue status current.</p>
          </div>
          <div className="tool-request-admin-count"><strong>{requests.length}</strong><span>loaded requests</span></div>
        </div>
        <AdminRecordControls view={view} label="tool requests" />
        <div className="tool-request-admin-list">
          {view.rows.map((request) => (
            <article className={`tool-request-admin-card priority-${request.priority}`} key={request.id}>
              <div className="tool-request-admin-card-heading">
                <div>
                  <span className={`tool-request-priority priority-${request.priority}`}>
                    {priorityLabels[request.priority] || request.priority}
                  </span>
                  <h3>{request.tool_name}</h3>
                </div>
                <span className={`tool-request-status status-${request.status}`}>
                  {statusLabels[request.status] || request.status}
                </span>
              </div>
              <p className="tool-request-requirement">{request.requirement}</p>
              <div className="tool-request-admin-meta">
                <a href={`tel:${request.contact_number}`}><Phone size={16} /> {request.contact_number}</a>
                <span><Clock3 size={16} /> {formatDate(request.created_at)}</span>
              </div>
              <div className="tool-request-admin-actions">
                <button type="button" className="secondary-button compact" disabled={busy || request.status === 'contacted'} onClick={() => onStatus(request.id, 'contacted')}>
                  <Phone size={15} /> Mark contacted
                </button>
                <button type="button" className="secondary-button compact" disabled={busy || request.status === 'fulfilled'} onClick={() => onStatus(request.id, 'fulfilled')}>
                  <CheckCircle2 size={15} /> Mark fulfilled
                </button>
                <button type="button" className="secondary-button compact danger-button" disabled={busy || request.status === 'closed'} onClick={() => onStatus(request.id, 'closed')}>
                  <XCircle size={15} /> Close
                </button>
                {request.status !== 'new' && request.status !== 'closed' && (
                  <button type="button" className="secondary-button compact" disabled={busy} onClick={() => onStatus(request.id, 'new')}>
                    Reopen
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {!view.rows.length && <p className="tool-request-admin-empty">No tool requests match the current filters.</p>}
      </section>
    </div>
  );
}
