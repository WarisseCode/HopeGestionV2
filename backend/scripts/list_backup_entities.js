const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../backups/backup_entities_2026-01-28T19-22-26-031Z.json'), 'utf-8'));

console.log('Available entities in backup:');
Object.keys(data).forEach(key => {
    if (Array.isArray(data[key])) {
        console.log(`  - ${key}: ${data[key].length} items`);
    } else {
        console.log(`  - ${key}: ${typeof data[key]}`);
    }
});
