import type { Metadata } from 'next'
import React from 'react'
import './globals.css'

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
      <body className="font-mono bg-brand-background text-brand-primary min-h-screen">
        {children}
      </body>
    </html>
  )
}