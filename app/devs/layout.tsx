
import { Metadata } from 'next'
import * as React from 'react'
import Header from '@/components/layouts/Header'
import Footer from '@/components/layouts/Footer'

export const metadata: Metadata = {
  title: 'Developers',
  description: 'API Suite',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='flex flex-col min-h-screen mx-auto'>
      <div className='flex-grow'>
      <Header/>
      <main className='flex flex-col max-w-7xl px-2 sm:px-4 lg:px-8 mx-auto my-0 py-4'>{children}</main>
      <Footer/>
      </div>
    </div>
  )
}
