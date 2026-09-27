import { ArrowUpRight, BriefcaseBusiness, Code2, GraduationCap, Layers3, Palette, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { storefrontCategories } from '../categories';
import { LocalizedContent } from './language';

const symbols = { sparkles: Sparkles, palette: Palette, code: Code2, briefcase: BriefcaseBusiness, layers: Layers3, shield: ShieldCheck, graduation: GraduationCap, play: Play };
export function CategoryDiscovery({ compact = false }: { compact?: boolean }) {
  const categories = compact ? storefrontCategories.slice(0, 6) : storefrontCategories;
  return <LocalizedContent><section className={`category-discovery${compact ? ' is-compact' : ''}`} aria-labelledby="category-discovery-title">
    <div className="section-inner">
      <div className="section-heading">
        <div><span className="section-kicker">Browse by what you want to do</span><h2 id="category-discovery-title">A better way to find your next tool.</h2><p>Compare access, duration and pricing in one place.</p></div>
        {compact && <a className="category-all-link" href="/categories">Categories <ArrowUpRight size={17} /></a>}
      </div>
      <div className="discovery-grid">{categories.map(category => {
        const Icon = symbols[category.symbol];
        return <a href={`/categories/${category.slug}`} className="discovery-card" key={category.slug}>
          <span className="discovery-icon"><Icon size={23} aria-hidden="true" /></span>
          <h3>{category.title}</h3><p>{category.description}</p><ArrowUpRight className="discovery-arrow" size={18} aria-hidden="true" />
        </a>;
      })}</div>
    </div>
  </section></LocalizedContent>;
}
