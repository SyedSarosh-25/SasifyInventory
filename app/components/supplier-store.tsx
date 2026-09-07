'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, ShoppingCart, Zap } from 'lucide-react';

type Product = { id:string; name:string; description:string; price:number; available:number; source:string; provider_name?:string };

export function SupplierStore() {
  const [products,setProducts]=useState<Product[]>([]), [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;fetch('/api/commerce?action=stock',{cache:'no-store'}).then((r)=>r.ok?r.json():Promise.reject()).then((data:any)=>{if(active)setProducts((data.products||[]).filter((p:Product)=>p.source==='supplier'));}).catch(()=>{}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  if (!loading && !products.length) return null;
  return <section className="supplier-store-section"><div className="section-container"><div className="supplier-store-heading"><div><span className="section-kicker"><Zap size={15}/> Automated store</span><h1>Instant Delivery Products</h1><p>Pay online and receive your purchase automatically after payment verification.</p></div><span className="secure-delivery"><ShieldCheck size={18}/> Secure checkout</span></div>{loading?<div className="supplier-loading"><RefreshCw size={20}/><span>Checking live products...</span></div>:<div className="supplier-product-grid">{products.map((product)=><article className="supplier-product-card" key={product.id}><div className="supplier-product-top"><span>{product.provider_name || 'Instant delivery'}</span><strong className={product.available?'in-stock':'out-stock'}>{product.available} available</strong></div><h2>{product.name}</h2><p>{product.description}</p><div className="supplier-product-footer"><strong>PKR {Number(product.price).toLocaleString()}</strong>{product.available>0?<a className="primary-button compact" href={`/checkout?product=${encodeURIComponent(product.id)}`}><ShoppingCart size={17}/> Buy online</a>:<span className="sold-out-label">Sold out</span>}</div></article>)}</div>}</div></section>;
}
