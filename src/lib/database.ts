import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function initDatabase() {
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id VARCHAR(255) NULL
      )
    `)
    
    // Create comparable sales table
    await client.query(`
      CREATE TABLE IF NOT EXISTS comps (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) NOT NULL,
        sold_price INTEGER NOT NULL,
        sold_date DATE NOT NULL,
        source VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create settings table for factor weights and configurations
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Insert default factor weights if not exists
    await client.query(`
      INSERT INTO settings (key, value) VALUES 
      ('factor_weights', '{"length": 0.12, "keywords": 0.20, "tld": 0.15, "brandability": 0.15, "industry": 0.10, "comps": 0.12, "age": 0.06, "traffic": 0.04, "liquidity": 0.06}')
      ON CONFLICT (key) DO NOTHING
    `)
    
    // Insert default legal brand list
    await client.query(`
      INSERT INTO settings (key, value) VALUES 
      ('legal_brands', '["google", "facebook", "amazon", "microsoft", "apple", "twitter", "instagram", "youtube", "linkedin", "netflix", "tesla", "uber", "airbnb", "spotify", "paypal", "visa", "mastercard", "coca-cola", "pepsi", "nike", "adidas", "samsung", "sony", "intel", "oracle", "salesforce", "adobe", "zoom", "slack", "dropbox", "github", "reddit", "pinterest", "snapchat", "tiktok", "whatsapp", "telegram", "discord", "twitch", "shopify", "square", "stripe", "mailchimp", "hubspot", "atlassian", "figma", "canva", "notion"]')
      ON CONFLICT (key) DO NOTHING
    `)
    
    console.log('Database initialized successfully')
  } finally {
    client.release()
  }
}

export { pool }