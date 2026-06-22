const http = require('http');
const https = require('https');

const GEMINI_API_KEY = 'AQ.Ab8RN6JiOyFoLP_knrQMWzVuyky-yTjawVQtSWNu4w26s7mRfQ';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/analyze') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        const userText = incoming.messages[0].content;

        const geminiBody = JSON.stringify({
          contents: [{ parts: [{ text: userText }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
        });

        const options = {
          hostname: 'generativelanguage.googleapis.com',
          path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(geminiBody)
          }
        };

        const proxyReq = https.request(options, (proxyRes) => {
          let data = '';
          proxyRes.on('data', chunk => data += chunk);
          proxyRes.on('end', () => {
            try {
              const geminiResp = JSON.parse(data);
              const text = geminiResp.candidates[0].content.parts[0].text;
              // Reformat to match Anthropic response structure
              const anthropicStyle = {
                content: [{ type: 'text', text: text }]
              };
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify(anthropicStyle));
            } catch(e) {
              res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ error: 'Parse error: ' + e.message, raw: data.slice(0, 300) }));
            }
          });
        });

        proxyReq.on('error', (e) => {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: e.message }));
        });

        proxyReq.write(geminiBody);
        proxyReq.end();
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Bad request: ' + e.message }));
      }
    });
  } else {
    res.writeHead(200);
    res.end('FakeGuard Proxy (Gemini) running.');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Proxy running on port ' + PORT));
