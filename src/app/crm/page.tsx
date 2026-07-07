// Legacy CRM page (client-side Supabase queries with an inline anon key).
// Superseded by the admin surfaces — send visitors there instead.
import { redirect } from 'next/navigation';

export default function CrmPage() {
  redirect('/admin/vendors');
}
