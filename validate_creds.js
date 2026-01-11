const fs = require('fs');
const path = require('path');

const keyPath = path.join(process.cwd(), 'credentials', 'academy-edge-483505-110aaedb192a.json');

try {
    const content = fs.readFileSync(keyPath, 'utf-8');
    const key = JSON.parse(content);

    const log = [
        '--- Credential Validation ---',
        'Has client_email: ' + !!key.client_email,
        'Has private_key: ' + !!key.private_key,
        key.private_key ? 'Private key starts with header: ' + key.private_key.trim().startsWith('-----BEGIN PRIVATE KEY-----') : 'No private key',
        key.private_key ? 'Private key contains actual newlines: ' + key.private_key.includes('\n') : 'No private key',
        key.private_key ? 'Private key contains escaped slash-n: ' + key.private_key.includes('\\n') : 'No private key'
    ].join('\n');

    console.log(log);
    fs.writeFileSync('validation_log.txt', log);

} catch (e) {
    console.error('Validation failed:', e.message);
    fs.writeFileSync('validation_log.txt', 'Validation failed: ' + e.message);
}
