const fs = require('fs');
const path = require('path');

const traverseDir = (dir, fileList = []) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === 'dist' || file === 'tests' || file === 'migrations' || file === 'scripts') continue;
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            traverseDir(filePath, fileList);
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
            fileList.push(filePath);
        }
    }
    return fileList;
};

const backendDir = path.join(__dirname, '..');
const files = traverseDir(backendDir);

const results = [];

const queryRegex = /(?:pool|client|db)\.query\s*\(\s*`([^`]+)`([^;]+)?/g;
const queryRegexSingleQuote = /(?:pool|client|db)\.query\s*\(\s*'([^']+)'([^;]+)?/g;
const queryRegexDoubleQuote = /(?:pool|client|db)\.query\s*\(\s*"([^"]+)"([^;]+)?/g;

for (const file of files) {
    if (file.includes('audit_tenant.js')) continue;
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    // Simplification for finding missing where clauses in queries
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('.query(')) {
            // Check context lines
            let queryStr = lines.slice(i, i + 15).join('\n');
            const isSelect = queryStr.toUpperCase().includes('SELECT');
            const isUpdate = queryStr.toUpperCase().includes('UPDATE');
            const isDelete = queryStr.toUpperCase().includes('DELETE');
            const isInsert = queryStr.toUpperCase().includes('INSERT');
            
            if (!isSelect && !isUpdate && !isDelete && !isInsert) continue;
            
            const hasOwnerFilter = queryStr.includes('owner_id') || queryStr.includes('agency_id') || queryStr.includes('tenant_id') || queryStr.includes('whereClause');
            
            if (!hasOwnerFilter) {
                // To avoid too many false positives, ignore queries on system tables (pg_, information_schema, etc.) and users/auth related which might not have tenant isolating yet.
                if (queryStr.includes('information_schema') || queryStr.includes('pg_')) continue;
                
                results.push({
                    file: file.replace(backendDir, ''),
                    line: i + 1,
                    snippet: queryStr.substring(0, 150) + '...'
                });
            }
        }
    }
}

console.log(JSON.stringify(results, null, 2));
