import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/context/them-provider'
import PusherBeams from '@/components/pusher-beams'
import { ClerkProvider } from '@/components/providers/clerk-provider'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Corinna AI',
  description: 'AI powered sales assistant chatbot',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={jakarta.className}>
        <ClerkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <PusherBeams />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
