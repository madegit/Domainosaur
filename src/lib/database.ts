import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Database initialization promise to prevent multiple concurrent initializations
let initPromise: Promise<void> | null = null

export async function initDatabase() {
  // If initialization is already in progress, wait for it to complete
  if (initPromise) {
    return initPromise
  }

  // Start initialization with error handling
  initPromise = performInit().catch(err => {
    // Reset promise on failure so future calls can retry
    initPromise = null
    throw err
  })
  return initPromise
}

async function performInit() {
  const client = await pool.connect()
  
  try {
    // Create appraisals table
    await client.query(`
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
      )
    `)
    
    // Add whois_data column to existing tables if it doesn't exist
    await client.query(`
      ALTER TABLE appraisals 
      ADD COLUMN IF NOT EXISTS whois_data JSONB NULL
    `)
    
    // Add options_hash column to existing tables if it doesn't exist  
    await client.query(`
      ALTER TABLE appraisals 
      ADD COLUMN IF NOT EXISTS options_hash VARCHAR(32) NULL
    `)
    
    // Note: Only creating appraisals table - comps are stored in appraisals.comps JSONB
    // Factor weights and legal brands are hardcoded in valuation.ts for simplicity
    
    console.log('Database initialized successfully')
  } finally {
    client.release()
  }
}

export { pool }