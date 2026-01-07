import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'

function loadServiceAccountCredentials() {
  const envPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
  const defaultPath = path.join(process.cwd(), 'credentials', 'academy-edge-483505-110aaedb192a.json')
  const keyPath = envPath && fs.existsSync(envPath) ? envPath : fs.existsSync(defaultPath) ? defaultPath : null

  if (!keyPath) {
    throw new Error('Google service account key not found. Set GOOGLE_SERVICE_ACCOUNT_KEY_PATH or add the key to /credentials.')
  }

  const raw = fs.readFileSync(keyPath, 'utf-8')
  const parsed = JSON.parse(raw)
  return parsed
}

const credentials = loadServiceAccountCredentials()
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})

// Log which service account is being used (helps debug 403/404)
try {
  // @ts-ignore internal option access for debug only
  const clientEmail = credentials?.client_email
  console.log('Sheets service account client_email=', clientEmail)
} catch (e) {
  console.warn('Could not log service account client_email')
}

export function getSheetsClient() {
  return google.sheets({
    version: 'v4',
    auth,
  })
}
