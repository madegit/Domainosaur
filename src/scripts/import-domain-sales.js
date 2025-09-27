#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const csv = require('csv-parser');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper function to extract domain components
function extractDomainInfo(domain) {
  const lowerDomain = domain.toLowerCase();
  const parts = lowerDomain.split('.');
  
  if (parts.length < 2) {
    return null; // Invalid domain
  }
  
  const tld = parts[parts.length - 1];
  const domainName = parts.slice(0, -1).join('.');
  
  return {
    domainName,
    tld,
    domainLength: domainName.length,
    hasHyphens: domainName.includes('-'),
    hasNumbers: /\d/.test(domainName),
    isIdn: !/^[a-z0-9-]+$/.test(domainName)
  };
}

// Main import function
async function importDomainSales() {
  const client = await pool.connect();
  
  try {
    console.log('Starting domain sales import...');
    
    // Clear existing data (optional - remove if you want to append)
    await client.query('TRUNCATE TABLE domain_sales RESTART IDENTITY');
    console.log('Cleared existing data');
    
    // Prepare the insert statement
    const insertQuery = `
      INSERT INTO domain_sales (
        domain, sale_price, sale_date, sale_venue, 
        domain_name, tld, domain_length, has_hyphens, has_numbers, is_idn
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    
    let processedCount = 0;
    let errorCount = 0;
    const batchSize = 1000;
    let batch = [];
    
    // Read and process the TSV file
    const tsvPath = path.join(__dirname, '../../data/domain-name-sales.tsv');
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(tsvPath)
        .pipe(csv({ separator: '\t' }))
        .on('data', async (row) => {
          try {
            const domain = row.domain;
            const price = parseInt(row.price);
            const date = row.date;
            const venue = row.venue || 'Unknown';
            
            // Skip invalid rows
            if (!domain || isNaN(price) || !date) {
              errorCount++;
              return;
            }
            
            // Extract domain components
            const domainInfo = extractDomainInfo(domain);
            if (!domainInfo) {
              errorCount++;
              return;
            }
            
            // Add to batch
            batch.push([
              domain,
              price,
              date,
              venue,
              domainInfo.domainName,
              domainInfo.tld,
              domainInfo.domainLength,
              domainInfo.hasHyphens,
              domainInfo.hasNumbers,
              domainInfo.isIdn
            ]);
            
            // Process batch when it reaches the desired size
            if (batch.length >= batchSize) {
              await processBatch(client, insertQuery, batch);
              processedCount += batch.length;
              batch = [];
              
              if (processedCount % 10000 === 0) {
                console.log(`Processed ${processedCount} records...`);
              }
            }
          } catch (error) {
            console.error('Error processing row:', error);
            errorCount++;
          }
        })
        .on('end', async () => {
          try {
            // Process remaining batch
            if (batch.length > 0) {
              await processBatch(client, insertQuery, batch);
              processedCount += batch.length;
            }
            
            console.log(`Import completed!`);
            console.log(`Processed: ${processedCount} records`);
            console.log(`Errors: ${errorCount} records`);
            
            // Create indexes for better performance
            console.log('Creating additional indexes...');
            await client.query('CREATE INDEX IF NOT EXISTS idx_domain_sales_year ON domain_sales(EXTRACT(YEAR FROM sale_date))');
            await client.query('CREATE INDEX IF NOT EXISTS idx_domain_sales_price_range ON domain_sales(sale_price) WHERE sale_price BETWEEN 100 AND 100000');
            
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Helper function to process batches
async function processBatch(client, insertQuery, batch) {
  try {
    await client.query('BEGIN');
    
    for (const row of batch) {
      await client.query(insertQuery, row);
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

// Helper function to get import statistics
async function getImportStats() {
  const client = await pool.connect();
  
  try {
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_records,
        MIN(sale_price) as min_price,
        MAX(sale_price) as max_price,
        AVG(sale_price)::int as avg_price,
        MIN(sale_date) as oldest_sale,
        MAX(sale_date) as newest_sale,
        COUNT(DISTINCT tld) as unique_tlds,
        COUNT(DISTINCT EXTRACT(YEAR FROM sale_date)) as years_covered
      FROM domain_sales
    `);
    
    console.log('\nImport Statistics:');
    console.log('==================');
    console.log(stats.rows[0]);
    
    // Top TLDs
    const topTlds = await client.query(`
      SELECT tld, COUNT(*) as count 
      FROM domain_sales 
      GROUP BY tld 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    console.log('\nTop 10 TLDs:');
    topTlds.rows.forEach(row => {
      console.log(`${row.tld}: ${row.count} sales`);
    });
    
  } finally {
    client.release();
  }
}

// Run the import
if (require.main === module) {
  importDomainSales()
    .then(() => getImportStats())
    .then(() => {
      console.log('Domain sales import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importDomainSales, getImportStats };