"use client";

import React, { useState, useEffect } from "react";
import { Search, Reload, Check, Analytics, Download } from "@nsmr/pixelart-react";
import type { DomainAppraisal } from "../types";
import DomainResults from "./DomainResults";

const SEARCH_LIMIT = 3;
const STORAGE_KEY = 'domainosaur_searches';
const CACHE_KEY = 'domainosaur_cache';

export default function DomainEvaluator() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DomainAppraisal | null>(null);
  const [error, setError] = useState("");
  const [searchCount, setSearchCount] = useState(0);

  // Initialize search count from localStorage on component mount
  useEffect(() => {
    const savedSearches = localStorage.getItem(STORAGE_KEY);
    if (savedSearches) {
      try {
        const data = JSON.parse(savedSearches);
        const today = new Date().toDateString();
        
        // Reset count if it's a new day
        if (data.date === today) {
          setSearchCount(data.count || 0);
        } else {
          // New day, reset count
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 0, date: today }));
          setSearchCount(0);
        }
      } catch (error) {
        console.error('Error parsing search data from localStorage:', error);
        setSearchCount(0);
      }
    } else {
      // First time user
      const today = new Date().toDateString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 0, date: today }));
      setSearchCount(0);
    }
  }, []);

  // Function to update search count in both state and localStorage
  const updateSearchCount = (newCount: number) => {
    setSearchCount(newCount);
    const today = new Date().toDateString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: newCount, date: today }));
  };

  // Function to check cache for previous results
  const getCachedResult = (domainName: string): DomainAppraisal | null => {
    try {
      const cache = localStorage.getItem(CACHE_KEY);
      if (cache) {
        const cacheData = JSON.parse(cache);
        const cached = cacheData[domainName.toLowerCase()];
        
        if (cached) {
          // Check if cache is still valid (24 hours)
          const cacheAge = Date.now() - cached.timestamp;
          const twentyFourHours = 24 * 60 * 60 * 1000;
          
          if (cacheAge < twentyFourHours) {
            return cached.result;
          } else {
            // Remove expired cache entry
            delete cacheData[domainName.toLowerCase()];
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
          }
        }
      }
    } catch (error) {
      console.error('Error reading cache:', error);
    }
    return null;
  };

  // Function to save result to cache
  const saveToCache = (domainName: string, result: DomainAppraisal) => {
    try {
      const cache = localStorage.getItem(CACHE_KEY);
      const cacheData = cache ? JSON.parse(cache) : {};
      
      cacheData[domainName.toLowerCase()] = {
        result,
        timestamp: Date.now()
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!domain.trim()) {
      setError("Please enter a domain name");
      return;
    }

    if (searchCount >= SEARCH_LIMIT) {
      setError(
        `You have reached the limit of ${SEARCH_LIMIT} searches per day. Upgrade to our premium plan for unlimited evaluations.`,
      );
      return;
    }

    const domainName = domain.toLowerCase().trim();
    
    // Check cache first
    const cachedResult = getCachedResult(domainName);
    if (cachedResult) {
      setResult(cachedResult);
      setError("");
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
          domain: domainName,
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
      saveToCache(domainName, data);
      
      // Increment search count and sync with localStorage
      const newCount = searchCount + 1;
      updateSearchCount(newCount);

      // Update remaining count from response headers if available
      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining) {
        const usedCount = SEARCH_LIMIT - parseInt(remaining);
        updateSearchCount(usedCount);
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
              disabled={loading || searchCount >= SEARCH_LIMIT}
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
            <span>Daily searches used: {searchCount}/{SEARCH_LIMIT}</span>
            <span className="text-xs">
              {searchCount >= SEARCH_LIMIT ? "Limit reached" : "Free daily evaluations"}
            </span>
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
