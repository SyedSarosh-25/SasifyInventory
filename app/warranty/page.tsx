import { PolicyPage, policyMetadata } from '../components/policy-page';

const description = 'Read Sasify Solutions warranty periods, coverage confirmation and the steps for requesting warranty support.';
export const metadata = policyMetadata('Warranty Policy', description, '/warranty');

export default function WarrantyPage() {
  return <PolicyPage title="Warranty Policy" summary="Warranty terms and coverage are specific to each product listing. ChatGPT retains the warranty stated for its selected account option." path="/warranty" updated="14 September 2026">
    <section className="policy-section"><h2>Warranty periods</h2>
      <ul className="policy-list">
        <li><strong>ChatGPT:</strong> the Ultra Stable Apple Pay account keeps its full 30-day warranty. Other ChatGPT account options retain their listed warranty terms.</li>
        <li><strong>Other plans:</strong> refer to the individual product listing for the stated warranty period, coverage and any activation conditions.</li>
        <li><strong>Credits and allocation packages:</strong> warranty coverage depends on the specific package and its stated validity, redemption and usage conditions.</li>
      </ul>
      <p>Sasify Solutions reviews support requests against the individual listing terms, payment record and delivery record. Supplier-sourced products retain their own stated warranty conditions.</p>
    </section>
    <section className="policy-section"><h2>What is covered</h2>
      <p>Contact us for access, activation or subscription issues during the warranty period. Follow the listed activation requirements, account or invite conditions, supported-device limits and usage rules. We assess issues and arrange the applicable correction, replacement or resolution through order support.</p>
    </section>
    <section className="policy-section"><h2>Requesting support</h2>
      <ol className="policy-list">
        <li>Use the WhatsApp support button shown with your order during the confirmed warranty period.</li>
        <li>Share the product name, listing reference, order date and a clear description of the issue.</li>
        <li>Do not send passwords, payment PINs or one-time verification codes.</li>
      </ol>
    </section>
  </PolicyPage>;
}
