const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const appJsxPath = path.join(__dirname, '../src/App.jsx');
const content = fs.readFileSync(appJsxPath, 'utf8');

const ast = parser.parse(content, {
  sourceType: 'module',
  plugins: ['jsx']
});

let helpersContent = `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';\n`;
const exportedFunctions = [];
let newAppContent = content;

const nodesToRemove = [];

traverse(ast, {
  VariableDeclaration(pathNode) {
    if (pathNode.parent.type !== 'Program') return;
    pathNode.node.declarations.forEach(declaration => {
      if (declaration.init && (declaration.init.type === 'ArrowFunctionExpression' || declaration.init.type === 'FunctionExpression')) {
        const name = declaration.id.name;
        if (!['App', 'Dashboard', 'MedicalRecords', 'POSSystem', 'InventoryManager'].includes(name)) {
          exportedFunctions.push(name);
          const { start, end } = pathNode.node;
          nodesToRemove.push({ start, end, name });
          helpersContent += `export const ${name} = ${content.substring(declaration.init.start, declaration.init.end)};\n\n`;
        }
      }
    });
  }
});

// Remove extracted nodes from App.jsx
nodesToRemove.sort((a, b) => b.start - a.start);
for (const nodeInfo of nodesToRemove) {
    newAppContent = newAppContent.substring(0, nodeInfo.start) + newAppContent.substring(nodeInfo.end);
}

fs.writeFileSync(path.join(__dirname, '../src/global/helpers.jsx'), helpersContent, 'utf8');
console.log('Helpers extracted:', exportedFunctions.join(', '));

// Update App.jsx with import
const appLines = newAppContent.split(/\r?\n/);
appLines.splice(16, 0, `import { ${exportedFunctions.join(', ')} } from './global/helpers';`);
fs.writeFileSync(appJsxPath, appLines.join('\n'), 'utf8');

// Update all pages
const pagesDir = path.join(__dirname, '../src/pages');
const files = fs.readdirSync(pagesDir);
for (const file of files) {
    if (file.endsWith('.jsx')) {
        const filePath = path.join(pagesDir, file);
        let pageContent = fs.readFileSync(filePath, 'utf8');
        
        let lastImportIdx = 0;
        const pageLines = pageContent.split(/\r?\n/);
        for (let i = 0; i < pageLines.length; i++) {
            if (pageLines[i].startsWith('import ')) {
                lastImportIdx = i;
            }
        }
        
        pageLines.splice(2, 0, `import { ${exportedFunctions.join(', ')} } from '../global/helpers';`);
        fs.writeFileSync(filePath, pageLines.join('\n'), 'utf8');
    }
}
console.log('Updated all pages with helper imports');
