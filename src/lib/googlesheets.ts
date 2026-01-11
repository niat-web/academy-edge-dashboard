import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'

function loadServiceAccountCredentials() {
  // First, try to load from environment variable (for Vercel/production)
  const envKeyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (envKeyJson) {
    try {
      const parsed = JSON.parse(envKeyJson)

      // Sanitize private key: replace literal \n with actual newlines
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
      }

      console.log('Loaded Google service account from GOOGLE_SERVICE_ACCOUNT_KEY env var')
      return parsed
    } catch (error) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', error)
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is set but contains invalid JSON')
    }
  }

  // Fallback to file-based credentials (for local development)
  const envPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
  const defaultPath = path.join(process.cwd(), 'credentials', 'academy-edge-483505-110aaedb192a.json')
  const keyPath = envPath && fs.existsSync(envPath) ? envPath : fs.existsSync(defaultPath) ? defaultPath : null

  if (!keyPath) {
    throw new Error('Google service account key not found. Set GOOGLE_SERVICE_ACCOUNT_KEY (JSON string) or GOOGLE_SERVICE_ACCOUNT_KEY_PATH (file path) or add the key to /credentials.')
  }

  try {
    const raw = fs.readFileSync(keyPath, 'utf-8')
    const parsed = JSON.parse(raw)
    console.log('Loaded Google service account from file:', keyPath)
    return parsed
  } catch (error: any) {
    throw new Error(`Failed to read Google service account key from ${keyPath}: ${error.message}`)
  }
}

let credentials: any
let auth: any

try {
  credentials = loadServiceAccountCredentials()
  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
} catch (error: any) {
  console.error('Failed to initialize Google Sheets client:', error.message)
  // Don't throw here - let it fail when getSheetsClient is called
  // This allows the app to start even if credentials are missing
}

// Log which service account is being used (helps debug 403/404)
try {
  // @ts-ignore internal option access for debug only
  const clientEmail = credentials?.client_email
  console.log('Sheets service account client_email=', clientEmail)
} catch (e) {
  console.warn('Could not log service account client_email')
}

export function getSheetsClient() {
  if (!auth) {
    throw new Error('Google Sheets client not initialized. Check your GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_KEY_PATH environment variable.')
  }
  return google.sheets({
    version: 'v4',
    auth,
  })
}
