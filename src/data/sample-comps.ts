// Use only real database sales data for maximum accuracy
import type { ComparableSale } from '../types'

// Database-driven comparable sales - no fallbacks to synthetic data
export async function findComparables(domain: string, limit: number = 5): Promise<ComparableSale[]> {
  try {
    // Use only real database comparables for accurate valuations
    const { findDatabaseComparables } = await import('../lib/database-comps')
    const dbComps = await findDatabaseComparables(domain, limit)
    return dbComps // Return even if empty - better than synthetic data
  } catch (error) {
    console.error('Database comparables failed:', error)
    // Return empty array rather than synthetic data for accuracy
    return []
  }
}

// Export the ComparableSale interface
export type { ComparableSale }