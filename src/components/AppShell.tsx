// All pages in this app are fullscreen — no wrapper chrome needed.
// Layout is handled per-page with fixed/inset-0.
export function AppShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
