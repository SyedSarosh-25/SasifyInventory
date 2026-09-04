import { PolicyPage, policyMetadata } from '../components/policy-page';

const description = 'Learn what information the Sasify Solutions website and its analytics services process, and how external links are handled.';
export const metadata = policyMetadata('Privacy Notice', description, '/privacy');

export default function PrivacyPage() {
  return <PolicyPage title="Privacy Notice" summary="This website has no customer account form and does not take checkout payments. Information you choose to send through WhatsApp is used to answer questions, arrange orders and provide support." path="/privacy">
    <section className="policy-section"><h2>Information you provide</h2>
      <p>When you contact Sasify Solutions on WhatsApp, you may provide your name, phone number, selected product, payment confirmation and support details. Share only what is needed for the order. Never send passwords, payment PINs or one-time verification codes.</p>
    </section>
    <section className="policy-section"><h2>External services</h2>
      <p>Vercel processes anonymized technical page-view and performance data for this website. Product icons may be loaded from Google, and the website links to WhatsApp, social media profiles and provider websites. Those services process information under their own privacy terms. Opening an external link takes you away from this website.</p>
    </section>
    <section className="policy-section"><h2>Your questions and requests</h2>
      <p>Contact +923116185711 on WhatsApp to ask how order information is handled or to request a correction or deletion where applicable.</p>
    </section>
  </PolicyPage>;
}
