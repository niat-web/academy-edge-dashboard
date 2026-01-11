const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: '.env.local' });

// Mock NextResponse
const NextResponse = {
    json: (data, init) => {
        console.log('NextResponse.json called with:', JSON.stringify(data, null, 2));
        return {
            json: async () => data,
            ...data
        };
    }
};

// Mock import of routes
// We need to simulate the environment of the route handlers
// Since they use ES modules and 'import', we might need to use dynamic imports or transpile
// For now, let's try to mock the core logic directly in this script to verify connectivity

async function runTest() {
    console.log('Starting local reproduction test...');

    try {
        // 1. Credentials Test
        console.log('\n--- Credentials Test ---');
        const envKeyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        console.log('GOOGLE_SERVICE_ACCOUNT_KEY present:', !!envKeyJson);

        let credentials;
        if (envKeyJson) {
            try {
                credentials = JSON.parse(envKeyJson);
                console.log('Parsed GOOGLE_SERVICE_ACCOUNT_KEY successfully');
            } catch (e) {
                console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', e.message);
            }
        } else {
            const keyPath = path.join(process.cwd(), 'credentials', 'academy-edge-483505-110aaedb192a.json');
            console.log('Checking fallback file path:', keyPath);
            if (fs.existsSync(keyPath)) {
                credentials = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
                console.log('Loaded credentials from file');
            } else {
                console.error('Credentials file not found');
            }
        }

        if (!credentials) {
            throw new Error('No valid credentials found');
        }

        // 2. Google Sheets Connection Test
        console.log('\n--- Google Sheets Connection Test ---');
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // 3. College Tracker Logic Replication
        console.log('\n--- College Tracker Logic Test ---');
        const spreadsheetId = process.env.MASTER_TRACKER_SHEET_ID;
        console.log('MASTER_TRACKER_SHEET_ID:', spreadsheetId);

        if (!spreadsheetId) {
            throw new Error('MASTER_TRACKER_SHEET_ID is missing');
        }

        // Try basic fetch
        console.log('Attempting to fetch spreadsheet metadata...');
        const response = await sheets.spreadsheets.get({
            spreadsheetId,
            includeGridData: false // Light request first
        });
        console.log('Spreadsheet title:', response.data.properties.title);

        // Function that was failing?
        console.log('Attempting to fetch with grid data (heavy request)...');
        try {
            const heavyResponse = await sheets.spreadsheets.get({
                spreadsheetId,
                includeGridData: true
            });
            console.log('Heavy request success. Sheet count:', heavyResponse.data.sheets.length);

            const sheetName = process.env.MASTER_TRACKER_SHEET_NAME || heavyResponse.data.sheets[0].properties.title;
            console.log('Target Sheet Name:', sheetName);

            const sheet = heavyResponse.data.sheets.find(s => s.properties.title === sheetName);
            if (sheet && sheet.data && sheet.data[0].rowData) {
                console.log('Found rows:', sheet.data[0].rowData.length);
            } else {
                console.log('Sheet data not found or empty');
            }

        } catch (e) {
            console.error('Heavy request failed:', e.message);
            fs.writeFileSync('error_log.json', JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
        }

    } catch (error) {
        console.error('FATAL ERROR:', error);
        fs.writeFileSync('fatal_log.json', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
}

runTest();
