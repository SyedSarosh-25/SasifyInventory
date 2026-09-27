'use client';
import { requestLiveStock } from '../live-stock-request.mjs';
import { LocalizedContent } from './language';

import { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, ShoppingCart, Zap } from 'lucide-react';
import { supplierLogo, supplierMonogram } from '../supplier-product-utils';
import { isChatGptPlusProduct } from '../catalog-selection';
import { cacheSupplierCatalog } from '../supplier-catalog-cache';
import { Money } from './currency';

type Product = { id:string; name:string; description:string; price:number; available:number; source:string; provider_name?:string; logo_url?:string };

export function SupplierStore() {
  const [products,setProducts]=useState<Product[]>([]), [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;requestLiveStock().then((r)=>r.ok?r.json():Promise.reject()).then((data:any)=>{cacheSupplierCatalog(data.products || []);if(active)setProducts((data.products||[]).filter((p:Product)=>p.source==='supplier'&&!isChatGptPlusProduct(p.name)));}).catch(()=>{}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  if (!loading && !products.length) return null;
  return <LocalizedContent><section className="supplier-store-section"><div className="section-container"><div className="supplier-store-heading"><div><span className="section-kicker"><Zap size={15}/> Automated store</span><h1>Instant Delivery Products</h1><p>Pay here and receive your purchase automatically after payment verification.</p></div><span className="secure-delivery"><ShieldCheck size={18}/> Secure checkout</span></div>{loading?<div className="supplier-loading"><RefreshCw size={20}/><span>Loading stored supplier catalog...</span></div>:<div className="supplier-product-grid">{products.map((product)=>{const logo=supplierLogo(product.name,product.logo_url);return <article className="supplier-product-card" key={product.id}><div className="supplier-product-top"><span className="supplier-store-identity">{logo?<img src={logo} alt={`${product.name} logo`} />:<span aria-label={`${product.name} logo`}>{supplierMonogram(product.name)}</span>}{product.provider_name || 'Instant delivery'}</span><strong className={product.available?'in-stock':'out-stock'}>{product.available} available</strong></div><h2>{product.name}</h2><p>{product.description || 'Supplier description unavailable for this listing.'}</p><div className="supplier-product-footer"><strong><Money amount={product.price} /></strong>{product.available>0?<a className="primary-button compact" href={`/checkout?product=${encodeURIComponent(product.id)}`}><ShoppingCart size={17}/> Buy online</a>:<span className="sold-out-label">Sold out</span>}</div></article>})}</div>}</div></section></LocalizedContent>;
}
