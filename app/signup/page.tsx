import { AccountAuth } from '../components/customer-account';
export const metadata = {
  title: 'Create account | Sasify Solutions',
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AccountAuth signup />;
}
