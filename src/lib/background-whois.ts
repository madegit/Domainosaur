import { getWhoisData } from './xai'
import { getSupabaseClient } from './database'

/**
 * Update WHOIS data for a domain in the background
 * This runs asynchronously after the initial domain evaluation
 */
export async function updateWhoisInBackground(domain: string, appraisalId?: number): Promise<void> {
  try {
    console.log(`Starting background WHOIS lookup for ${domain}`)
    
    // Get WHOIS data
    const whoisData = await getWhoisData(domain)
    
    // Update the database record if we have an appraisal ID
    if (appraisalId) {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('appraisals')
        .update({ 
          whois_data: whoisData 
        })
        .eq('id', appraisalId)
      
      if (error) {
        console.error('Failed to update WHOIS data in database:', error)
      } else {
        console.log(`WHOIS data updated for ${domain} (ID: ${appraisalId})`)
      }
    } else {
      // If no appraisal ID, find the most recent appraisal for this domain first
      const supabase = await getSupabaseClient()
      
      const { data: latestAppraisal, error: selectError } = await supabase
        .from('appraisals')
        .select('id')
        .eq('domain', domain)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (selectError) {
        console.error('Failed to find latest appraisal for WHOIS update:', selectError)
        return
      }
      
      if (latestAppraisal) {
        const { error: updateError } = await supabase
          .from('appraisals')
          .update({ 
            whois_data: whoisData 
          })
          .eq('id', latestAppraisal.id)
        
        if (updateError) {
          console.error('Failed to update WHOIS data in database:', updateError)
        } else {
          console.log(`WHOIS data updated for latest ${domain} appraisal (ID: ${latestAppraisal.id})`)
        }
      }
    }
    
  } catch (error) {
    console.error(`Background WHOIS lookup failed for ${domain}:`, error)
  }
}

/**
 * Start WHOIS update in background (fire and forget)
 */
export function startBackgroundWhoisUpdate(domain: string, appraisalId?: number): void {
  // Use setImmediate to run on next tick, ensuring it doesn't block the response
  setImmediate(() => {
    updateWhoisInBackground(domain, appraisalId).catch(error => {
      console.error('Background WHOIS update error:', error)
    })
  })
}