const fs = require('node:fs');
const path = require('node:path');
const target = path.join(__dirname, '..', 'public', 'vendor');
fs.mkdirSync(target, { recursive: true });
fs.copyFileSync(require.resolve('jspdf/dist/jspdf.umd.min.js'), path.join(target, 'jspdf.umd.min.js'));
fs.copyFileSync(path.join(path.dirname(require.resolve('jspdf/package.json')), 'LICENSE'), path.join(target, 'jspdf-LICENSE.txt'));
console.log('Prepared local PDF download assets.');
