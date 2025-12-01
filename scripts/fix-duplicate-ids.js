const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../lib/scenarios.ts');
const content = fs.readFileSync(filePath, 'utf-8');

// Track all IDs we've seen
const seenIds = new Set();
let newContent = content;

// Find all scenario IDs and update duplicates
let match;
const idRegex = /id: '([^']+)'/g;
const idMap = new Map();

// First pass: find all IDs and track their counts
while ((match = idRegex.exec(content)) !== null) {
  const id = match[1];
  if (idMap.has(id)) {
    idMap.set(id, idMap.get(id) + 1);
  } else {
    idMap.set(id, 1);
  }
}

// Second pass: update duplicate IDs
const duplicateIds = Array.from(idMap.entries())
  .filter(([_, count]) => count > 1)
  .map(([id]) => id);

// Sort by length in descending order to handle prefixes properly
duplicateIds.sort((a, b) => b.length - a.length);

// Process each duplicate ID
for (const id of duplicateIds) {
  const regex = new RegExp(`id: '${id}'`, 'g');
  let count = 0;
  
  // Replace each occurrence with a unique ID
  newContent = newContent.replace(regex, (match) => {
    count++;
    return count === 1 ? match : `id: '${id}-${count}'`;
  });
  
  console.log(`Updated ${count - 1} duplicate(s) of ID: ${id}`);
}

// Write the updated content back to the file
fs.writeFileSync(filePath, newContent, 'utf-8');
console.log('Duplicate IDs have been fixed.');
