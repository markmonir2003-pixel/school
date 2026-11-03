import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { SchoolProvider } from '@/lib/school/store'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'St. George School | Digital Campus',
    template: '%s | St. George School',
  },
  description:
    'St. George School Digital Campus provides digital learning, assignments, assessments, attendance, academic resources, school activities, and communication for students, parents, teachers, and administrators.',
  keywords: [
    'St. George School',
    'Digital Campus',
    'مدرسة سان جورج',
    'الحرم الرقمي لمدرسة سان جورج',
    'school management',
    'education platform',
  ],
  authors: [{ name: 'St. George School' }],
  icons: { icon: '/school-mark.svg', shortcut: '/school-mark.svg' },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6fa' },
    { media: '(prefers-color-scheme: dark)', color: '#071120' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Cairo:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <SchoolProvider>{children}</SchoolProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
