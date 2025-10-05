const fs = require('fs');
const path = require('path');

const filesToCopy = [
  'aiLoader.js',
  'contentScript.js', 
  'injectedPanel.html',
  'injectedPanel.js',
  'manifest.json'
];

filesToCopy.forEach(file => {
  const source = path.join(__dirname, 'public', file);
  const dest = path.join(__dirname, 'build', file);
  
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log(`Copied ${file} to build directory`);
  }
});