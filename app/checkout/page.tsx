import { Checkout } from '../components/checkout';
export const metadata = { title: 'Secure Checkout | Sasify Solutions', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function Page() { return <main className="checkout-page"><Checkout /></main>; }
