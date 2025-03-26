/**
 * This script ensures that critical files exist in the output directory
 * It runs after the Next.js build process via the postbuild script
 */

const fs = require('fs');
const path = require('path');

console.log('Running ensure-files.js post-build script...');

// Define output directory
const outDir = path.join(__dirname, '..', 'out');

// Check if output directory exists
if (!fs.existsSync(outDir)) {
  console.log('Creating output directory...');
  fs.mkdirSync(outDir, { recursive: true });
}

// Create index.html if it doesn't exist
const indexPath = path.join(outDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.log('Creating index.html...');
  fs.writeFileSync(indexPath, `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url=/" />
    <title>Annual Wellness Visit</title>
  </head>
  <body>
    <p>Please wait while we redirect you...</p>
  </body>
</html>`);
}

// Create 404.html if it doesn't exist
const notFoundPath = path.join(outDir, '404.html');
if (!fs.existsSync(notFoundPath)) {
  console.log('Creating 404.html...');
  fs.writeFileSync(notFoundPath, `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Page Not Found</title>
  </head>
  <body>
    <h1>Page Not Found</h1>
    <p>The page you are looking for does not exist.</p>
    <a href="/">Go Home</a>
  </body>
</html>`);
}

console.log('Post-build file check complete!'); 