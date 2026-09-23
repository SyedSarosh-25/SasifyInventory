import { CustomerDashboard } from '../components/customer-account';

export const metadata = {
  title: 'Dashboard | Sasify Solutions',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function Page() {
  return <CustomerDashboard />;
}
