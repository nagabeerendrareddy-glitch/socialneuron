import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import SeaDashboard from '@/components/sea-dashboard'
import { auth } from '@/lib/auth'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  return <SeaDashboard userName={session.user.name} />
}
