import { redirect } from 'next/navigation';

export default function VendorsPage() {
  redirect('/marketplace?view=companies');
}
