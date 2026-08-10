const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = 3000;
const PUBLIC_DIR = __dirname;
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function saveSubmission(data) {
  let existing = [];
  try {
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      existing = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf8'));
    }
  } catch (err) {
    existing = [];
  }
  existing.push({
    timestamp: new Date().toISOString(),
    ...data
  });
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(existing, null, 2), 'utf8');
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  // Handle Form Submissions (Backend Endpoints)
  if (req.method === 'POST' && (pathname.includes('/forms/') || pathname.endsWith('.php'))) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      console.log(`\n📬 [NEW FORM SUBMISSION] Endpoint: ${pathname}`);
      let formData = {};
      
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
        formData = querystring.parse(body);
      } else {
        formData = { raw: body };
        // Extract email string from multipart / raw body if present
        const match = body.match(/name="email"[\r\n\s]+([^\r\n]+)/i) || body.match(/name="from_email"[\r\n\s]+([^\r\n]+)/i);
        if (match) {
          formData.email = match[1].trim();
        }
      }
      
      const email = formData.email || formData.from_email || formData.email_input;
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      if (email && !emailRegex.test(email)) {
        console.log('❌ [INVALID EMAIL REJECTED]:', email);
        res.writeHead(400, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end('يرجى كتابة البريد الإلكتروني بشكل صحيح وحقيقي (مثال: name@example.com)');
        return;
      }
      
      console.log('Submitted Data:', formData);
      saveSubmission({ endpoint: pathname, formData });

      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end('OK');
    });
    return;
  }

  // Handle Static File Serving (Frontend)
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Restaurantly Full-Stack Server Running!`);
  console.log(`🌐 Frontend & Backend URL: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
