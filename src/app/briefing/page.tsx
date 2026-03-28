import { redirect } from 'next/navigation';

// Briefing is now the homepage — redirect /briefing to /
export default function BriefingRedirect() {
  redirect('/');
}
