'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = isSignUp
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password })

      if (result.error) {
        setError(isSignUp
          ? 'We couldn’t create your account. Check your details and try again.'
          : 'We couldn’t sign you in. Check your email and password and try again.')
        setLoading(false)
        return
      }

      router.replace('/')
      router.refresh()
    } catch {
      setError(isSignUp
        ? 'We couldn’t create your account. Check your details and try again.'
        : 'We couldn’t sign you in. Check your email and password and try again.')
      setLoading(false)
    }
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-card-topline">
        <span className="auth-eyebrow">{isSignUp ? 'NEW WORKSPACE' : 'MEMBER ACCESS'}</span>
        <span className="auth-lock"><LockKeyhole aria-hidden="true" /> SECURE SIGN-IN</span>
      </div>
      <div className="auth-card-heading">
        <h2 id="auth-title">{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
        <p>{isSignUp ? 'Set up your SEA workspace to get started.' : 'Sign in to pick up where your audience left off.'}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {isSignUp && (
          <div className="auth-field">
            <label htmlFor="name">Your name</label>
            <div className="auth-input-wrap">
              <UserRound aria-hidden="true" />
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Jordan Lee"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={80}
              />
            </div>
          </div>
        )}
        <div className="auth-field">
          <label htmlFor="email">Email address</label>
          <div className="auth-input-wrap">
            <Mail aria-hidden="true" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
            />
          </div>
        </div>
        <div className="auth-field">
          <div className="auth-label-row">
            <label htmlFor="password">Password</label>
            {isSignUp && <span className="auth-field-note">8 characters minimum</span>}
          </div>
          <div className="auth-input-wrap">
            <LockKeyhole aria-hidden="true" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              maxLength={128}
            />
            <button
              className="auth-password-toggle"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button className="auth-submit" type="submit" disabled={loading} aria-busy={loading}>
          <span>{loading ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Create account' : 'Sign in to SEA')}</span>
          {!loading && <ArrowRight aria-hidden="true" />}
        </button>
      </form>

      <p className="auth-switch">
        {isSignUp ? 'Already have an account?' : 'New to SEA?'}{' '}
        <Link href={isSignUp ? '/sign-in' : '/sign-up'}>
          {isSignUp ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
      <p className="auth-privacy">Your workspace is private to your account.</p>
    </section>
  )
}
