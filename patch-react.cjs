const fs = require('fs');
const mainPath = 'src/main.tsx';
let main = fs.readFileSync(mainPath, 'utf8');
if (!main.includes('console.error = ')) {
  const patch = `
const originalError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Encountered two children with the same key')) {
    originalError(...args);
    console.trace('Duplicate key trace');
  } else {
    originalError(...args);
  }
};
`;
  main = patch + main;
  fs.writeFileSync(mainPath, main);
  console.log('Patched src/main.tsx');
}
