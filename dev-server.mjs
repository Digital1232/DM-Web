import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for local development
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  // Disable caching for service worker & version to prevent stale cache during local dev
  if (req.path === '/sw.js' || req.path === '/version.txt') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  
  next();
});

// Serve static assets from project root
app.use(express.static(__dirname, {
  index: 'index.html',
  extensions: ['html', 'htm']
}));

// Fallback to index.html for SPA routing if needed
app.get('*', (req, res, next) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    next();
  }
});

const server = app.listen(PORT, () => {
  const localUrl = `http://localhost:${PORT}`;
  
  // Find local network IP
  const interfaces = os.networkInterfaces();
  let networkUrl = '';
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        networkUrl = `http://${net.address}:${PORT}`;
        break;
      }
    }
    if (networkUrl) break;
  }

  console.log(`\n🚀 Local server running!`);
  console.log(`➜ Local:   ${localUrl}`);
  if (networkUrl) {
    console.log(`➜ Network: ${networkUrl}`);
  }
  console.log(`Serving files from: ${__dirname}\n`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
