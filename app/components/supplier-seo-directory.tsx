
import { LocalizedContent } from './language';
import { Tag } from 'lucide-react';
import {
  supplierProductHref,
  supplierSeoProducts,
} from '../supplier-seo.ts';
import { supplierLogo, supplierMonogram } from '../supplier-product-utils.ts';

export function SupplierSeoDirectory() {
  if (!supplierSeoProducts.length) return null;
  return (
    <LocalizedContent><section className="supplier-store-section supplier-seo-directory" aria-labelledby="supplier-seo-directory-title">
      <div className="section-container">
        <div className="supplier-store-heading">
          <div>
            <span className="section-kicker">Instant delivery catalog</span>
            <h2 id="supplier-seo-directory-title">More digital products</h2>
            <p>
              Browse indexable supplier products with PKR pricing, live stock
              snapshots and automatic checkout links.
            </p>
          </div>
          <span className="secure-delivery">
            {supplierSeoProducts.length.toLocaleString('en-PK')} SEO pages
          </span>
        </div>
        <div className="supplier-product-grid">
          {supplierSeoProducts.map((product) => {
            const logo = supplierLogo(product.name, product.logoUrl);
            return (
              <a
                className="supplier-product-card supplier-seo-card"
                href={supplierProductHref(product)}
                key={product.slug}
              >
                <div className="supplier-product-top">
                  <span className="supplier-store-identity">
                    {logo ? (
                      <img src={logo} alt={`${product.name} logo`} loading="lazy" decoding="async" />
                    ) : (
                      <span aria-label={`${product.name} logo`}>
                        {supplierMonogram(product.name)}
                      </span>
                    )}
                    {product.category}
                  </span>
                </div>
                <h3>{product.name}</h3>
                <p>{product.description || 'Instant delivery digital product from Sasify Solutions.'}</p>
                <div className="supplier-product-footer">
                  <strong>
                    <Tag className="h-3.5 w-3.5" /> PKR{' '}
                    {product.price.toLocaleString('en-PK')}
                  </strong>
                  <span className="primary-button compact">View details</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section></LocalizedContent>
  );
}
