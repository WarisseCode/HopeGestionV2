const fs = require('fs');
const path = require('path');

const replacements = {
  // Backgrounds
  'bg-white': 'bg-white dark:bg-slate-800',
  'bg-slate-50': 'bg-slate-50 dark:bg-slate-900/50',
  'bg-slate-100': 'bg-slate-100 dark:bg-slate-800/50',
  'bg-gray-50': 'bg-gray-50 dark:bg-slate-900/50',
  'bg-gray-100': 'bg-gray-100 dark:bg-slate-800/50',
  
  // Text Colors
  'text-slate-900': 'text-slate-900 dark:text-white',
  'text-slate-800': 'text-slate-800 dark:text-slate-100',
  'text-slate-700': 'text-slate-700 dark:text-slate-200',
  'text-slate-600': 'text-slate-600 dark:text-slate-300',
  'text-slate-500': 'text-slate-500 dark:text-slate-400',
  'text-gray-900': 'text-gray-900 dark:text-white',
  'text-gray-800': 'text-gray-800 dark:text-gray-100',
  'text-gray-700': 'text-gray-700 dark:text-gray-200',
  'text-gray-600': 'text-gray-600 dark:text-gray-300',
  'text-gray-500': 'text-gray-500 dark:text-gray-400',

  // Border Colors
  'border-slate-100': 'border-slate-100 dark:border-slate-700/50',
  'border-slate-200': 'border-slate-200 dark:border-slate-700',
  'border-gray-100': 'border-gray-100 dark:border-slate-700/50',
  'border-gray-200': 'border-gray-200 dark:border-slate-700',
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      for (const [key, val] of Object.entries(replacements)) {
        // Match exact word, but ensure we don't duplicate dark: classes if already present somewhere right after
        const regex = new RegExp(`\\b${key}\\b(?!\\s*dark:)`, 'g');
        if (regex.test(content)) {
            content = content.replace(regex, val);
            changed = true;
        }
      }
      
      // Cas specifiques sans regex strict ou avec variants
      const extraRegex = /\bbg-slate-50(\/[0-9]+)?\b(?!\s*dark:)/g;
      if (extraRegex.test(content)) {
          content = content.replace(extraRegex, 'bg-slate-50$1 dark:bg-slate-900/50');
          changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

const targetDirs = [
    path.join(__dirname, 'src/components'),
    path.join(__dirname, 'src/pages'),
    path.join(__dirname, 'src/layout')
];

targetDirs.forEach(dir => {
    if (fs.existsSync(dir)) processDirectory(dir);
});

console.log('Global dark mode styling applied.');
