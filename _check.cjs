const fs = require('fs');
const code = fs.readFileSync('app.bundle.js', 'utf8');
const lines = code.split('\n');
const topLevelDecls = {};
let braceDepth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  braceDepth += (line.match(/{/g) || []).length;
  braceDepth -= (line.match(/}/g) || []).length;
  if (braceDepth === 1) {
    const m = line.match(/^(const|let|function)\s+(\w+)/);
    if (m) {
      const name = m[2];
      if (topLevelDecls[name]) {
        console.log('DUPLICATE: ' + name + ' at lines ' + topLevelDecls[name] + ' and ' + (i+1));
      }
      topLevelDecls[name] = i + 1;
    }
  }
}
console.log('Check complete');
