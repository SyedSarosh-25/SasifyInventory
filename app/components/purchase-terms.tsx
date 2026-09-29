import type { ReactNode } from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';

export function PurchaseTerms({ children, mobileOnly = false }: { children: ReactNode; mobileOnly?: boolean }) {
  return <>
    {!mobileOnly && <div className="purchase-terms-desktop">{children}</div>}
    <details className="purchase-terms-mobile">
      <summary>
        <ShieldCheck aria-hidden="true" />
        <span><strong>Read before purchasing</strong><small>Requirements, activation and warranty terms</small></span>
        <ChevronDown className="purchase-terms-chevron" aria-hidden="true" />
      </summary>
      <div className="purchase-terms-body">{children}</div>
    </details>
  </>;
}
