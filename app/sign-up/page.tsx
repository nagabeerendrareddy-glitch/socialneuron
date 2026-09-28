import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/frontend/components/auth-form'
import { AuthPageFrame } from '@/frontend/components/auth-page-frame'
import { auth } from '@/backend/lib/auth'

export const metadata: Metadata = {
  title: 'Create a Social Neuron account',
  description: 'Create an account for your Social Neuron audience intelligence workspace.',
}

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/')

  return (
    <AuthPageFrame>
      <AuthForm mode="sign-up" />
    </AuthPageFrame>
  )
}
