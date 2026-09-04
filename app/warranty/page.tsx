import { PolicyPage, policyMetadata } from '../components/policy-page';

const description = 'Read Sasify Solutions warranty periods, coverage confirmation and the steps for requesting warranty support.';
export const metadata = policyMetadata('Warranty Policy', description, '/warranty');

export default function WarrantyPage() {
  return <PolicyPage title="Warranty Policy" summary="All products come with a warranty period. The exact duration depends on the package and must be confirmed before payment." path="/warranty">
    <section className="policy-section"><h2>Warranty periods</h2>
      <ul className="policy-list">
        <li><strong>One-month and 30-day packages:</strong> a full 25-day warranty from Sasify Solutions.</li>
        <li><strong>Yearly and other-duration packages:</strong> confirm the warranty duration and coverage in the WhatsApp order conversation before payment.</li>
        <li><strong>Credits and allocation packages:</strong> confirm both the usable allocation and warranty terms before payment.</li>
      </ul>
      <p>An access period is not automatically the warranty period. For example, a one-year plan does not by itself include a one-year warranty.</p>
    </section>
    <section className="policy-section"><h2>What is covered</h2>
      <p>Coverage is limited to the remedy and conditions written in your Sasify Solutions order confirmation. Confirm activation requirements, account or invite conditions, supported devices, provider limits and the available remedy before paying.</p>
    </section>
    <section className="policy-section"><h2>Requesting support</h2>
      <ol className="policy-list">
        <li>Contact +923116185711 on WhatsApp during the confirmed warranty period.</li>
        <li>Share the product name, listing reference, order date and a clear description of the issue.</li>
        <li>Do not send passwords, payment PINs or one-time verification codes.</li>
      </ol>
    </section>
  </PolicyPage>;
}
