import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import '../frontend/styles/globals.css'

export const metadata: Metadata = {
  title: 'Social Neuron — Audience Intelligence',
  description: 'Social Neuron helps you understand your audience, analyze content performance, and create social posts grounded in your engagement history.',
  generator: 'v0.app',
  icons: {
    icon: '/social-neuron-icon.png',
    apple: '/social-neuron-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#090c12',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
