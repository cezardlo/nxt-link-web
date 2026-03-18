// Force dynamic rendering — the /ask page uses localStorage + window.location
// which can cause silent failures during static prerendering on Vercel.
export const dynamic = 'force-dynamic';

export default function AskLayout({ children }: { children: React.ReactNode }) {
  return children;
}
