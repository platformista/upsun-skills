import type { Metadata } from 'next'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'

export const metadata: Metadata = {
  title: 'Upsun AI Skills',
  description: 'Specialist AI tools for Upsun',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}
