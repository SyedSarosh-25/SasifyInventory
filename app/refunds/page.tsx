import { PolicyPage, policyMetadata } from '../components/policy-page';

const description = 'Understand how Sasify Solutions handles refund eligibility, order issues and resolution requests for digital tool packages.';
export const metadata = policyMetadata('Refund and Resolution Policy', description, '/refunds');

export default function RefundsPage() {
  return <PolicyPage title="Refund and Resolution Policy" summary="Digital purchases are paid online, verified before delivery and supported through the order screen when an issue occurs." path="/refunds">
    <section className="policy-section"><h2>Before you pay</h2>
      <p>Review the exact product, access type, duration, availability, activation steps and warranty coverage on the product page before paying through secure checkout. The checkout total and payment instructions shown for your order control the transaction.</p>
    </section>
    <section className="policy-section"><h2>When an issue occurs</h2>
      <p>Use the WhatsApp support button shown with your order promptly and include the product name, listing reference, order date and issue details. We will assess the request against the payment record, delivery record and applicable warranty terms. A replacement, correction or refund is provided only when confirmed as the applicable remedy.</p>
    </section>
    <section className="policy-section"><h2>Refund method and timing</h2>
      <p>If a refund is approved, its amount, payment method and expected processing time will be confirmed in the support conversation. Provider reference prices and displayed savings do not determine the refund amount.</p>
    </section>
    <section className="policy-section"><h2>Keep your confirmation</h2>
      <p>Retain the WhatsApp order confirmation and payment record. Do not share passwords, payment PINs or one-time verification codes when requesting support.</p>
    </section>
  </PolicyPage>;
}
