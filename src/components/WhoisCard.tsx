"use client";

import React from "react";
import { Analytics, Check, Close, Scale, Trophy, Download, Search } from "@nsmr/pixelart-react";
import type { WhoisData } from "../types";

interface WhoisCardProps {
  whoisData: WhoisData;
}

export default function WhoisCard({ whoisData }: WhoisCardProps) {
  const getAvailabilityIcon = () => {
    if (whoisData.isAvailable) {
      return <Check className="h-5 w-5 text-green-500" />;
    }
    return <Close className="h-5 w-5 text-red-500" />;
  };

  const getAvailabilityText = () => {
    if (whoisData.isAvailable) {
      return "Available for registration";
    }
    return "Registered domain";
  };

  const getAvailabilityStatus = () => {
    if (whoisData.isAvailable) {
      return "AVAILABLE";
    }
    return "REGISTERED";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not available";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  };

  const getDomainAge = () => {
    if (whoisData.ageInYears) {
      return `${whoisData.ageInYears.toFixed(1)} years old`;
    }
    return "Age unavailable";
  };

  return (
    <div className="card">
      <div className="retro-header flex items-center gap-3 mb-4">
        <Search className="h-6 w-6" />
        <span className="text-lg font-bold">DOMAIN AVAILABILITY </span>
  
      </div>
      {/* Availability Status */}
      <div className="flex items-center gap-3 mb-6 p-3 bg-brand-surface rounded border-2 border-brand-primary/20">
        {getAvailabilityIcon()}
        <div>
          <p className="text-brand-primary font-medium">{getAvailabilityText()}</p>
          <p className="text-brand-secondary text-sm">
            {whoisData.isAvailable 
              ? "This domain is available and can be purchased from domain registrars"
              : "This domain is currently owned by someone else"
            }
          </p>
        </div>
      </div>

      {/* Registration Details - Only show if domain is registered */}
      {!whoisData.isAvailable && (
        <div className="space-y-4">
          
          {/* Registration Date & Age */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Scale className="h-5 w-5 text-brand-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-brand-primary">Registration Date</p>
                <p className="text-sm text-brand-secondary">{formatDate(whoisData.registrationDate)}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Trophy className="h-5 w-5 text-brand-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-brand-primary">Domain Age</p>
                <p className="text-sm text-brand-secondary">{getDomainAge()}</p>
              </div>
            </div>
          </div>

          {/* Expiration Date */}
          {whoisData.expirationDate && (
            <div className="flex items-start gap-3">
              <Scale className="h-5 w-5 text-brand-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-brand-primary">Expiration Date</p>
                <p className="text-sm text-brand-secondary">{formatDate(whoisData.expirationDate)}</p>
              </div>
            </div>
          )}

          {/* Registrar */}
          {whoisData.registrar && (
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-brand-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-brand-primary">Registrar</p>
                <p className="text-sm text-brand-secondary">{whoisData.registrar}</p>
              </div>
            </div>
          )}

          {/* Name Servers */}
          {whoisData.nameServers && whoisData.nameServers.length > 0 && (
            <div className="flex items-start gap-3">
              <Analytics className="h-5 w-5 text-brand-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-brand-primary">Name Servers</p>
                <div className="text-sm text-brand-secondary space-y-1">
                  {whoisData.nameServers.slice(0, 4).map((ns, index) => (
                    <p key={index} className="break-all">{ns}</p>
                  ))}
                  {whoisData.nameServers.length > 4 && (
                    <p className="text-xs italic">... and {whoisData.nameServers.length - 4} more</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          {whoisData.status && (
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-brand-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-brand-primary">Status</p>
                <p className="text-sm text-brand-secondary">{whoisData.status}</p>
              </div>
            </div>
          )}

          {/* Last Updated */}
          {whoisData.lastUpdated && (
            <div className="flex items-start gap-3">
              <Trophy className="h-5 w-5 text-brand-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-brand-primary">Last Updated</p>
                <p className="text-sm text-brand-secondary">{formatDate(whoisData.lastUpdated)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Available Domain CTA */}
      {whoisData.isAvailable && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800 font-medium mb-2">Ready to register this domain?</p>
          <p className="text-xs text-green-700">
            You can register <strong>{whoisData.domain}</strong> through popular registrars like:
            <br />
            • Namecheap • GoDaddy • Google Domains • Cloudflare
          </p>
        </div>
      )}
    </div>
  );
}