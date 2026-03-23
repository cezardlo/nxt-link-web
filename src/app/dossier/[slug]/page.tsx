import { redirect } from 'next/navigation';
export default function DossierSlugRedirect({ params }: { params: { slug: string } }) {
  redirect(`/industry/${params.slug}`);
}
