const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../frontend/src');

const replacements = {
  '\\bbg-white\\b': 'bg-base-100',
  '\\btext-gray-300\\b': 'text-base-content/40',
  '\\btext-gray-400\\b': 'text-base-content/50',
  '\\btext-gray-500\\b': 'text-base-content/60',
  '\\btext-gray-600\\b': 'text-base-content/70',
  '\\btext-gray-700\\b': 'text-base-content/80',
  '\\btext-gray-800\\b': 'text-base-content/90',
  '\\btext-gray-900\\b': 'text-base-content',
  '\\bbg-gray-50\\b': 'bg-base-200',
  '\\bbg-gray-100\\b': 'bg-base-200',
  '\\bbg-gray-200\\b': 'bg-base-300',
  '\\bborder-gray-100\\b': 'border-base-200',
  '\\bborder-gray-200\\b': 'border-base-200',
  '\\bborder-gray-300\\b': 'border-base-300',
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedFilesCount = 0;

walkDir(directoryPath, function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let fileContent = fs.readFileSync(filePath, 'utf8');
    let originalContent = fileContent;

    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(key, 'g');
      fileContent = fileContent.replace(regex, value);
    }

    if (fileContent !== originalContent) {
      fs.writeFileSync(filePath, fileContent, 'utf8');
      modifiedFilesCount++;
      console.log(`Modified: ${filePath}`);
    }
  }
});

console.log(`\nFinished refactoring! Modified ${modifiedFilesCount} files.`);
