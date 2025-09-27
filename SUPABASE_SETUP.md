# Supabase Migration Setup Guide

## Overview
Your domain valuation application has been successfully migrated from PostgreSQL to Supabase. Follow these steps to complete the setup.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a project name and password
3. Wait for the project to be provisioned (2-3 minutes)

## 2. Get Your Supabase Credentials

From your Supabase project dashboard:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **Project API Key** (anon/public key)

## 3. Update Environment Variables

Create or update your `.env.local` file with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Keep these for any remaining pg-based scripts
DATABASE_URL=your-postgres-connection-string
```

## 4. Create the Database Schema

In your Supabase project, go to **SQL Editor** and run this query:

```sql
-- Create appraisals table
CREATE TABLE IF NOT EXISTS appraisals (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) NOT NULL,
  final_score DECIMAL(5,2) NOT NULL,
  breakdown JSONB NOT NULL,
  price_estimate JSONB NOT NULL,
  comps JSONB DEFAULT '[]',
  legal_flag VARCHAR(10) DEFAULT 'clear',
  ai_comment TEXT,
  whois_data JSONB NULL,
  options_hash VARCHAR(32) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(255) NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE appraisals ENABLE ROW LEVEL SECURITY;

-- Create secure policies for appraisals
-- Allow read access to all (for caching and reports)
CREATE POLICY "Allow read access to appraisals" ON appraisals
  FOR SELECT USING (true);

-- Allow insert only (no updates/deletes to prevent tampering)
CREATE POLICY "Allow insert to appraisals" ON appraisals
  FOR INSERT WITH CHECK (true);

-- Add performance indexes
CREATE INDEX idx_appraisals_domain_created ON appraisals (domain, created_at DESC);
CREATE INDEX idx_appraisals_domain_options_created ON appraisals (domain, options_hash, created_at DESC);
```

## 5. Set up Domain Sales Data (For Comparables Feature)

To enable domain comparables, create the domain sales table in Supabase SQL Editor:

```sql
-- Create domain_sales table that matches your CSV headers
CREATE TABLE domain_sales (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  domain VARCHAR(255) NOT NULL,
  price INTEGER NOT NULL,
  venue VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_domain_sales_domain ON domain_sales (domain);
CREATE INDEX idx_domain_sales_date ON domain_sales (date);
CREATE INDEX idx_domain_sales_price ON domain_sales (price);
CREATE INDEX idx_domain_sales_venue ON domain_sales (venue);

-- Enable RLS
ALTER TABLE domain_sales ENABLE ROW LEVEL SECURITY;

-- Allow read access for comparables lookup
CREATE POLICY "Allow read access to domain_sales" ON domain_sales
  FOR SELECT USING (true);
```

After creating this table:
1. Go to **Table Editor** → **domain_sales** 
2. Click **Insert** → **Import data via spreadsheet**
3. Upload your `domain-sales.csv` file
4. The headers should now match: `date`, `domain`, `price`, `venue`

## 6. Security Configuration (Important!)

The setup above uses a secure but basic RLS policy. For production, consider:

1. **API-only access**: Consider creating a service role key for server-side operations
2. **User authentication**: If you add user accounts, update policies to check `auth.uid()`
3. **Rate limiting**: The app already has IP-based rate limiting built in

## 7. Test the Application

1. Restart your development server: `npm run dev`
2. Try evaluating a domain to test the database connection
3. Check the browser console for any errors
4. Verify that evaluations are being saved to Supabase (check the Table Editor)

## Features Currently Available

✅ **Working:**
- Domain evaluation and scoring
- AI-powered brandability analysis  
- PDF report generation
- Database caching of evaluations
- Rate limiting

⚠️ **Temporarily Disabled:**
- Domain comparables from database (until domain_sales table is set up)
- Database statistics

## Next Steps

1. Set up your environment variables
2. Create the database schema
3. Test domain evaluations
4. Optionally import domain sales data for comparables

## Support

If you encounter any issues:
- Check the browser console for errors
- Verify your Supabase credentials are correct
- Ensure the appraisals table was created successfully