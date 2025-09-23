// Initialize database on app startup
import { initDatabase } from '../lib/database'

export async function ensureDbInitialized() {
  try {
    await initDatabase()
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }
}

// Auto-initialize when this module is imported
ensureDbInitialized()