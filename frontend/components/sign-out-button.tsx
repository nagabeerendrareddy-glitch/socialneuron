'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { authClient } from '@/frontend/lib/auth-client'

export function SignOutButton({ name }: { name: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const initials = name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'U'

  async function handleSignOut() {
    setPending(true)
    const result = await authClient.signOut()
    if (result.error) {
      setPending(false)
      return
    }
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <div className="account-control">
      <span className="account-avatar" aria-hidden="true">{initials}</span>
      <button className="signout-button" type="button" onClick={handleSignOut} disabled={pending} aria-label="Sign out">
        <LogOut aria-hidden="true" />
        <span>{pending ? 'Signing out' : 'Sign out'}</span>
      </button>
    </div>
  )
}
