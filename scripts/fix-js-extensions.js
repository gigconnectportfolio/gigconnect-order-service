// scripts/fix-js-extensions.js
import fs from 'fs';
import path from 'path';

const BUILD_DIR = path.resolve('./build/src');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Regex to fix relative imports without extensions
    // Matches: import { x } from './something'
    content = content.replace(
        /(from\s+['"])(\.{1,2}\/[^'"]*?)(['"])/g,
        (match, p1, p2, p3) => {
            // Only add .js if not already present
            if (p2.endsWith('.js')) return match;
            return `${p1}${p2}.js${p3}`;
        }
    );

    fs.writeFileSync(filePath, content, 'utf8');
}

function walkDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) walkDir(fullPath);
        else if (file.isFile() && file.name.endsWith('.js')) processFile(fullPath);
    }
}

walkDir(BUILD_DIR);
console.log('✅ Fixed all relative imports with .js extensions in build/src');
