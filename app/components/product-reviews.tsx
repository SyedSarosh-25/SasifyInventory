'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Star,
  ShieldCheck,
  Camera,
  X,
  MessageSquarePlus,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  ChevronRight,
} from 'lucide-react';

type Screenshot = {
  url?: string;
  data?: string;
  filename?: string;
  type?: string;
};

type Review = {
  id: string;
  productId: string;
  productName?: string;
  customerName: string;
  rating: number;
  reviewText: string;
  screenshots: Screenshot[];
  isVerifiedBuyer: boolean;
  createdAt?: string;
};

type Props = {
  productId: string;
  productSlug?: string;
  productName: string;
  toolFamily?: string;
};

function formatDate(iso?: string): string {
  if (!iso) return 'Recent purchase';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Recent purchase';
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function ProductReviewsSection({
  productId,
  productSlug,
  productName,
  toolFamily,
}: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number>(5.0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState<Screenshot | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [orderId, setOrderId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [screenshotFiles, setScreenshotFiles] = useState<
    Array<{ filename: string; type: string; data: string }>
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ignore = false;
    const loadReviews = async () => {
      try {
        const query = new URLSearchParams({
          action: 'product-reviews',
          productId,
          ...(toolFamily ? { toolFamily } : {}),
        });
        const res = await fetch(`/api/commerce?${query.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (ignore) return;
        if (Array.isArray(data.reviews) && data.reviews.length > 0) {
          setReviews(data.reviews);
          setTotalCount(data.totalCount || data.reviews.length);
          setAverageRating(data.averageRating || 5.0);
        }
      } catch {
        // Fallback already mounted
      }
    };
    void loadReviews();
    return () => {
      ignore = true;
    };
  }, [productId, toolFamily]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const file = files[0];
    if (file.size > 800 * 1024) {
      setSubmitError('Screenshot image must be under 800 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setScreenshotFiles((prev) => [
        ...prev.slice(0, 1),
        {
          filename: file.name,
          type: file.type || 'image/png',
          data: result,
        },
      ]);
      setSubmitError(null);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeScreenshot = (index: number) => {
    setScreenshotFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setSubmitting(true);

    try {
      const payload = {
        productId,
        productName,
        customerName: name,
        rating,
        reviewText,
        orderId: orderId.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        screenshots: screenshotFiles,
      };

      const res = await fetch('/api/commerce?action=product-review-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review.');
      }

      setSubmitSuccess(
        'Shukriya! Your review and proof have been submitted for verification. It will appear on this page once approved by our team.',
      );
      setName('');
      setReviewText('');
      setOrderId('');
      setCustomerEmail('');
      setScreenshotFiles([]);
      setTimeout(() => {
        setIsFormOpen(false);
      }, 3500);
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const effectiveRating = hoverRating || rating;

  return (
    <section
      id="customer-reviews"
      className="description-section product-reviews-section"
      aria-labelledby="product-reviews-title"
    >
      <div className="product-reviews-header">
        <div>
          <span className="section-kicker">Verified customer feedback</span>
          <h2 id="product-reviews-title">Real Reviews & Delivery Proofs</h2>
          <div className="product-reviews-rating-bar">
            {totalCount > 0 ? (
              <>
                <span className="product-reviews-stars" aria-label={`${averageRating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, idx) => (
                    <Star
                      key={idx}
                      className="h-5 w-5"
                      fill={idx < Math.round(averageRating) ? '#f59e0b' : 'none'}
                      stroke={idx < Math.round(averageRating) ? '#f59e0b' : '#94a3b8'}
                    />
                  ))}
                </span>
                <span className="product-reviews-score">
                  <strong>{averageRating.toFixed(1)}</strong> / 5.0
                </span>
                <span className="product-reviews-count">
                  ({totalCount} {totalCount === 1 ? 'verified review' : 'verified reviews'})
                </span>
                <span className="product-reviews-verified-badge">
                  <ShieldCheck className="h-4 w-4" /> 100% Genuine Purchases
                </span>
              </>
            ) : (
              <span className="product-reviews-count">
                No reviews published yet for this plan · Be the first to share your experience
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="secondary-button product-reviews-write-btn"
          onClick={() => {
            setIsFormOpen(!isFormOpen);
            setSubmitSuccess(null);
            setSubmitError(null);
          }}
        >
          <MessageSquarePlus className="h-4 w-4" />
          {isFormOpen ? 'Cancel review' : 'Write a review & add proof'}
        </button>
      </div>

      {isFormOpen && (
        <form
          className="product-review-form-panel"
          onSubmit={handleSubmit}
          aria-label="Submit a customer review"
        >
          <h3>Share your experience with {productName}</h3>
          <p>
            Help other customers in Pakistan with your honest review. You can also upload a
            screenshot of your WhatsApp delivery confirmation or activated account.
          </p>

          {submitError && (
            <div className="review-alert error" role="alert">
              <AlertCircle className="h-4 w-4" />
              <span>{submitError}</span>
            </div>
          )}

          {submitSuccess && (
            <div className="review-alert success" role="status">
              <CheckCircle2 className="h-4 w-4" />
              <span>{submitSuccess}</span>
            </div>
          )}

          <div className="review-form-rating-selector">
            <span>Your rating:</span>
            <div className="star-picker" role="radiogroup" aria-label="Select star rating">
              {Array.from({ length: 5 }, (_, index) => {
                const starVal = index + 1;
                return (
                  <button
                    key={starVal}
                    type="button"
                    className="star-btn"
                    onClick={() => setRating(starVal)}
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${starVal} star${starVal > 1 ? 's' : ''}`}
                  >
                    <Star
                      className="h-6 w-6"
                      fill={starVal <= effectiveRating ? '#f59e0b' : 'none'}
                      stroke={starVal <= effectiveRating ? '#f59e0b' : '#cbd5e1'}
                    />
                  </button>
                );
              })}
              <span className="star-picker-label">
                {rating === 5
                  ? 'Excellent (5/5)'
                  : rating === 4
                    ? 'Very Good (4/5)'
                    : rating === 3
                      ? 'Average (3/5)'
                      : rating === 2
                        ? 'Below Average (2/5)'
                        : 'Poor (1/5)'}
              </span>
            </div>
          </div>

          <div className="review-form-grid">
            <label>
              Your name <span className="req">*</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Usman Ali"
                required
                maxLength={80}
              />
            </label>
            <label>
              Order ID or registered email <span>(optional, for verified badge)</span>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. ord-1234 or your email"
                maxLength={100}
              />
            </label>
          </div>

          <label>
            Your review <span className="req">*</span>
            <textarea
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="How was the delivery speed, account stability, and customer service?"
              required
              minLength={5}
              maxLength={2000}
            />
          </label>

          <div className="review-screenshot-upload">
            <span className="upload-label">
              <Camera className="h-4 w-4" /> Add proof screenshot{' '}
              <small>(WhatsApp chat or account activation, max 800 KB)</small>
            </span>
            <div className="upload-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="review-screenshot-input"
              />
              <button
                type="button"
                className="secondary-button compact upload-browse-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={screenshotFiles.length >= 2}
              >
                Choose image file
              </button>
            </div>

            {screenshotFiles.length > 0 && (
              <div className="review-screenshot-previews">
                {screenshotFiles.map((file, idx) => (
                  <div key={idx} className="preview-pill">
                    <img src={file.data} alt="Screenshot preview" />
                    <span>{file.filename}</span>
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() => removeScreenshot(idx)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="review-form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={submitting || !name || !reviewText}
            >
              {submitting ? 'Submitting review...' : 'Submit review for verification'}
            </button>
          </div>
        </form>
      )}

      <div className="product-reviews-grid">
        {reviews.map((review) => {
          const initials = review.customerName
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'C';

          return (
            <article key={review.id} className="product-review-card">
              <div className="product-review-card-header">
                <div className="review-author">
                  <span className="review-avatar" aria-hidden="true">
                    {initials}
                  </span>
                  <div>
                    <h4>{review.customerName}</h4>
                    <span className="review-date">{formatDate(review.createdAt)}</span>
                  </div>
                </div>

                {review.isVerifiedBuyer && (
                  <span className="review-verified-tag">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified Purchase
                  </span>
                )}
              </div>

              <div
                className="review-stars-row"
                aria-label={`${review.rating} out of 5 stars`}
              >
                {Array.from({ length: 5 }, (_, idx) => (
                  <Star
                    key={idx}
                    className="h-4 w-4"
                    fill={idx < review.rating ? '#f59e0b' : 'none'}
                    stroke={idx < review.rating ? '#f59e0b' : '#94a3b8'}
                  />
                ))}
              </div>

              <p className="product-review-text">{review.reviewText}</p>

              {review.screenshots && review.screenshots.length > 0 && (
                <div className="product-review-screenshots-tray">
                  {review.screenshots.map((shot, sIdx) => {
                    const src = shot.url || shot.data;
                    if (!src) return null;
                    return (
                      <button
                        key={sIdx}
                        type="button"
                        className="review-screenshot-thumb"
                        onClick={() => setActiveScreenshot(shot)}
                        aria-label="View delivery proof screenshot"
                      >
                        <img
                          src={src}
                          alt="Customer delivery proof screenshot"
                          loading="lazy"
                        />
                        <span className="zoom-badge">
                          <Maximize2 className="h-3 w-3" /> View Proof
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {reviews.length === 0 && (
        <div className="product-reviews-empty">
          <p>No reviews submitted for this specific plan yet.</p>
          <button
            type="button"
            className="primary-button compact"
            onClick={() => setIsFormOpen(true)}
          >
            Be the first to review this product
          </button>
        </div>
      )}

      {/* Lightbox Dialog */}
      {activeScreenshot && (
        <div
          className="review-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Delivery proof image viewer"
          onClick={() => setActiveScreenshot(null)}
        >
          <div
            className="review-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="review-lightbox-topbar">
              <span className="lightbox-title">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Real Customer Delivery Proof
              </span>
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setActiveScreenshot(null)}
                aria-label="Close proof preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="review-lightbox-image-wrap">
              <img
                src={activeScreenshot.url || activeScreenshot.data}
                alt="Enlarged customer delivery proof screenshot"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
