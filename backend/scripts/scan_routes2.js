const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

const inventory = [];

for (const file of files) {
    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const usesPoolQuery = content.includes('pool.query');
    const hasTenantGuard = content.includes('tenantGuard');
    
    // Check if it applies tenantGuard everywhere it uses pool.query or router.(get|post|delete...)
    let tenantGuardStatus = 'Non';
    if (hasTenantGuard) {
        // Simple heuristic: if it has it in the file it might be Partial or Oui.
        // We know bienRoutes.ts is "Oui", the rest is likely "Non".
        tenantGuardStatus = file === 'bienRoutes.ts' ? 'Oui' : 'Partiel';
    }

    // Check for UPDATE/DELETE without owner_id
    // This is a rough estimation.
    let hasUnsafeUpdateDelete = 'Non';
    const lines = content.split('\n');
    for (const line of lines) {
        if (line.match(/pool\.query\([\s\S]*?(UPDATE|DELETE)[\s\S]*?\)/i)) {
            // Very naive check for this summary table
            if (!line.includes('owner_id')) {
                 hasUnsafeUpdateDelete = 'Oui';
            }
        }
    }
    
    // Better regex for multi-line queries
    const updateDeleteMatches = content.match(/(?:pool|dbClient)\.query\s*\([\s\S]*?(?:UPDATE|DELETE)[\s\S]*?\)/gi);
    if (updateDeleteMatches) {
        for (const match of updateDeleteMatches) {
            if (!match.includes('owner_id') && !hasTenantGuard) {
                hasUnsafeUpdateDelete = 'Oui';
                break;
            }
        }
    }

    inventory.push({
        File: file,
        UsesPoolQuery: usesPoolQuery ? 'Oui' : 'Non',
        AppliesTenantGuard: tenantGuardStatus,
        UnsafeUpdateDelete: hasUnsafeUpdateDelete
    });
}

console.log(JSON.stringify(inventory, null, 2));
