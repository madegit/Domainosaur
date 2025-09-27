// For convenience, export both client types
export { createClient as createBrowserClient } from './client'
export { createClient as createServerClient } from './server'

// Legacy export for backward compatibility
export const supabase = () => {
  if (typeof window !== 'undefined') {
    // Client-side
    const { createClient } = require('./client')
    return createClient()
  } else {
    // Server-side - this should not be used, prefer createServerClient
    throw new Error('Use createServerClient for server-side operations')
  }
}