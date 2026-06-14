/**
 * ghl.ts — GoHighLevel CRM integration.
 *
 * Uses GHL API v2 with a Private Integration Token (PIT).
 * Creates or updates a contact in the MotorSui location and
 * enrolls them in the free-chart funnel automation.
 *
 * Environment variables required (server-side only):
 *   GHL_API_KEY        Private Integration Token
 *   GHL_LOCATION_ID    GHL location / sub-account ID
 */

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

// Tag applied to every contact created through the free chart funnel.
// In GHL: create a Workflow trigger on this tag to fire the E1/E2/E3 sequence.
const FUNNEL_TAG = 'motorsui-chart-funnel'

export interface GHLContactInput {
  firstName?:    string
  lastName?:     string
  email:         string
  phone?:        string
  birthDate?:    string   // YYYY-MM-DD
  birthCity?:    string
  birthState?:   string
  birthCountry?: string
  birthTime?:    string   // HH:MM
  extraTags?:    string[] // merged with FUNNEL_TAG
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    Version:       GHL_VERSION,
    'Content-Type': 'application/json',
  }
}

/**
 * Create or update a GHL contact.
 *
 * Uses the /contacts/upsert endpoint which deduplicates on email
 * within the location. Safe to call on every registration — duplicate
 * emails will update the existing contact instead of creating a second one.
 *
 * Non-throwing: logs errors internally and returns null on failure so
 * registration flow completes even if GHL is unavailable.
 */
export async function upsertContact(input: GHLContactInput): Promise<string | null> {
  const locationId = process.env.GHL_LOCATION_ID
  if (!process.env.GHL_API_KEY || !locationId) {
    console.warn('[ghl] GHL_API_KEY or GHL_LOCATION_ID not set — skipping contact upsert')
    return null
  }

  try {
    const tags = [FUNNEL_TAG, ...(input.extraTags ?? [])]
    const body: Record<string, unknown> = {
      locationId,
      email:     input.email,
      tags,
    }

    if (input.firstName) body.firstName = input.firstName
    if (input.lastName)  body.lastName  = input.lastName

    if (input.phone)        body.phone       = input.phone
    if (input.birthDate)    body.dateOfBirth = input.birthDate

    // Store birth details in custom fields so GHL automations can reference them
    const customFields: Array<{ key: string; field_value: string }> = []

    if (input.birthCity)    customFields.push({ key: 'birth_city',    field_value: input.birthCity    })
    if (input.birthState)   customFields.push({ key: 'birth_state',   field_value: input.birthState   })
    if (input.birthCountry) customFields.push({ key: 'birth_country', field_value: input.birthCountry })
    if (input.birthTime)    customFields.push({ key: 'birth_time',    field_value: input.birthTime    })
    if (input.birthDate)    customFields.push({ key: 'birth_date',    field_value: input.birthDate    })

    if (customFields.length > 0) body.customFields = customFields

    const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method:  'POST',
      headers: headers(),
      body:    JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[ghl] upsert failed (${res.status}):`, text)
      return null
    }

    const data = await res.json() as {
      contact?: { id?: string }
      id?: string
    }

    const contactId = data?.contact?.id ?? data?.id ?? null
    console.log(`[ghl] contact upserted — id=${contactId}`)
    return contactId

  } catch (err) {
    console.error('[ghl] upsertContact error:', err)
    return null
  }
}
