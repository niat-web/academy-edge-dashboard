const fs = require('fs');
const path = require('path');

// 1. Load the REAL credentials
const keyPath = path.join(process.cwd(), 'credentials', 'academy-edge-483505-110aaedb192a.json');
const realKey = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));

// 2. Break them intentionally (simulate Vercel copy-paste issue)
// Replace actual newlines with literal "\n" string characters
const brokenKey = {
    ...realKey,
    private_key: realKey.private_key.replace(/\n/g, '\\n')
};

console.log('--- Simulation Setup ---');
console.log('Broken key contains actual newlines:', brokenKey.private_key.includes('\n'));
console.log('Broken key contains literal \\n:', brokenKey.private_key.includes('\\n'));

// 3. Test the fix logic
console.log('\n--- Testing Fix Logic ---');

function sanitizeKey(key) {
    if (key.private_key) {
        return key.private_key.replace(/\\n/g, '\n');
    }
    return key.private_key;
}

const fixedKey = sanitizeKey(brokenKey);
console.log('Fixed key contains actual newlines:', fixedKey.includes('\n'));
console.log('Fixed key contains literal \\n (should be false/less):', fixedKey.includes('\\n') && !fixedKey.match(/\\n/)); // It might still contain it if it was part of the key structure unlikely, simplified check

// 4. Verify formatting match
console.log('Result matches original:', fixedKey === realKey.private_key);

if (fixedKey === realKey.private_key) {
    console.log('\nSUCCESS: The fix correctly repairs the broken Vercel key format!');
} else {
    console.error('\nFAILURE: The fix did not restore the original key.');
}
