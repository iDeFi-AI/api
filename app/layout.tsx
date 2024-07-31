import './globals.css'
import { Analytics } from "@vercel/analytics/react"

export const metadata = {
  title: 'iDeFi.ai API',
  description: 'iDeFi.AI API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}
      <Analytics />
      </body>
    </html>
  )
}
