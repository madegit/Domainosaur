import React from 'react'
import DomainEvaluator from '../components/DomainEvaluator'
import { Check, Alert, Search, Download } from '@nsmr/pixelart-react'

export default function Home() {
  return (
    <main className="retro-container">
      <div className="max-w-4xl mx-auto">
        {/* Retro Header */}
        <div className="card mb-8">
          <div className="retro-header flex items-center justify-center gap-4 mb-6">
            <Check className="h-8 w-8" />
            <h1 className="text-4xl font-bold text-center text-white">
              Domainosaur
            </h1>
            <Alert className="h-8 w-8" />
          </div>
          <div className="flex items-center justify-center gap-8 text-brand-primary">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              <span className="font-bold">AI-POWERED</span>
            </div>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              <span className="font-bold">10-FACTOR ANALYSIS</span>
            </div>
          </div>
        </div>
        
        <DomainEvaluator />
      </div>
    </main>
  )
}