const fs = require('fs');
const path = require('path');

const replacements = {
  // Backgrounds: utiliser base-100 (clair: blanc, sombre: ardoise 900)
  'bg-white': 'bg-base-100',
  'bg-slate-50': 'bg-base-200',
  'bg-gray-50': 'bg-base-200',
  'bg-slate-100': 'bg-base-300',
  'bg-gray-100': 'bg-base-300',
  
  // Text Colors: utiliser base-content 
  'text-slate-900': 'text-base-content',
  'text-gray-900': 'text-base-content',
  'text-slate-800': 'text-base-content/90',
  'text-gray-800': 'text-base-content/90',
  'text-slate-700': 'text-base-content/80',
  'text-gray-700': 'text-base-content/80',
  'text-slate-600': 'text-base-content/70',
  'text-gray-600': 'text-base-content/70',
  'text-slate-500': 'text-base-content/60',
  'text-gray-500': 'text-base-content/60',

  // Border Colors
  'border-slate-100': 'border-base-200',
  'border-gray-100': 'border-base-200',
  'border-slate-200': 'border-base-300',
  'border-gray-200': 'border-base-300',
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
        // Remplacer uniquement si c'est le mot exact (ex: bg-white mais pas bg-white-500)
        // et qu'on ne l'a pas déjà remplacé (ne pas remplacer bg-base-100 par bg-base-100)
        // On remplace "bg-white" mais que si suivi d'un espace, ou guillemet, etc.
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        if (regex.test(content)) {
            content = content.replace(regex, val);
            changed = true;
        }
      }

      // Cas extra regex:
      const extraRegex = /\bbg-slate-50\/([0-9]+)\b/g;
      if (extraRegex.test(content)) {
          content = content.replace(extraRegex, 'bg-base-200/$1');
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

console.log('Semantic DaisyUI classes applied successfully.');
