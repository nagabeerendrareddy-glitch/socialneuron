import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { auth } from '@/lib/auth'
import { AuthPageFrame } from '@/components/auth-page-frame'

export const metadata: Metadata = {
  title: 'Sign in to SEA',
  description: 'Sign in to your SEA social engagement workspace.',
}

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/')

  return (
    <AuthPageFrame>
      <AuthForm mode="sign-in" />
    </AuthPageFrame>
  )
}
