import { redirect } from 'next/navigation';
export const metadata = {
  title: 'My account | Sasify Solutions',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default function Page() {
  redirect('/dashboard');
}
