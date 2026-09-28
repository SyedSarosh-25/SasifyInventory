import type { Metadata } from 'next';
import { AccountAuth } from '../components/customer-account';

export const metadata: Metadata = {
  title: 'Log in | Sasify Solutions',
  description: 'Log in to manage your Sasify Solutions account, orders and wallet balance.',
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AccountAuth />;
}
