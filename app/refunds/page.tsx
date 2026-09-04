import { PolicyPage, policyMetadata } from '../components/policy-page';

const description = 'Understand how Sasify Solutions handles refund eligibility, order issues and resolution requests for digital tool packages.';
export const metadata = policyMetadata('Refund and Resolution Policy', description, '/refunds');

export default function RefundsPage() {
  return <PolicyPage title="Refund and Resolution Policy" summary="Digital access is arranged manually through WhatsApp. Refund eligibility is not automatic and must be confirmed with the terms of the exact listing before payment." path="/refunds">
    <section className="policy-section"><h2>Before you pay</h2>
      <p>The website does not take checkout payments. Ask our team to confirm the exact product, access type, duration, availability, activation steps, warranty coverage and available remedy in writing on WhatsApp.</p>
    </section>
    <section className="policy-section"><h2>When an issue occurs</h2>
      <p>Contact Sasify Solutions promptly with the product name, listing reference, order date and issue details. We will assess the request against the written order confirmation and applicable warranty terms. A replacement, correction or refund is provided only when confirmed as the applicable remedy.</p>
    </section>
    <section className="policy-section"><h2>Refund method and timing</h2>
      <p>If a refund is approved, its amount, payment method and expected processing time will be confirmed in the support conversation. Provider reference prices and displayed savings do not determine the refund amount.</p>
    </section>
    <section className="policy-section"><h2>Keep your confirmation</h2>
      <p>Retain the WhatsApp order confirmation and payment record. Do not share passwords, payment PINs or one-time verification codes when requesting support.</p>
    </section>
  </PolicyPage>;
}
