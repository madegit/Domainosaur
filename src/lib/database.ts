import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create a Supabase client for server-side operations
async function getSupabaseClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component - ignore
          }
        },
      },
    }
  )
}

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
  const supabase = await getSupabaseClient()
  
  try {
    // Note: With Supabase, table creation should be done through the Supabase dashboard
    // or SQL editor, not programmatically. This is just a placeholder to maintain compatibility.
    // The actual table should be created in your Supabase project.
    
    console.log('Database initialized successfully (using Supabase)')
  } catch (error) {
    console.error('Failed to initialize Supabase:', error)
    throw error
  }
}

export { getSupabaseClient }