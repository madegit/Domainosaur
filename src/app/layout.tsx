import type { Metadata } from 'next'
import React from 'react'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const azeretMono = localFont({
  src: [
    {
      path: '../public/fonts/AzeretMono-VariableFont_wght.ttf',
      style: 'normal',
    },
    {
      path: '../public/fonts/AzeretMono-Italic-VariableFont_wght.ttf', 
      style: 'italic',
    },
  ],
  display: 'swap',
  variable: '--font-azeret-mono',
})

export const metadata: Metadata = {
  title: 'Domain Value Estimator',
  description: 'AI-powered domain valuation using 10 core factors',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${azeretMono.className} bg-brand-background text-brand-primary min-h-screen`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}