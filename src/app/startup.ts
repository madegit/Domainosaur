// Initialize database on app startup
import { initDatabase } from '../lib/database'

let initialized = false

export async function ensureDbInitialized() {
  if (!initialized) {
    try {
      await initDatabase()
      initialized = true
      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize database:', error)
    }
  }
}

// Auto-initialize when this module is imported
ensureDbInitialized()