import { CommerceAdmin } from '../components/checkout';
import './admin.css';
export const metadata = { title: 'Order Management | Sasify Solutions', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function Page() { return <main className="admin-page"><CommerceAdmin /></main>; }
