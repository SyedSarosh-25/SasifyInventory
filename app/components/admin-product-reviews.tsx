'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Star,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Camera,
  X,
  Maximize2,
  Filter,
  Gift,
} from 'lucide-react';
import { products } from '../products';

type Screenshot = {
  url?: string;
  data?: string;
  filename?: string;
  type?: string;
};

type Review = {
  id: string;
  product_id: string;
  product_name?: string;
  customer_name: string;
  rating: number;
  review_text: string;
  screenshots: Screenshot[];
  customer_email?: string | null;
  order_id?: string | null;
  is_verified_buyer: boolean;
  status: 'pending' | 'approved' | 'rejected';
  wallet_reward_amount?: number;
  wallet_reward_credited?: boolean;
  wallet_reward_account_id?: string | null;
  created_at: string;
  reviewed_at?: string | null;
};

type Props = {
  reviews: Review[];
  api: (action: string, token: string, body?: any) => Promise<any>;
  token: string;
  busy: boolean;
  onRefresh: () => Promise<void>;
};

export function AdminProductReviews({
  reviews = [],
  api,
  token,
  busy,
  onRefresh,
}: Props) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeProof, setActiveProof] = useState<string | null>(null);

  // Add review form state
  const [selectedProductId, setSelectedProductId] = useState('p093');
  const [customProductName, setCustomProductName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [creditWalletOnCreate, setCreditWalletOnCreate] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [uploadedScreenshots, setUploadedScreenshots] = useState<
    Array<{ filename: string; type: string; data: string }>
  >([]);
  const [selectedProofTemplate, setSelectedProofTemplate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingCount = useMemo(
    () => reviews.filter((r) => r.status === 'pending').length,
    [reviews],
  );

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchProduct =
        productFilter === 'all' ||
        r.product_id === productFilter ||
        (r.product_name && r.product_name.toLowerCase().includes(productFilter.toLowerCase()));
      const matchSearch =
        !search ||
        r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        r.review_text.toLowerCase().includes(search.toLowerCase()) ||
        r.product_id.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchProduct && matchSearch;
    });
  }, [reviews, filterStatus, productFilter, search]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const file = files[0];
    if (file.size > 800 * 1024) {
      setFormError('Screenshot image must be under 800 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setUploadedScreenshots((prev) => [
        ...prev.slice(0, 1),
        {
          filename: file.name,
          type: file.type || 'image/png',
          data: result,
        },
      ]);
      setFormError(null);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      const prod = products.find((p) => p.id === selectedProductId);
      const prodName = customProductName || prod?.name || selectedProductId;

      const screenshots = [...uploadedScreenshots];
      if (selectedProofTemplate) {
        screenshots.push({
          filename: 'deal-proof.webp',
          type: 'image/webp',
          data: selectedProofTemplate,
        });
      }

      await api('admin-product-review-create', token, {
        productId: selectedProductId,
        productName: prodName,
        customerName,
        customerEmail: customerEmail.trim() || undefined,
        creditWallet: creditWalletOnCreate,
        rating,
        reviewText,
        screenshots,
      });

      setShowAddModal(false);
      setCustomerName('');
      setCustomerEmail('');
      setCreditWalletOnCreate(false);
      setReviewText('');
      setUploadedScreenshots([]);
      setSelectedProofTemplate('');
      await onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create review.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateStatus = async (reviewId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await api('admin-product-review-update', token, { id: reviewId, status });
      if (res.rewardResult?.credited) {
        alert(`Review approved! Rs. 50 wallet reward automatically credited to ${res.rewardResult.accountEmail}.`);
      }
      await onRefresh();
    } catch (err: any) {
      alert(`Error updating review: ${err.message || err}`);
    }
  };

  const handleCreditWallet = async (review: Review) => {
    let email = (review.customer_email || '').trim();
    if (!email) {
      const input = prompt('Enter registered Sasify account email to credit Rs. 50:');
      if (!input || !input.trim()) return;
      email = input.trim();
    }
    try {
      const res = await api('admin-product-review-credit-wallet', token, {
        id: review.id,
        customerEmail: email,
      });
      alert(`Success! Rs. 50 credited to wallet of ${res.accountEmail || email}.`);
      await onRefresh();
    } catch (err: any) {
      alert(`Error crediting wallet: ${err.message || err}`);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return;
    try {
      await api('admin-product-review-delete', token, { id: reviewId });
      await onRefresh();
    } catch (err: any) {
      alert(`Error deleting review: ${err.message || err}`);
    }
  };

  return (
    <div className="admin-workspace">
      <section className="admin-panel">
        <div className="panel-heading">
          <div>
            <span className="admin-eyebrow">Customer Social Proof</span>
            <h2>Product Reviews & Proof Screenshots</h2>
            <p>
              Manage verified customer reviews, review pending submissions from buyers, and upload WhatsApp delivery proof screenshots.
            </p>
          </div>
          <button
            type="button"
            className="primary-button compact"
            onClick={() => setShowAddModal(true)}
            disabled={busy}
          >
            <Plus className="h-4 w-4" /> Add Review & Proof
          </button>
        </div>

        <div className="admin-filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '16px 0' }}>
          <div className="filter-group" style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({reviews.length})
            </button>
            <button
              type="button"
              className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
              onClick={() => setFilterStatus('pending')}
            >
              Pending {pendingCount > 0 && <span className="counter-badge amber">{pendingCount}</span>}
            </button>
            <button
              type="button"
              className={`filter-btn ${filterStatus === 'approved' ? 'active' : ''}`}
              onClick={() => setFilterStatus('approved')}
            >
              Approved ({reviews.filter((r) => r.status === 'approved').length})
            </button>
            <button
              type="button"
              className={`filter-btn ${filterStatus === 'rejected' ? 'active' : ''}`}
              onClick={() => setFilterStatus('rejected')}
            >
              Rejected ({reviews.filter((r) => r.status === 'rejected').length})
            </button>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <input
              type="search"
              placeholder="Search reviewer or comment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input-compact"
              style={{ width: '220px' }}
            />
          </div>
        </div>

        <div className="commerce-table reviews-admin-table-wrap">
          {filteredReviews.length === 0 ? (
            <p className="admin-empty-notice">No reviews found matching the selected filter.</p>
          ) : (
            <table className="reviews-admin-table admin-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Rating</th>
                  <th>Feedback & Proof</th>
                  <th>Wallet Reward</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map((review) => {
                  const proofSrc = review.screenshots?.[0]?.url || review.screenshots?.[0]?.data;
                  return (
                    <tr key={review.id}>
                      <td>
                        <span className={`status-badge status-${review.status}`}>
                          {review.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'grid', gap: '2px' }}>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{review.customer_name}</strong>
                          {review.customer_email && (
                            <span style={{ fontSize: '0.75rem', color: '#2563eb', wordBreak: 'break-all' }}>
                              {review.customer_email}
                            </span>
                          )}
                          {review.is_verified_buyer && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
                              <ShieldCheck className="h-3 w-3 inline" /> Verified buyer
                            </span>
                          )}
                          {review.order_id && (
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              Ord: {review.order_id}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'grid', gap: '2px' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{review.product_name || review.product_id}</strong>
                          <code style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {review.product_id}
                          </code>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#f59e0b', fontWeight: 700, fontSize: '0.88rem' }}>
                          {review.rating} <Star className="h-3.5 w-3.5" fill="#f59e0b" />
                        </span>
                      </td>
                      <td style={{ maxWidth: '300px' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '0.85rem' }}>{review.review_text}</p>
                        {proofSrc && (
                          <button
                            type="button"
                            className="proof-thumb-preview"
                            onClick={() => setActiveProof(proofSrc)}
                            title="Click to view full screenshot"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#f8fafc',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            <img
                              src={proofSrc}
                              alt="Proof preview"
                              style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                            <span>View Proof</span>
                            <Maximize2 className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                      <td>
                        {review.wallet_reward_credited ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                            }}
                          >
                            <Gift className="h-3.5 w-3.5" /> Rs. {review.wallet_reward_amount || 50} Credited
                          </span>
                        ) : review.screenshots && review.screenshots.length > 0 ? (
                          <div style={{ display: 'grid', gap: '4px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                              }}
                            >
                              <Gift className="h-3 w-3" /> Proof (Rs. 50)
                            </span>
                            <button
                              type="button"
                              className="action-btn success"
                              title={review.customer_email ? `Credit Rs. 50 to ${review.customer_email}` : 'Enter email and credit Rs. 50'}
                              onClick={() => handleCreditWallet(review)}
                              disabled={busy}
                              style={{
                                width: 'auto',
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                height: 'auto',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Gift className="h-3 w-3" /> Credit Rs. 50
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No proof</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#64748b' }}>
                        {review.created_at ? new Date(review.created_at).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {review.status !== 'approved' && (
                            <button
                              type="button"
                              className="action-btn success"
                              title="Approve Review"
                              onClick={() => handleUpdateStatus(review.id, 'approved')}
                              disabled={busy}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {review.status !== 'rejected' && (
                            <button
                              type="button"
                              className="action-btn warning"
                              title="Reject Review"
                              onClick={() => handleUpdateStatus(review.id, 'rejected')}
                              disabled={busy}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="action-btn danger"
                            title="Delete Permanently"
                            onClick={() => handleDelete(review.id)}
                            disabled={busy}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Modal to add a verified review with screenshot */}
      {showAddModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="admin-modal-header">
              <h3>Add Verified Customer Review & Proof</h3>
              <button type="button" onClick={() => setShowAddModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && <p className="admin-error-notice">{formError}</p>}

            <form onSubmit={handleCreateReview} className="admin-form-vertical">
              <label>
                Select Product
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                >
                  <optgroup label="Local Inventory Tools">
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Other Tool Categories">
                    <option value="canva-pro-1-year">Canva Pro 1 Year</option>
                    <option value="capcut-pro-1-year">CapCut Pro 1 Year</option>
                    <option value="github-copilot-1-year">GitHub Copilot</option>
                    <option value="figma-pro-1-year">Figma Pro</option>
                    <option value="cursor-pro">Cursor Pro</option>
                  </optgroup>
                </select>
              </label>

              <label>
                Customer Name
                <input
                  type="text"
                  placeholder="e.g. Abdulrehman Jamil"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </label>

              <label>
                Customer Sasify Email (Optional - for Rs. 50 wallet reward)
                <input
                  type="email"
                  placeholder="e.g. user@gmail.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </label>

              {customerEmail.trim() && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#047857' }}>
                  <input
                    type="checkbox"
                    checked={creditWalletOnCreate}
                    onChange={(e) => setCreditWalletOnCreate(e.target.checked)}
                  />
                  <span>🎁 Automatically credit Rs. 50 bonus into customer&apos;s Sasify wallet</span>
                </label>
              )}

              <label>
                Star Rating
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                >
                  <option value={5}>5 Stars - Excellent</option>
                  <option value={4}>4 Stars - Very Good</option>
                  <option value={3}>3 Stars - Good</option>
                  <option value={2}>2 Stars - Fair</option>
                  <option value={1}>1 Star - Poor</option>
                </select>
              </label>

              <label>
                Review / Feedback Text
                <textarea
                  rows={3}
                  placeholder="Customer feedback, delivery praise, account stability comments..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  required
                />
              </label>

              <div className="screenshot-field">
                <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Delivery / WhatsApp Proof Screenshot
                </span>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="secondary-button compact"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" /> Upload from Computer
                  </button>

                  <select
                    value={selectedProofTemplate}
                    onChange={(e) => setSelectedProofTemplate(e.target.value)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    <option value="">Or Pick from Deal Proofs gallery...</option>
                    {Array.from({ length: 13 }, (_, i) => {
                      const num = String(i + 1).padStart(2, '0');
                      return (
                        <option key={num} value={`/deal-proofs/proof-${num}.webp`}>
                          Gallery Proof #{num}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {(uploadedScreenshots.length > 0 || selectedProofTemplate) && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    {uploadedScreenshots.map((shot, idx) => (
                      <div key={idx} className="preview-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '6px' }}>
                        <img src={shot.data} alt="Preview" style={{ width: '32px', height: '32px', objectFit: 'cover' }} />
                        <span style={{ fontSize: '0.75rem' }}>{shot.filename}</span>
                        <button type="button" onClick={() => setUploadedScreenshots([])}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {selectedProofTemplate && (
                      <div className="preview-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '6px' }}>
                        <img src={selectedProofTemplate} alt="Proof" style={{ width: '32px', height: '32px', objectFit: 'cover' }} />
                        <span style={{ fontSize: '0.75rem' }}>{selectedProofTemplate}</span>
                        <button type="button" onClick={() => setSelectedProofTemplate('')}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={formSubmitting || !customerName || !reviewText}
                >
                  {formSubmitting ? 'Publishing...' : 'Publish Verified Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Lightbox */}
      {activeProof && (
        <div className="admin-modal-backdrop" onClick={() => setActiveProof(null)}>
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', padding: '12px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong>Proof Screenshot</strong>
              <button type="button" onClick={() => setActiveProof(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={activeProof}
              alt="Full size screenshot"
              style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
