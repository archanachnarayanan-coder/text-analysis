/**
 * Text Analysis API server.
 * Serves: POST/GET /length, POST/GET /num_vowels, and static UI from public/
 * OpenTelemetry is loaded first via telemetry.js so HTTP is instrumented.
 */
require('./telemetry');

const path = require('path');
const express = require('express');
const cors = require('cors');
const { trace } = require('@opentelemetry/api');
const { validateAndSanitizeText } = require('./validation');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Ensure root URL always serves the app
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

function getRawText(req) {
  if (req.body && typeof req.body.text === 'string') return req.body.text;
  if (typeof req.query.text === 'string') return req.query.text;
  return '';
}

app.post('/length', (req, res) => {
  const tracer = trace.getTracer('text-analysis-server', '1.0.0');
  
  // Extract trace context from headers (auto-instrumentation handles this, but we'll add explicit attributes)
  const traceparent = req.headers.traceparent;
  const span = tracer.startSpan('POST /length');
  
  try {
    if (traceparent) span.setAttribute('trace.parent', traceparent);
    const raw = getRawText(req);
    const validated = validateAndSanitizeText(raw);
    if (!validated.ok) {
      span.setAttribute('validation.error', validated.error);
      span.setStatus({ code: 2 });
      span.end();
      return res.status(400).json({ error: validated.error });
    }
    const text = validated.text;
    const length = text.length;
    span.setAttribute('text.length', length);
    span.setAttribute('http.method', 'POST');
    span.setAttribute('http.route', '/length');
    span.end();
    res.json({ length });
  } catch (err) {
    span.recordException(err);
    span.setStatus({ code: 2 });
    span.end();
    res.status(400).json({ error: 'Invalid input' });
  }
});

app.get('/length', (req, res) => {
  const tracer = trace.getTracer('text-analysis-server', '1.0.0');
  const traceparent = req.headers.traceparent;
  const span = tracer.startSpan('GET /length');
  
  try {
    if (traceparent) span.setAttribute('trace.parent', traceparent);
    const raw = getRawText(req);
    const validated = validateAndSanitizeText(raw);
    if (!validated.ok) {
      span.setAttribute('validation.error', validated.error);
      span.setStatus({ code: 2 });
      span.end();
      return res.status(400).json({ error: validated.error });
    }
    const text = validated.text;
    const length = text.length;
    span.setAttribute('text.length', length);
    span.setAttribute('http.method', 'GET');
    span.setAttribute('http.route', '/length');
    span.end();
    res.json({ length });
  } catch (err) {
    span.recordException(err);
    span.setStatus({ code: 2 });
    span.end();
    res.status(400).json({ error: 'Invalid input' });
  }
});

function countVowels(str) {
  const s = String(str).toLowerCase();
  const vowels = 'aeiou';
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    if (vowels.includes(s[i])) count++;
  }
  return count;
}

app.post('/num_vowels', (req, res) => {
  const tracer = trace.getTracer('text-analysis-server', '1.0.0');
  const traceparent = req.headers.traceparent;
  const span = tracer.startSpan('POST /num_vowels');
  
  try {
    if (traceparent) span.setAttribute('trace.parent', traceparent);
    const raw = getRawText(req);
    const validated = validateAndSanitizeText(raw);
    if (!validated.ok) {
      span.setAttribute('validation.error', validated.error);
      span.setStatus({ code: 2 });
      span.end();
      return res.status(400).json({ error: validated.error });
    }
    const text = validated.text;
    const vowel_count = countVowels(text);
    span.setAttribute('text.length', text.length);
    span.setAttribute('vowel.count', vowel_count);
    span.setAttribute('http.method', 'POST');
    span.setAttribute('http.route', '/num_vowels');
    span.end();
    res.json({ vowel_count });
  } catch (err) {
    span.recordException(err);
    span.setStatus({ code: 2 });
    span.end();
    res.status(400).json({ error: 'Invalid input' });
  }
});

app.get('/num_vowels', (req, res) => {
  const tracer = trace.getTracer('text-analysis-server', '1.0.0');
  const traceparent = req.headers.traceparent;
  const span = tracer.startSpan('GET /num_vowels');
  
  try {
    if (traceparent) span.setAttribute('trace.parent', traceparent);
    const raw = getRawText(req);
    const validated = validateAndSanitizeText(raw);
    if (!validated.ok) {
      span.setAttribute('validation.error', validated.error);
      span.setStatus({ code: 2 });
      span.end();
      return res.status(400).json({ error: validated.error });
    }
    const text = validated.text;
    const vowel_count = countVowels(text);
    span.setAttribute('text.length', text.length);
    span.setAttribute('vowel.count', vowel_count);
    span.setAttribute('http.method', 'GET');
    span.setAttribute('http.route', '/num_vowels');
    span.end();
    res.json({ vowel_count });
  } catch (err) {
    span.recordException(err);
    span.setStatus({ code: 2 });
    span.end();
    res.status(400).json({ error: 'Invalid input' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Open the URL above in your browser to use the app.');
});
