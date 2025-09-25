"use client";

import React, { useState } from "react";
import { Search, Reload, Check, Analytics, Download } from "@nsmr/pixelart-react";
import type { DomainAppraisal } from "../types";
import DomainResults from "./DomainResults";

export default function DomainEvaluator() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DomainAppraisal | null>(null);
  const [error, setError] = useState("");
  const [searchCount, setSearchCount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!domain.trim()) {
      setError("Please enter a domain name");
      return;
    }

    if (searchCount >= 5) {
      setError(
        "You have reached the limit of 5 searches. Please contact us for more evaluations.",
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/appraise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: domain.toLowerCase().trim(),
          options: { useComps: true },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(
            `Rate limit exceeded. You can try again in ${Math.ceil(data.retryAfter / 60)} minutes.`,
          );
        } else {
          setError(data.error || "Failed to evaluate domain");
        }
        return;
      }

      setResult(data);
      setSearchCount((prev) => prev + 1);

      // Update remaining count from response headers
      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining) {
        setSearchCount(5 - parseInt(remaining));
      }
    } catch (err) {
      setError("Failed to evaluate domain. Please try again.");
      console.error("Evaluation error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Enter domain name (e.g., example.com)"
                className="input-field w-full"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || searchCount >= 5}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Reload className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              {loading ? "Evaluating..." : "Evaluate Domain"}
            </button>
          </div>

          <div className="flex justify-between items-center text-sm text-brand-secondary">
            <span>Searches used: {searchCount}/5</span>
            <span className="text-xs">Free evaluations without login</span>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}
        </form>
      </div>

      {result && <DomainResults result={result} />}
    </div>
  );
}
