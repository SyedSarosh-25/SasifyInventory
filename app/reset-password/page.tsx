import { AccountRecovery } from '../components/customer-account';

export const metadata = {
  title: 'Reset password | Sasify Solutions',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function Page() {
  return <AccountRecovery reset />;
}
