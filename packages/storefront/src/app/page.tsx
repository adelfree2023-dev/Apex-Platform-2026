import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to demo tenant
  redirect('/demo-store');
}

