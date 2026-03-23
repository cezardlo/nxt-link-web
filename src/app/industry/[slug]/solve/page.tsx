import { redirect } from 'next/navigation';
export default function IndustrySolveRedirect({ params }: { params: { slug: string } }) {
  redirect(`/solve?industry=${params.slug}`);
}
