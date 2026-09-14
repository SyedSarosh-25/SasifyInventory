import { PolicyPage, policyMetadata } from '../components/policy-page';

const description = 'Read Sasify Solutions warranty periods, coverage confirmation and the steps for requesting warranty support.';
export const metadata = policyMetadata('Warranty Policy', description, '/warranty');

export default function WarrantyPage() {
  return <PolicyPage title="Warranty Policy" summary="Every plan except ChatGPT includes a full warranty from Sasify Solutions for its entire duration. ChatGPT retains the warranty stated for its selected account option." path="/warranty" updated="14 September 2026">
    <section className="policy-section"><h2>Warranty periods</h2>
      <ul className="policy-list">
        <li><strong>ChatGPT:</strong> the Ultra Stable Apple Pay account keeps its full 25-day warranty. Other ChatGPT account options retain their listed warranty terms.</li>
        <li><strong>All other plans:</strong> warranty covers the complete purchased plan duration. A one-month plan has a one-month warranty, a six-month plan has a six-month warranty, and a one-year plan has a one-year warranty.</li>
        <li><strong>Credits and allocation packages:</strong> full warranty applies throughout the package&apos;s validity period. The purchased credit or usage allowance remains the same.</li>
      </ul>
      <p>This warranty is provided by Sasify Solutions for both local and supplier-sourced plans. For non-ChatGPT plans, it covers the full plan duration even when the upstream supplier provides a shorter warranty.</p>
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
