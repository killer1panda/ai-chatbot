const fs = require('fs');
const path = require('path');

const directory = './src/icons';

const replacements = [
  { regex: /fill-rule/g, replacement: 'fillRule' },
  { regex: /clip-rule/g, replacement: 'clipRule' },
  { regex: /stroke-width/g, replacement: 'strokeWidth' },
  { regex: /stroke-linecap/g, replacement: 'strokeLinecap' },
  { regex: /stroke-linejoin/g, replacement: 'strokeLinejoin' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;

      for (const { regex, replacement } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed icons in: ${filePath}`);
      }
    }
  }
}

processDirectory(directory);
