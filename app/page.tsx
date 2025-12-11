import { redirect } from 'next/navigation';

export default function RootPage() {
  // This page will be intercepted by middleware and redirected to /en
  // We just need it to exist for the root route
  return null;
}
