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
        // Handle both escaped newlines and actual newlines
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
        // Ensure the private key starts and ends correctly
        if (!parsed.private_key.includes('BEGIN PRIVATE KEY')) {
          throw new Error('Private key format is invalid - missing BEGIN PRIVATE KEY')
        }
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
  const credentialsDir = path.join(process.cwd(), 'credentials')
  
  // Try multiple possible file names
  const possibleFiles = [
    envPath && fs.existsSync(envPath) ? envPath : null,
    path.join(credentialsDir, 'academy-edge-483505-110aaedb192a.json'),
    path.join(credentialsDir, 'academy-edge-483505-b443ee3cd5b9.json'),
  ].filter(Boolean) as string[]

  // Also try to find any JSON file in credentials directory
  let keyPath: string | null = null
  for (const filePath of possibleFiles) {
    if (fs.existsSync(filePath)) {
      keyPath = filePath
      break
    }
  }

  // If still not found, search for any service account JSON file
  if (!keyPath && fs.existsSync(credentialsDir)) {
    try {
      const files = fs.readdirSync(credentialsDir)
      const jsonFile = files.find(f => f.endsWith('.json'))
      if (jsonFile) {
        keyPath = path.join(credentialsDir, jsonFile)
      }
    } catch (e) {
      // Ignore directory read errors
    }
  }

  if (!keyPath) {
    throw new Error('Google service account key not found. Set GOOGLE_SERVICE_ACCOUNT_KEY (JSON string) or GOOGLE_SERVICE_ACCOUNT_KEY_PATH (file path) or add the key to /credentials.')
  }

  try {
    const raw = fs.readFileSync(keyPath, 'utf-8')
    const parsed = JSON.parse(raw)
    
    // Sanitize private key from file as well (in case it has escaped newlines)
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
      // Validate private key format
      if (!parsed.private_key.includes('BEGIN PRIVATE KEY')) {
        throw new Error('Private key format is invalid - missing BEGIN PRIVATE KEY')
      }
    }
    
    console.log('Loaded Google service account from file:', keyPath)
    return parsed
  } catch (error: any) {
    throw new Error(`Failed to read Google service account key from ${keyPath}: ${error.message}`)
  }
}

let credentials: any
let auth: any

function initializeAuth() {
  try {
    credentials = loadServiceAccountCredentials()
    
    // Validate credentials structure
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('Service account credentials are missing required fields (client_email or private_key)')
    }
    
    // Ensure private key is properly formatted
    if (credentials.private_key && !credentials.private_key.includes('BEGIN PRIVATE KEY')) {
      throw new Error('Private key appears to be corrupted or improperly formatted')
    }
    
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    
    // Log which service account is being used (helps debug 403/404)
    console.log('Google Sheets service account initialized:', credentials.client_email)
    
    return true
  } catch (error: any) {
    console.error('Failed to initialize Google Sheets client:', error.message)
    console.error('Error details:', error)
    // Don't throw here - let it fail when getSheetsClient is called
    // This allows the app to start even if credentials are missing
    return false
  }
}

// Initialize on module load
initializeAuth()

export function getSheetsClient() {
  // Re-initialize if auth is not set (e.g., if credentials were added after startup)
  if (!auth) {
    const initialized = initializeAuth()
    if (!initialized) {
      throw new Error('Google Sheets client not initialized. Check your GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_KEY_PATH environment variable. Error: Invalid JWT Signature usually means the private key is corrupted or the service account key has been rotated.')
    }
  }
  
  return google.sheets({
    version: 'v4',
    auth,
  })
}
