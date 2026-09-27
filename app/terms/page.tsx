import { PolicyPage, policyMetadata } from '../components/policy-page';

const description = 'Read Sasify Solutions ordering, pricing, access, provider and policy terms for digital tool packages.';
export const metadata = policyMetadata('Terms of Service', description, '/terms');

export default function TermsPage() {
  return <PolicyPage title="Terms of Service" summary="These terms explain how listings, online checkout, automatic delivery and post-purchase support work." path="/terms">
    <section className="policy-section"><h2>Listings and orders</h2>
      <p>Each product page describes a Sasify Solutions listing. Select the exact package, proceed to secure online checkout and submit the requested payment reference. After payment verification, eligible digital purchases are delivered automatically. WhatsApp support is available after payment for delivery or activation issues.</p>
    </section>
    <section className="policy-section"><h2>Prices and savings</h2>
      <p>PKR is the basis for the listed Sasify price. The USD toggle uses the website&apos;s fixed conversion rate of 1 USD = PKR 285 for display. Provider prices are comparison references and may differ by region, tax, billing option and access arrangement. Savings equal the full-plan reference price minus the Sasify package price.</p>
    </section>
    <section className="policy-section"><h2>Access and provider rules</h2>
      <p>Shared, single-person, team, invite-based and credit packages are not interchangeable. The selected provider&apos;s usage limits and applicable terms still apply. Review account ownership, privacy, devices, invitations, regions, duration and credits on the listing before ordering.</p>
    </section>
    <section className="policy-section"><h2>Names, logos and references</h2>
      <p>Third-party names and logos identify the relevant tools and belong to their respective owners. Unless a listing expressly states otherwise, their use does not claim that Sasify Solutions is the provider or an official affiliate.</p>
    </section>
    <section className="policy-section"><h2>Warranty, refunds and changes</h2>
      <p>Read the <a href="/warranty">Warranty Policy</a> and <a href="/refunds">Refund and Resolution Policy</a>. Listings may be updated when prices, availability or provider plans change. Review the exact product page and checkout total before payment.</p>
    </section>
  </PolicyPage>;
}
