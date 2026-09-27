import { PolicyPage, policyMetadata } from '../components/policy-page';

const description = 'Learn what information the Sasify Solutions website and its analytics services process, and how external links are handled.';
export const metadata = policyMetadata('Privacy Notice', description, '/privacy');

export default function PrivacyPage() {
  return <PolicyPage title="Privacy Notice" summary="This website uses online checkout for digital purchases and provides post-purchase support through WhatsApp. Learn what information is used to verify and deliver orders." path="/privacy" updated="27 September 2026">
    <section className="policy-section"><h2>Information you provide</h2>
      <p>When you place an order, you may provide a selected product, payment reference, contact details and delivery or support information. Share only what is needed for the order. Never send passwords, payment PINs or one-time verification codes.</p>
    </section>
    <section className="policy-section"><h2>External services</h2>
      <p>Vercel processes anonymized technical page-view and performance data for this website. Product icons may be loaded from Google, and the website links to WhatsApp, social media profiles and provider websites. Those services process information under their own privacy terms. Opening an external link takes you away from this website.</p>
    </section>
    <section className="policy-section"><h2>Language welcome prompt</h2>
      <p>For visitors located in Pakistan, we use the country and public IP address supplied by our hosting provider to show the language welcome prompt only once per IP address. We store a one-way keyed hash of the IP address and the date the prompt was completed; we do not store the raw IP address for this feature. Your language choice is saved in your browser and can be changed from the website header. People sharing one public IP may share the same prompt status.</p>
    </section>
    <section className="policy-section"><h2>Email verification</h2>
      <p>When you create an account or request a password reset, we use the Google Gmail API to send a verification code or reset message to the email address you provide. Our integration uses Gmail only to send these requested messages; it does not read, search, modify or delete your inbox. Google account data obtained through the Gmail API is used only for this email-sending function and handled in accordance with the Google API Services User Data Policy, including its Limited Use requirements.</p>
    </section>
    <section className="policy-section"><h2>Your questions and requests</h2>
      <p>Contact +923116185711 on WhatsApp to ask how order information is handled or to request a correction or deletion where applicable.</p>
    </section>
  </PolicyPage>;
}
