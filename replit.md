# Domain Value Estimator

## Overview

This is an AI-powered domain valuation application that estimates the worth of domain names using a comprehensive 10-factor scoring system. The application provides detailed breakdowns of valuation factors, price estimates for both investor and retail markets, and generates PDF reports for domain appraisals.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 15 with React 19 and TypeScript
- **Styling**: Tailwind CSS 4 with custom theme configuration using monospace fonts
- **UI Components**: Radix UI for dialog and progress components, Lucide React for icons
- **Layout**: Single-page application with responsive design optimized for Replit hosting

### Backend Architecture
- **API Routes**: Next.js API routes handling domain appraisal, report generation, and comparable sales
- **Valuation Engine**: Custom scoring algorithm implementing 10 factors (length, keywords, TLD, brandability, industry relevance, comparables, domain age, traffic potential, liquidity, and legal status)
- **Rate Limiting**: In-memory rate limiter restricting users to 5 evaluations per hour per IP address
- **PDF Generation**: Server-side PDF report creation using jsPDF library

### AI Integration
- **xAI/Grok Integration**: Uses xAI's Grok-2 model for brandability analysis and domain commentary
- **Structured Analysis**: JSON-formatted responses for consistent scoring and explanations

### Data Storage
- **Database**: PostgreSQL with connection pooling via node-postgres (pg)
- **Schema**: 
  - `appraisals` table storing domain evaluations with JSONB fields for flexible data structure
  - `comps` table for comparable sales data (prepared for future implementation)
- **Initialization**: Automatic database schema creation on application startup

### Valuation Algorithm
- **10-Factor System**: Weighted scoring across multiple domain characteristics
- **Industry Keywords**: Predefined keyword database for tech, finance, health, and e-commerce sectors
- **Comparable Sales**: Sample data integration for market-based pricing estimates
- **Legal Risk Assessment**: Trademark conflict detection using known brand database
- **Price Brackets**: Tiered pricing system from budget to premium categories

### Configuration
- **Replit Optimization**: Custom Next.js configuration for Replit hosting with proxy support
- **Development Setup**: Custom dev script running on port 5000 with proper host binding
- **TypeScript**: Strict configuration with path aliases for clean imports

## External Dependencies

- **xAI API**: Grok-2 model for AI-powered brandability analysis and domain commentary
- **PostgreSQL Database**: Primary data storage for appraisals and comparable sales
- **Replit Hosting**: Platform-specific configuration for development and deployment
- **Next.js Framework**: React-based full-stack framework for both frontend and API functionality
- **Tailwind CSS**: Utility-first CSS framework for styling
- **jsPDF**: Client-side PDF generation for valuation reports