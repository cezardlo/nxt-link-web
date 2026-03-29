import { redirect } from 'next/navigation';

// Homepage redirects to briefing — the core product experience
export default function Home() {
    redirect('/briefing');
}
