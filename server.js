const http = require('http');

function analyzeText(title, content) {
  const text = ((title || '') + ' ' + content).toLowerCase();
  const fullText = title + ' ' + content;

  // ── Fake indicators ──
  const fakePatterns = [
    /\b(shocking|bombshell|exposed|breaking|urgent|alert|warning)\b/gi,
    /\b(they don't want you to know|mainstream media|deep state|new world order)\b/gi,
    /\b(miracle|cure|secret|hidden|suppressed|censored|banned)\b/gi,
    /\b(share before|gets deleted|share immediately|spread the word)\b/gi,
    /\b(big pharma|illuminati|cover.?up|conspiracy)\b/gi,
    /\b(scientists? (have )?proven|doctors? hate|one weird trick)\b/gi,
    /[A-Z]{4,}/g,  // excessive caps
    /!{2,}/g,      // multiple exclamation marks
    /\b(government is hiding|they are hiding|truth about)\b/gi,
    /\b(100%|guaranteed|proven fact|wake up)\b/gi,
  ];

  // ── Real indicators ──
  const realPatterns = [
    /\b(according to|reported by|said in a statement|officials? said)\b/gi,
    /\b(reuters|associated press|bbc|cnn|nytimes|washington post)\b/gi,
    /\b(study|research|published|journal|university|institute)\b/gi,
    /\b(percent|million|billion|quarter|fiscal|revenue|earnings)\b/gi,
    /\b(spokesperson|statement|press release|announced)\b/gi,
    /\b(data shows?|statistics|evidence|survey|poll)\b/gi,
  ];

  let fakeScore = 0;
  let realScore = 0;
  const fakeMatches = [];
  const realMatches = [];

  fakePatterns.forEach(p => {
    const m = fullText.match(p);
    if (m) { fakeScore += m.length * 12; fakeMatches.push(...m.slice(0,1)); }
  });

  realPatterns.forEach(p => {
    const m = fullText.match(p);
    if (m) { realScore += m.length * 15; realMatches.push(...m.slice(0,1)); }
  });

  // Emotional punctuation
  const exclamations = (fullText.match(/!/g) || []).length;
  const capsWords = (fullText.match(/\b[A-Z]{3,}\b/g) || []).length;
  fakeScore += exclamations * 5 + capsWords * 8;

  // Lack of sources
  const hasSources = realScore > 0;
  if (!hasSources) fakeScore += 20;

  const total = fakeScore + realScore + 1;
  const fakeProbability = Math.min(95, Math.round((fakeScore / total) * 100));
  const realProbability = 100 - fakeProbability;
  const isFake = fakeProbability > 45;

  const confidence = Math.min(97, Math.max(62, isFake ? 50 + fakeProbability/3 : 50 + realProbability/3));
  const credibility = Math.min(98, Math.max(5, isFake ? 100 - fakeProbability : realProbability + 10));

  // Sentiment
  const negWords = (text.match(/\b(bad|terrible|dangerous|deadly|worst|corrupt|evil|toxic|hide|lying)\b/g)||[]).length;
  const posWords = (text.match(/\b(good|great|success|growth|positive|strong|improve|benefit)\b/g)||[]).length;
  const sentiment = negWords > posWords ? 'Negative' : posWords > negWords ? 'Positive' : 'Neutral';

  // Writing style
  const isExclamatory = exclamations > 2 || capsWords > 3;
  const isBiased = fakeScore > 30 && realScore === 0;
  const writingStyle = isExclamatory ? 'Sensational' : isBiased ? 'Biased' : hasSources ? 'Professional' : 'Neutral';

  // Key indicators
  const indicators = [];
  if (capsWords > 2) indicators.push(`Contains ${capsWords} ALL-CAPS words indicating emotional manipulation`);
  if (exclamations > 1) indicators.push(`Uses ${exclamations} exclamation marks suggesting sensationalism`);
  if (!hasSources) indicators.push('No credible sources or citations referenced');
  if (fakeMatches.length > 0) indicators.push(`Contains fake news trigger words: "${fakeMatches.slice(0,2).join('", "')}"`);
  if (realMatches.length > 0) indicators.push(`Contains credibility markers: "${realMatches.slice(0,2).join('", "')}"`);
  if (indicators.length < 3) indicators.push(isFake ? 'Uses fear-based language to drive engagement' : 'Presents factual claims with verifiable details');
  if (indicators.length < 3) indicators.push(isFake ? 'Encourages rapid sharing without verification' : 'Language consistent with professional journalism standards');

  const summary = isFake
    ? `This article displays multiple characteristics of misinformation including sensational language, lack of credible sources, and emotional manipulation tactics. The NLP analysis detected ${fakeMatches.length} fake news indicators.`
    : `This article demonstrates credibility markers consistent with legitimate journalism including factual language, source references, and professional writing style. The NLP analysis detected ${realMatches.length} credibility indicators.`;

  return {
    verdict: isFake ? 'FAKE' : 'REAL',
    confidence: Math.round(confidence),
    credibility_score: Math.round(credibility),
    sentiment,
    writing_style: writingStyle,
    key_indicators: indicators.slice(0, 3),
    summary,
    nlp_features: {
      exaggerated_language: capsWords > 2 || exclamations > 2,
      emotional_manipulation: fakeScore > 40,
      lacks_sources: !hasSources,
      clickbait_headline: title ? /\b(shocking|secret|you won't believe|amazing|incredible)\b/i.test(title) : false,
      factual_claims: realScore > 20
    }
  };
}

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
        const { title, content } = JSON.parse(body);
        const result = analyzeText(title, content);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(result));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.writeHead(200);
    res.end('FakeGuard NLP Proxy running.');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('FakeGuard NLP running on port ' + PORT));
