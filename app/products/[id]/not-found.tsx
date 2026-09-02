import { SiteFooter, SiteHeader } from '../../components/site-chrome';

export default function ProductNotFound() {
  return <main><SiteHeader /><section className="detail-shell missing-product">
    <h1>Product not found</h1><p>This product link is no longer available.</p>
    <a href="/#catalog" className="primary-button">Browse all products</a>
  </section><SiteFooter /></main>;
}
