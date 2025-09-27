#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const csv = require('csv-parser');

// Database connection with optimized settings for bulk import
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Increased connection pool
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

// Enhanced batch processing for full dataset
async function importFullDataset() {
  const client = await pool.connect();
  
  try {
    console.log('Starting full dataset import...');
    console.log('Optimizing database for bulk insert...');
    
    // Optimize database for bulk import (compatible settings)
    await client.query('SET synchronous_commit = OFF');
    await client.query('SET commit_delay = 100000');
    await client.query('SET commit_siblings = 10');
    
    // Check current count
    const currentCount = await client.query('SELECT COUNT(*) FROM domain_sales');
    const existingRecords = parseInt(currentCount.rows[0].count);
    console.log(`Existing records: ${existingRecords.toLocaleString()}`);
    
    if (existingRecords >= 300000) {
      console.log('Dataset appears to be already mostly imported. Skipping...');
      return;
    }
    
    // Clear existing data to avoid conflicts
    console.log('Clearing existing data for clean import...');
    await client.query('TRUNCATE TABLE domain_sales RESTART IDENTITY');
    
    // Drop indexes during import for speed
    console.log('Dropping indexes for faster import...');
    const dropIndexQueries = [
      'DROP INDEX IF EXISTS idx_domain_sales_domain_name',
      'DROP INDEX IF EXISTS idx_domain_sales_tld',
      'DROP INDEX IF EXISTS idx_domain_sales_length', 
      'DROP INDEX IF EXISTS idx_domain_sales_price',
      'DROP INDEX IF EXISTS idx_domain_sales_date',
      'DROP INDEX IF EXISTS idx_domain_sales_search',
      'DROP INDEX IF EXISTS idx_domain_sales_year',
      'DROP INDEX IF EXISTS idx_domain_sales_price_range'
    ];
    
    for (const query of dropIndexQueries) {
      try {
        await client.query(query);
      } catch (e) {
        // Index might not exist, continue
      }
    }
    
    // Use COPY for maximum performance
    console.log('Starting bulk import with COPY...');
    
    let processedCount = 0;
    let errorCount = 0;
    const batchSize = 5000;
    let batch = [];
    
    const tsvPath = path.join(__dirname, '../../data/domain-name-sales.tsv');
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      fs.createReadStream(tsvPath)
        .pipe(csv({ separator: '\t' }))
        .on('data', async (row) => {
          try {
            const domain = row.domain;
            const price = parseInt(row.price);
            const date = row.date;
            const venue = row.venue || 'Unknown';
            
            // Skip invalid rows
            if (!domain || isNaN(price) || !date || price < 1) {
              errorCount++;
              return;
            }
            
            // Skip if price is unreasonably high (likely data error)
            if (price > 100000000) {
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
              await processBatchWithCopy(client, batch);
              processedCount += batch.length;
              batch = [];
              
              if (processedCount % 25000 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                const rate = processedCount / elapsed;
                const remaining = 348236 - processedCount;
                const eta = remaining / rate;
                console.log(`Processed ${processedCount.toLocaleString()} records (${rate.toFixed(0)} rec/sec, ETA: ${Math.round(eta/60)}min)`);
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
              await processBatchWithCopy(client, batch);
              processedCount += batch.length;
            }
            
            console.log('\\nBulk import completed! Recreating indexes...');
            
            // Recreate indexes
            const indexQueries = [
              'CREATE INDEX idx_domain_sales_domain_name ON domain_sales(domain_name)',
              'CREATE INDEX idx_domain_sales_tld ON domain_sales(tld)',
              'CREATE INDEX idx_domain_sales_length ON domain_sales(domain_length)',
              'CREATE INDEX idx_domain_sales_price ON domain_sales(sale_price)',
              'CREATE INDEX idx_domain_sales_date ON domain_sales(sale_date)',
              'CREATE INDEX idx_domain_sales_search ON domain_sales(domain_name, tld, domain_length)',
              'CREATE INDEX idx_domain_sales_year ON domain_sales(EXTRACT(YEAR FROM sale_date))',
              'CREATE INDEX idx_domain_sales_price_range ON domain_sales(sale_price) WHERE sale_price BETWEEN 100 AND 100000'
            ];
            
            for (const query of indexQueries) {
              console.log('Creating index...');
              await client.query(query);
            }
            
            // Reset database settings
            await client.query('RESET synchronous_commit');
            await client.query('RESET commit_delay');
            await client.query('RESET commit_siblings');
            
            const totalTime = (Date.now() - startTime) / 1000;
            console.log(`\\n=== IMPORT COMPLETED ===`);
            console.log(`Total time: ${Math.round(totalTime/60)} minutes`);
            console.log(`Processed: ${processedCount.toLocaleString()} records`);
            console.log(`Errors: ${errorCount.toLocaleString()} records`);
            console.log(`Rate: ${Math.round(processedCount/totalTime)} records/second`);
            
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

// Optimized batch processing using COPY
async function processBatchWithCopy(client, batch) {
  try {
    // Convert batch to CSV format for COPY
    const csvData = batch.map(row => 
      row.map(field => {
        if (field === null || field === undefined) return '\\\\N';
        if (typeof field === 'string') {
          // Escape special characters for CSV
          return '"' + field.replace(/"/g, '""') + '"';
        }
        return field;
      }).join(',')
    ).join('\\n');
    
    // Use COPY for maximum performance
    const copyQuery = `
      COPY domain_sales (
        domain, sale_price, sale_date, sale_venue, 
        domain_name, tld, domain_length, has_hyphens, has_numbers, is_idn
      ) FROM STDIN WITH (FORMAT csv, NULL '\\\\N')
    `;
    
    const stream = client.query(require('pg-copy-streams').from(copyQuery));
    
    return new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', resolve);
      stream.write(csvData);
      stream.end();
    });
    
  } catch (error) {
    // Fallback to regular INSERT if COPY fails
    console.log('COPY failed, falling back to INSERT...');
    await processBatchInsert(client, batch);
  }
}

// Fallback batch processing with INSERT
async function processBatchInsert(client, batch) {
  try {
    await client.query('BEGIN');
    
    const insertQuery = `
      INSERT INTO domain_sales (
        domain, sale_price, sale_date, sale_venue, 
        domain_name, tld, domain_length, has_hyphens, has_numbers, is_idn
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    
    for (const row of batch) {
      await client.query(insertQuery, row);
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

// Statistics helper
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
    
    console.log('\\n=== FINAL STATISTICS ===');
    console.log(stats.rows[0]);
    
    // Top TLDs
    const topTlds = await client.query(`
      SELECT tld, COUNT(*) as count, AVG(sale_price)::int as avg_price
      FROM domain_sales 
      GROUP BY tld 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    console.log('\\nTop 10 TLDs by volume:');
    topTlds.rows.forEach(row => {
      console.log(`${row.tld}: ${row.count.toLocaleString()} sales (avg: $${row.avg_price.toLocaleString()})`);
    });
    
    // Price ranges
    const priceRanges = await client.query(`
      SELECT 
        CASE 
          WHEN sale_price < 1000 THEN 'Under $1K'
          WHEN sale_price < 10000 THEN '$1K-$10K'
          WHEN sale_price < 100000 THEN '$10K-$100K'
          WHEN sale_price < 1000000 THEN '$100K-$1M'
          ELSE 'Over $1M'
        END as price_range,
        COUNT(*) as count
      FROM domain_sales
      GROUP BY 
        CASE 
          WHEN sale_price < 1000 THEN 'Under $1K'
          WHEN sale_price < 10000 THEN '$1K-$10K'
          WHEN sale_price < 100000 THEN '$10K-$100K'
          WHEN sale_price < 1000000 THEN '$100K-$1M'
          ELSE 'Over $1M'
        END
      ORDER BY MIN(sale_price)
    `);
    
    console.log('\\nPrice distribution:');
    priceRanges.rows.forEach(row => {
      console.log(`${row.price_range}: ${row.count.toLocaleString()} sales`);
    });
    
  } finally {
    client.release();
  }
}

// Run the import
if (require.main === module) {
  importFullDataset()
    .then(() => getImportStats())
    .then(() => {
      console.log('\\n🚀 Full dataset import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importFullDataset, getImportStats };