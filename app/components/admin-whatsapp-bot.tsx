'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import {
  ShoppingBag,
  Bot,
  Power,
  AlertTriangle,
  MessageSquare,
  BookOpen,
  QrCode,
  RefreshCw,
  Trash2,
  ExternalLink,
  Settings,
  CheckCircle2,
  Clock,
  Send,
  UserX,
  Smartphone,
} from 'lucide-react';

interface BotActivity {
  id: string;
  type: 'INCOMING' | 'OUTGOING' | 'REPORT' | 'VOICE' | 'CHECKOUT' | 'TRAINING';
  senderName: string;
  phone?: string;
  text: string;
  time: string;
  timestamp: number;
}

interface BotOrder {
  orderId: string;
  productId: string;
  productName: string;
  amountPKR: number;
  fulfillmentType: string;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  verifiedAt?: string;
  trxReference?: string;
}

interface CustomerReport {
  id: string;
  customerName: string;
  customerPhone: string;
  customerJid: string;
  query: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
}

interface CustomKnowledgeRule {
  id: string;
  topic: string;
  customerQuestion: string;
  founderAnswer: string;
  createdAt: string;
}

interface DashboardApiData {
  isConnected: boolean;
  isBotActive: boolean;
  latestPairingCode?: string;
  latestQrDataUrl?: string;
  botPhoneNumber?: string;
  orders?: BotOrder[];
  reports?: CustomerReport[];
  activity?: BotActivity[];
  pausedUsers?: string[];
  customKnowledge?: CustomKnowledgeRule[];
  stats?: {
    isBotActive: boolean;
    pausedUsersCount: number;
    pendingReports: number;
    resolvedReports: number;
    totalActivity: number;
    customKnowledgeCount: number;
  };
}

const DEFAULT_BOT_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'http://localhost:3000';

export function AdminWhatsAppBot() {
  const [botUrl, setBotUrl] = useState<string>(DEFAULT_BOT_URL);
  const [urlInput, setUrlInput] = useState<string>(DEFAULT_BOT_URL);
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [data, setData] = useState<DashboardApiData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [online, setOnline] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'reports' | 'knowledge' | 'activity' | 'qr'>('orders');
  const [actionBusy, setActionBusy] = useState<boolean>(false);

  // States for changing WhatsApp number and resetting session
  const [changePhoneInput, setChangePhoneInput] = useState<string>('');
  const [relinkBusy, setRelinkBusy] = useState<boolean>(false);
  const [relinkStatusMsg, setRelinkStatusMsg] = useState<string | null>(null);

  // Form states for adding knowledge
  const [newTopic, setNewTopic] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  // Stable IDs for form inputs (avoids static/dynamic ID accessibility conflicts)
  const topicInputId = useId();
  const questionInputId = useId();
  const answerInputId = useId();

  // Load custom bot URL from localStorage if previously configured
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sasify_whatsapp_bot_url');
      if (saved) {
        setBotUrl(saved);
        setUrlInput(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveBotUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = urlInput.trim().replace(/\/+$/, '');
    if (!clean) return;
    setBotUrl(clean);
    try {
      localStorage.setItem('sasify_whatsapp_bot_url', clean);
    } catch {
      // ignore
    }
    setIsEditingUrl(false);
    fetchData(clean);
  };

  const fetchData = useCallback(
    async (targetUrl: string = botUrl) => {
      try {
        const res = await fetch(`${targetUrl}/api/dashboard-data`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to reach bot backend`);
        }

        const json: DashboardApiData = await res.json();
        setData(json);
        setOnline(true);
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Bot unreachable';
        setOnline(false);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [botUrl]
  );

  // Periodic polling every 3.5 seconds
  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      fetchData();
    }, 3500);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Master Bot Toggle (ON/OFF)
  const toggleBot = async () => {
    setActionBusy(true);
    try {
      const res = await fetch(`${botUrl}/api/toggle-bot`, { method: 'POST' });
      const json = await res.json();
      if (json.success && data) {
        setData({ ...data, isBotActive: json.isBotActive });
      }
      fetchData();
    } catch (e: unknown) {
      alert('Error toggling bot: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setActionBusy(false);
    }
  };

  // Toggle user pause
  const toggleUserPause = async (jid: string) => {
    try {
      const res = await fetch(`${botUrl}/api/toggle-user-pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid }),
      });
      await res.json();
      fetchData();
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Resolve customer report
  const resolveReport = async (reportId: string) => {
    try {
      const res = await fetch(`${botUrl}/api/resolve-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });
      await res.json();
      fetchData();
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Add custom knowledge rule
  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) {
      alert('Please fill out both the Customer Question and Official Answer.');
      return;
    }

    setFormSaving(true);
    setFormNotice(null);

    try {
      const res = await fetch(`${botUrl}/api/add-knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: newTopic.trim() || 'General',
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setNewQuestion('');
        setNewAnswer('');
        setFormNotice('Rule successfully taught to AI bot!');
        setTimeout(() => setFormNotice(null), 4000);
        fetchData();
      } else {
        alert('Failed to save rule: ' + (json.error || 'Unknown error'));
      }
    } catch (err: unknown) {
      alert('Network error saving rule: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setFormSaving(false);
    }
  };

  // Delete custom knowledge rule
  const handleDeleteKnowledge = async (id: string) => {
    if (!confirm('Are you sure you want to remove this trained rule?')) return;
    try {
      const res = await fetch(`${botUrl}/api/delete-knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await res.json();
      fetchData();
    } catch (e: unknown) {
      alert('Error deleting rule: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Change WhatsApp number or generate fresh QR
  const handleChangeNumber = async (qrOnly: boolean) => {
    const targetPhone = qrOnly ? '' : changePhoneInput.trim();
    if (!qrOnly && !targetPhone) {
      alert('Please enter the new phone number (with country code e.g. 923116185711), or click "Generate Fresh QR Code Only".');
      return;
    }

    if (!confirm(qrOnly ? 'Reset session and generate a brand new QR Code?' : `Reset session and generate pairing code for +${targetPhone}?`)) {
      return;
    }

    setRelinkBusy(true);
    setRelinkStatusMsg('Resetting session... Generating new code/QR...');

    try {
      const res = await fetch(`${botUrl}/api/change-number`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: targetPhone, mode: qrOnly ? 'qr' : 'pairing' }),
      });
      const json = await res.json();
      if (json.success) {
        setRelinkStatusMsg(json.message || 'Session reset initiated! Generating new code/QR...');
        setTimeout(() => fetchData(), 2500);
      } else {
        alert('Error: ' + (json.error || 'Failed to change number'));
      }
    } catch (err: unknown) {
      alert('Network error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setRelinkBusy(false);
    }
  };

  const pendingReportsCount = (data?.reports || []).filter((r) => r.status === 'PENDING').length;
  const pausedUsersCount = (data?.pausedUsers || []).length;
  const knowledgeCount = (data?.customKnowledge || []).length;
  const isBotActive = Boolean(data?.isBotActive);

  return (
    <div className="space-y-6">
      {/* Bot Server Connection Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              online ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                {online ? 'WhatsApp Bot Server Online' : 'Bot Server Offline / Unreachable'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                {botUrl}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {online
                ? data?.isConnected
                  ? 'WhatsApp Web Session Connected'
                  : 'WhatsApp Session Connecting...'
                : error || 'Check if the bot Node.js process or Cloud VPS is running.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditingUrl ? (
            <form onSubmit={saveBotUrl} className="flex items-center gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="e.g. http://localhost:3000 or https://bot.sasifysolutions.com"
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
              />
              <button
                type="submit"
                className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingUrl(false)}
                className="text-xs px-2 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditingUrl(true)}
                className="text-xs px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition"
              >
                <Settings className="w-3.5 h-3.5" />
                Change Endpoint
              </button>
              <button
                type="button"
                onClick={() => fetchData()}
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                title="Refresh Status"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Master Bot Switch Card */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Master Switch</span>
            <Bot className="w-5 h-5 text-blue-500" />
          </div>
          <div className="my-3">
            <span
              className={`text-2xl font-extrabold ${
                isBotActive ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {isBotActive ? 'ACTIVE (ON)' : 'PAUSED (OFF)'}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isBotActive
                ? 'Bot replies automatically to incoming queries'
                : 'Bot is muted. Human manual chat mode active'}
            </p>
          </div>
          <button
            type="button"
            disabled={actionBusy || !online}
            onClick={toggleBot}
            className={`w-full py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition ${
              isBotActive
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isBotActive ? 'Pause Bot (Switch to Manual)' : 'Activate Bot (Turn ON)'}
          </button>
        </div>

        {/* Customer Reports Card */}
        <div
          className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between ${
            pendingReportsCount > 0
              ? 'border-amber-300 bg-amber-500/5 dark:border-amber-900/40'
              : 'border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Support Escalations
            </span>
            <AlertTriangle
              className={`w-5 h-5 ${
                pendingReportsCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'
              }`}
            />
          </div>
          <div className="my-3">
            <span
              className={`text-3xl font-extrabold ${
                pendingReportsCount > 0 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              {pendingReportsCount}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Customers who clicked &quot;Report to Admin&quot;
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline text-left"
          >
            View customer reports &rarr;
          </button>
        </div>

        {/* Paused Individual Chats */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Paused User Chats
            </span>
            <UserX className="w-5 h-5 text-slate-400" />
          </div>
          <div className="my-3">
            <span className="text-3xl font-extrabold text-slate-700 dark:text-slate-200">
              {pausedUsersCount}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Chats where bot is paused for personal talk
            </p>
          </div>
          <span className="text-xs text-slate-400">Managed per-chat</span>
        </div>

        {/* Trained Rules & FAQs */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Trained Rules & FAQs
            </span>
            <BookOpen className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="my-3">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {knowledgeCount}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Founder rules overriding general AI
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('knowledge')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline text-left"
          >
            Add or edit trained answers &rarr;
          </button>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-emerald-600" />
          WhatsApp Orders
          {(data?.orders?.length || 0) > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
              {data?.orders?.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
            activeTab === 'reports'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Customer Reports
          {pendingReportsCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
              {pendingReportsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('knowledge')}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
            activeTab === 'knowledge'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-500" />
          Train Bot & FAQs
          <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
            {knowledgeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
            activeTab === 'activity'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-blue-500" />
          Live WhatsApp Activity
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qr')}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
            activeTab === 'qr'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <QrCode className="w-4 h-4 text-purple-500" />
          Link Device / Pairing
        </button>
      </div>

      {/* TAB 1: Customer Reports */}
      {activeTab === 'reports' && (
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                🚨 Customer Support Escalations
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customers who tapped &quot;Report to Admin&quot; or asked for human intervention.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchData()}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Reported Issue / Query</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(!data?.reports || data.reports.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      ✅ No pending customer reports! All systems running smoothly.
                    </td>
                  </tr>
                ) : (
                  data.reports.map((report) => {
                    const cleanPhone = report.customerPhone.replace(/[^0-9]/g, '');
                    const waLink = `https://wa.me/${cleanPhone}`;
                    const isPaused = (data.pausedUsers || []).includes(report.customerJid);

                    return (
                      <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {report.customerName}
                        </td>
                        <td className="p-3 font-mono text-slate-500">+{cleanPhone}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs break-words">
                          {report.query}
                        </td>
                        <td className="p-3 text-slate-400 whitespace-nowrap">
                          {new Date(report.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold ${
                              report.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {report.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 transition"
                            >
                              <ExternalLink className="w-3 h-3" />
                              WhatsApp
                            </a>
                            <button
                              type="button"
                              onClick={() => toggleUserPause(report.customerJid)}
                              className={`px-2 py-1 rounded border text-xs font-medium transition ${
                                isPaused
                                  ? 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-50'
                                  : 'border-rose-500/30 text-rose-600 hover:bg-rose-50'
                              }`}
                            >
                              {isPaused ? '▶️ Resume Bot' : '⏸️ Pause Bot'}
                            </button>
                            {report.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => resolveReport(report.id)}
                                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
                              >
                                Done
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Train Bot & FAQs */}
      {activeTab === 'knowledge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form */}
          <div className="lg:col-span-5 p-6 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              ⚡ Teach Bot Custom Reply
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              Add exact answers for device logins, refund policies, warranties, or special deals.
              These trained rules immediately override general guesses!
            </p>

            {formNotice && (
              <div className="p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {formNotice}
              </div>
            )}

            <form onSubmit={handleAddKnowledge} className="space-y-4 text-xs">
              <div>
                <label
                  htmlFor={topicInputId}
                  className="block font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Topic / Category (Optional)
                </label>
                <input
                  id={topicInputId}
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="e.g. Canva, CapCut, Delivery, Warranty"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor={questionInputId}
                  className="block font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Customer Question / Keyword *
                </label>
                <input
                  id={questionInputId}
                  type="text"
                  required
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="e.g. Canva kitne devices par chalta hai?"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor={answerInputId}
                  className="block font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Official Reply (AI will give this answer) *
                </label>
                <textarea
                  id={answerInputId}
                  required
                  rows={4}
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="e.g. Canva Pro 1 PC aur 1 Mobile phone par simultaneously work karta hai. Dono devices par smooth login hojata hai."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={formSaving}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                {formSaving ? 'Teaching Bot...' : '⚡ Teach Bot Now'}
              </button>
            </form>
          </div>

          {/* Right Column: Rules List */}
          <div className="lg:col-span-7 p-6 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  🧠 Active Custom Knowledge Rules ({knowledgeCount})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Live rules taught by Syed Sarosh that override default catalog answers.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-3">Topic</th>
                    <th className="p-3">Customer Question</th>
                    <th className="p-3">Official Bot Reply</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(!data?.customKnowledge || data.customKnowledge.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-400">
                        No custom rules trained yet. Use the form on the left to teach the bot!
                      </td>
                    </tr>
                  ) : (
                    data.customKnowledge.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                            {rule.topic || 'General'}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 max-w-[180px] break-words">
                          {rule.customerQuestion}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs break-words">
                          {rule.founderAnswer}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteKnowledge(rule.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Live WhatsApp Activity Stream */}
      {activeTab === 'activity' && (
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                💬 Real-Time WhatsApp Activity Feed
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Streaming incoming messages, voice transcripts, and AI responses.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchData()}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {(!data?.activity || data.activity.length === 0) ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No real-time messages recorded yet.
              </div>
            ) : (
              data.activity.map((act) => {
                let badge = '💬 Chat';
                let badgeStyle = 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
                if (act.type === 'REPORT') {
                  badge = '🚨 Escalation';
                  badgeStyle = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
                } else if (act.type === 'VOICE') {
                  badge = '🎙️ Voice Note';
                  badgeStyle = 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
                } else if (act.type === 'CHECKOUT') {
                  badge = '🛒 Checkout';
                  badgeStyle = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
                } else if (act.type === 'OUTGOING') {
                  badge = '🤖 Bot Reply';
                  badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
                } else if (act.type === 'TRAINING') {
                  badge = '🧠 Rule Trained';
                  badgeStyle = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
                }

                return (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold ${badgeStyle}`}>
                          {badge}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {act.senderName} {act.phone ? `(${act.phone})` : ''}
                        </span>
                      </div>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {act.time}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans break-words">
                      {act.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: WhatsApp Pairing Code & Change Number */}
      {activeTab === 'qr' && (
        <div className="space-y-6 max-w-xl mx-auto">
          {/* Change WhatsApp Number / Reset Card */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm text-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-1">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              Change WhatsApp Number / Generate New QR
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Agar aap WhatsApp number change karna chahte hain, ya kisi doosri device par fresh QR code scan karna chahte hain, toh yahan se session reset karein:
            </p>

            {relinkStatusMsg && (
              <div className="p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {relinkStatusMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New WhatsApp SIM Number (Optional, for Pairing Code):
                </label>
                <input
                  type="text"
                  value={changePhoneInput}
                  onChange={(e) => setChangePhoneInput(e.target.value)}
                  placeholder="e.g. 923116185711 (country code included)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={relinkBusy}
                  onClick={() => handleChangeNumber(false)}
                  className="flex-1 min-w-[180px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  {relinkBusy ? 'Connecting...' : '📲 Link New Number (Pairing Code)'}
                </button>
                <button
                  type="button"
                  disabled={relinkBusy}
                  onClick={() => handleChangeNumber(true)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg transition border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  📷 Fresh QR Code Only
                </button>
              </div>
            </div>
          </div>

          {/* Current Status, QR Code & Pairing Box */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm text-center">
            {data?.isConnected ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-sm mb-4 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                WhatsApp is Linked &amp; Active! (SIM: +{data.botPhoneNumber || '923116185711'})
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold mb-4">
                ⚠️ Waiting for WhatsApp connection... Scan QR or use pairing code below:
              </div>
            )}

            {/* Live Visual QR Code Image */}
            {data?.latestQrDataUrl && !data.isConnected && (
              <div className="my-6">
                <div className="inline-block p-3 bg-white rounded-2xl shadow-xl border-4 border-slate-100">
                  <img
                    src={data.latestQrDataUrl}
                    alt="WhatsApp QR Code"
                    className="w-64 h-64 mx-auto rounded-lg"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">
                  Scan this QR code with WhatsApp on your phone
                </p>
              </div>
            )}

            {/* Live Pairing Code Box */}
            {data?.latestPairingCode && (
              <div className="my-6">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  8-Digit WhatsApp Pairing Code:
                </p>
                <div className="p-5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-3xl font-extrabold tracking-widest my-3 select-all shadow-inner border border-slate-800">
                  {data.latestPairingCode}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="text-left bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl text-xs space-y-2 text-slate-600 dark:text-slate-400 mt-6 border border-slate-100 dark:border-slate-800">
              <p className="font-bold text-slate-800 dark:text-slate-200">Phone se connect karne ka tareeqa:</p>
              <ol className="list-decimal pl-4 space-y-1.5">
                <li>Apne phone par WhatsApp open karein</li>
                <li><b>Settings &gt; Linked Devices</b> par jayein</li>
                <li><b>Link a Device</b> tap karein</li>
                <li>Camera se upar wala QR code scan karein, ya <b>&quot;Link with phone number instead&quot;</b> par click karke 8-digit code daalein</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

