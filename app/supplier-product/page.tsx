'use client';

import { ArrowLeft, MessageCircle, ShoppingCart, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SiteFooter, SiteHeader } from '../components/site-chrome';

type SupplierProduct = { id:string; name:string; description?:string; price:number; available:number; provider_name?:string };

function productLogo(product: SupplierProduct) {
  if (/telegram/i.test(product.name)) return 'https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Ftelegram.org&sz=128';
  if (/amazon|netflix|prime video|stream/i.test(product.name)) return 'https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fprimevideo.com&sz=128';
  return '';
}

export default function SupplierProductPage() {
  const [product,setProduct] = useState<SupplierProduct|null>(null);
  const [loading,setLoading] = useState(true);
  useEffect(() => { const id = new URLSearchParams(window.location.search).get('product'); if (!id) { setLoading(false); return; } let active = true; fetch('/api/commerce?action=stock',{cache:'no-store'}).then((response) => response.ok ? response.json() : Promise.reject()).then((data:any) => { if (active) setProduct((data.products || []).find((item:SupplierProduct) => item.id === id && item.available > 0) || null); }).catch(() => {}).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);

  const description = product?.description || 'Product description is currently unavailable.';
  const logo = product ? productLogo(product) : '';
  return <main><SiteHeader /><div className="detail-shell supplier-detail-shell"><a href="/inventory" className="back-link"><ArrowLeft className="h-4 w-4" /> Full inventory</a>{loading ? <p className="supplier-loading">Loading product details...</p> : product ? <div className="detail-layout"><article className="detail-content"><div className="detail-identity"><div className="detail-logo-frame supplier-detail-logo">{logo ? <img src={logo} alt="" /> : '⚡'}</div><div><span className="section-kicker">Instant delivery</span><h1>{product.name}</h1><span className="detail-duration">{product.available} in stock</span></div></div><section className="description-section"><h2>Product description</h2><div className="supplier-description-raw">{description}</div><p>After payment verification, this product is fulfilled automatically. Availability and activation details are confirmed before delivery.</p></section></article><aside className="purchase-summary" aria-label="Product purchase options"><span className="section-kicker">Ready to order</span><h2>{product.name}</h2><div className="detail-prices"><div className="selling-price"><dt><Tag className="h-4 w-4" /> Our price</dt><dd>PKR {Number(product.price).toLocaleString('en-PK')}</dd></div><div><dt>Availability</dt><dd>{product.available} in stock</dd></div></div><a href={`/checkout?product=${encodeURIComponent(product.id)}`} className="primary-button detail-buy"><ShoppingCart className="h-5 w-5" /> Buy online</a><p className="order-footnote">WhatsApp support will be available after successful payment.</p><button type="button" className="whatsapp-purchase detail-buy" disabled><MessageCircle className="h-5 w-5" /> WhatsApp support <span>(after payment)</span></button></aside></div> : <section className="empty-state"><h1>Product unavailable</h1><p>This supplier product is no longer in stock.</p><a href="/inventory" className="primary-button">Back to inventory</a></section>}</div><SiteFooter /></main>;
}
