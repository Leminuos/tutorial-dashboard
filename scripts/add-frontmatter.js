/**
 * Script to add YAML Front Matter to markdown files based on posts.json metadata
 * Run this script from the project root: node scripts/add-frontmatter.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Define all categories and their posts.json paths
const categories = [
  {
    postsJsonPath: 'public/tutorials/Embedded/1. Essential/posts.json',
    basePath: 'public/tutorials/Embedded/1. Essential'
  },
  {
    postsJsonPath: 'public/tutorials/Embedded/2. Makefile/posts.json',
    basePath: 'public/tutorials/Embedded/2. Makefile'
  },
  {
    postsJsonPath: 'public/tutorials/Embedded/3. FreeRTOS/posts.json',
    basePath: 'public/tutorials/Embedded/3. FreeRTOS'
  },
  {
    postsJsonPath: 'public/tutorials/Embedded/4. Multicore/posts.json',
    basePath: 'public/tutorials/Embedded/4. Multicore'
  },
  {
    postsJsonPath: 'public/tutorials/Embedded/5. USB/posts.json',
    basePath: 'public/tutorials/Embedded/5. USB'
  },
  {
    postsJsonPath: 'public/tutorials/Vi điều khiển/esp32/posts.json',
    basePath: 'public/tutorials/Vi điều khiển/esp32'
  }
];

function generateFrontMatter(metadata) {
  let frontMatter = '---\n';

  if (metadata.title) {
    frontMatter += `title: "${metadata.title}"\n`;
  }

  if (metadata.description) {
    // Escape quotes in description
    const desc = metadata.description.replace(/"/g, '\\"');
    frontMatter += `description: "${desc}"\n`;
  }

  if (metadata.author) {
    frontMatter += `author: "${metadata.author}"\n`;
  }

  if (metadata.date) {
    frontMatter += `date: "${metadata.date}"\n`;
  }

  if (metadata.image) {
    frontMatter += `image: "${metadata.image}"\n`;
  }

  if (metadata.tags && metadata.tags.length > 0) {
    frontMatter += 'tags:\n';
    for (const tag of metadata.tags) {
      frontMatter += `  - ${tag}\n`;
    }
  }

  frontMatter += '---\n\n';
  return frontMatter;
}

function processCategory(category) {
  const postsJsonPath = path.resolve(projectRoot, category.postsJsonPath);
  const basePath = path.resolve(projectRoot, category.basePath);

  console.log(`\nProcessing: ${category.basePath}`);

  if (!fs.existsSync(postsJsonPath)) {
    console.log(`  ⚠ posts.json not found: ${postsJsonPath}`);
    return;
  }

  const postsJsonContent = fs.readFileSync(postsJsonPath, 'utf-8').replace(/^\uFEFF/, '');
  const postsJson = JSON.parse(postsJsonContent);

  for (const [folderName, metadata] of Object.entries(postsJson)) {
    const readmePath = path.join(basePath, folderName, 'README.md');

    if (!fs.existsSync(readmePath)) {
      console.log(`  ⚠ README.md not found: ${folderName}/README.md`);
      continue;
    }

    let content = fs.readFileSync(readmePath, 'utf-8');

    // Check if already has front matter
    if (content.startsWith('---')) {
      console.log(`  ⏭ Already has front matter: ${folderName}/README.md`);
      continue;
    }

    const frontMatter = generateFrontMatter(metadata);
    const newContent = frontMatter + content;

    fs.writeFileSync(readmePath, newContent, 'utf-8');
    console.log(`  ✓ Added front matter: ${folderName}/README.md`);
  }
}

// Main execution
console.log('Adding YAML Front Matter to markdown files...\n');

for (const category of categories) {
  processCategory(category);
}

console.log('\n✅ Done!');
console.log('\nNext steps:');
console.log('1. Delete the posts.json files');
console.log('2. Test the application to verify everything works');
