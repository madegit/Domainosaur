'use client'

import React from 'react'
import { Download, Alert, Check, Close } from '@nsmr/pixelart-react'
import type { DomainAppraisal } from '../types'

interface DomainResultsProps {
  result: DomainAppraisal
}

export default function DomainResults({ result }: DomainResultsProps) {
  const getLegalIcon = () => {
    switch (result.legalFlag) {
      case 'clear':
        return <Check className="h-5 w-5 text-green-500" />
      case 'warning':
        return <Alert className="h-5 w-5 text-yellow-500" />
      case 'severe':
        return <Close className="h-5 w-5 text-red-500" />
      default:
        return <Alert className="h-5 w-5 text-gray-500" />
    }
  }

  const getLegalText = () => {
    switch (result.legalFlag) {
      case 'clear':
        return 'No trademark conflicts detected'
      case 'warning':
        return 'Possible trademark conflicts - review recommended'
      case 'severe':
        return 'Significant trademark risks detected - manual review required'
      default:
        return 'Legal status unknown'
    }
  }

  const downloadReport = async () => {
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: result.domain }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${result.domain}-valuation-report.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to generate report. Please try again.')
      }
    } catch (error) {
      console.error('Failed to download report:', error)
      alert('Failed to download report. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-brand-primary mb-2">
              {result.domain}
            </h2>
            <p className="text-lg text-brand-secondary">
              Estimated Value: {result.priceEstimate.investor} - {result.priceEstimate.retail}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-brand-secondary">Score:</span>
              <div className="text-2xl font-bold text-brand-primary">
                {result.finalScore.toFixed(1)}/100
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-3 w-32">
              <div 
                className="factor-progress h-3"
                style={{ width: `${result.finalScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Commentary */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">AI Analysis</h3>
        <p className="text-brand-secondary text-sm leading-relaxed">
          {result.aiComment}
        </p>
      </div>

      {/* Factor Breakdown */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Valuation Factors</h3>
          <button
            onClick={downloadReport}
            className="btn-primary text-xs flex items-center gap-1"
          >
            <Download className="h-3 w-3" />
            PDF Report
          </button>
        </div>
        
        <div className="space-y-4">
          {result.breakdown.map((factor, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium capitalize">
                  {factor.factor}
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <span>{factor.score}/100</span>
                  <span className="text-brand-secondary">
                    (Weight: {(factor.weight * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
              <div className="factor-bar">
                <div 
                  className="factor-progress"
                  style={{ width: `${factor.score}%` }}
                />
              </div>
              <div className="text-xs text-brand-secondary">
                Contribution: {factor.contribution.toFixed(1)} points
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legal Status */}
      <div className="card">
        <div className="flex items-center gap-3">
          {getLegalIcon()}
          <div>
            <h3 className="text-lg font-semibold">Legal Status</h3>
            <p className="text-sm text-brand-secondary">
              {getLegalText()}
            </p>
          </div>
        </div>
      </div>

      {/* Comparable Sales */}
      {result.comps && result.comps.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Comparable Sales</h3>
          <div className="space-y-3">
            {result.comps.map((comp, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <span className="font-medium">{comp.domain}</span>
                  <span className="text-sm text-brand-secondary ml-2">
                    ({comp.soldDate})
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    ${comp.soldPrice.toLocaleString()}
                  </div>
                  <div className="text-xs text-brand-secondary">
                    {comp.source}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price Explanation */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Valuation Explanation</h3>
        <div className="text-sm text-brand-secondary space-y-2">
          <p><strong>Investor Price:</strong> {result.priceEstimate.investor}</p>
          <p><strong>Retail Price:</strong> {result.priceEstimate.retail}</p>
          <p className="mt-3">{result.priceEstimate.explanation}</p>
        </div>
      </div>
    </div>
  )
}