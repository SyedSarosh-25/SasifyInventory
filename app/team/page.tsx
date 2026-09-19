import type { Metadata } from 'next';
import { TeamPortal } from '../components/team-portal';

export const metadata: Metadata = {
  title: 'Team portal | Sasify Solutions',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main className="team-page">
      <TeamPortal />
    </main>
  );
}
