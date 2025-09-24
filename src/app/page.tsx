import React from 'react'
import DomainEvaluator from '../components/DomainEvaluator'

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-surface">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-primary mb-2">
            Domainosaur
          </h1>
          <p className="text-brand-secondary text-sm">
            World's best domain valuator - using 10 core factors
          </p>
        </div>
        <DomainEvaluator />
      </div>
    </main>
  )
}