# Text Analysis App — Requirements Walkthrough

This document maps each requirement to the corresponding code so you can trace implementation to spec. Use it for review, onboarding, or submission notes.

---

## 1. Functional Requirements

### 1.1 User Interface

| Requirement | Implementation | File(s) | Notes |
|-------------|----------------|---------|--------|
| Web UI with a form | Form with `id="form"` and single text input | `index.html` (lines 16–23) | `<form id="form">`, `<input id="text-input" name="text">` |
| Single text input field | Input for text to analyze | `index.html` (line 19) | `id="text-input"`, `placeholder="Type your text here..."` |
| Submit button | Button submits the form | `index.html` (line 22) | `<button type="submit" id="submit-btn">Submit</button>` |
| Clear instructions | Label tells user what to enter | `index.html` (line 17) | `<label for="text-input">Enter text to analyze</label>` |
| Display areas for API results | Two result cards | `index.html` (lines 26–41) | `#results-area` with `#length-value` and `#vowel-value`; separate `#length-error`, `#vowel-error` for per-endpoint errors |

**Relevant code (structure):**

- **`index.html`**  
  - Form: `<form id="form">` with label, input wrapper (including clear button), submit button.  
  - Results: `<div id="results-area">` containing two cards (Character length, Vowel count) with value and error elements.  
  - Error banner: `<div id="error-area">` for global errors (e.g. validation, network).

---

### 1.2 Client-Side Behavior

| Requirement | Implementation | File(s) | Notes |
|-------------|----------------|---------|--------|
| Two concurrent asynchronous calls | Both endpoints called in parallel | `src/app.js` (lines 176–181) | `Promise.all([ fetch('/length', ...), fetch('/num_vowels', ...) ])` |
| Pass entered text to both endpoints | Same `text` in POST body for each | `src/app.js` (lines 176–180) | `body: JSON.stringify({ text })` for both fetches |
| Display results from both calls | Single function updates both result areas | `src/app.js` (lines 129–150, 188–195) | `showResults({ length, vowel_count, lengthError, vowelError })`; updates `#length-value`, `#vowel-value`, and error elements |
| Handle loading states | Button disabled during request | `src/app.js` (lines 161, 211–212) | `submitBtn.disabled = true` in submit handler; `submitBtn.disabled = false` in `finally` |
| Handle errors gracefully | Global and per-endpoint errors | `src/app.js` (lines 123–127, 132–149, 191–211) | `showError(msg)` for validation/network; `lengthError` / `vowelError` in `showResults()` for failed API responses |

**Relevant code (concurrent calls and results):**

```javascript
// src/app.js — form submit handler (excerpt)
const [lengthRes, vowelRes] = await Promise.all([
  fetch(apiBase + '/length', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }),
  fetch(apiBase + '/num_vowels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
]);
// ...
showResults({ length: ..., vowel_count: ..., lengthError: ..., vowelError: ... });
```

---

### 1.3 Server-Side Implementation

| Requirement | Implementation | File(s) | Notes |
|-------------|----------------|---------|--------|
| Node.js server | Express app | `server/index.js` | `require('./telemetry')` first; then Express, CORS, JSON, static, routes |
| Two REST endpoints | `/length` and `/num_vowels` | `server/index.js` | `app.post('/length')`, `app.get('/length')`, `app.post('/num_vowels')`, `app.get('/num_vowels')` |
| GET or POST `/length` | Accepts text; returns character length | `server/index.js` (lines 33–62, 64–92) | `getRawText(req)` for body/query; `validateAndSanitizeText(raw)`; `res.json({ length })` |
| GET or POST `/num_vowels` | Accepts text; returns vowel count | `server/index.js` (lines 94–102, 104–165) | `countVowels(text)`; `res.json({ vowel_count })` |
| Text as parameter or body | Unified helper for body and query | `server/index.js` (lines 27–31) | `getRawText(req)` uses `req.body.text` (POST) or `req.query.text` (GET) |
| Response format `/length` | `{ "length": number }` | `server/index.js` (e.g. line 55) | `res.json({ length })` |
| Response format `/num_vowels` | `{ "vowel_count": number }` | `server/index.js` (e.g. line 125) | `res.json({ vowel_count })` |

**Relevant code (text extraction and validation):**

```javascript
// server/index.js
function getRawText(req) {
  if (req.body && typeof req.body.text === 'string') return req.body.text;
  if (typeof req.query.text === 'string') return req.query.text;
  return '';
}
// Each route: getRawText(req) → validateAndSanitizeText(raw) → compute → res.json({ length }) or res.json({ vowel_count })
```

---

## 2. Non-Functional Requirements

| Requirement | Implementation | File(s) | Notes |
|-------------|----------------|---------|--------|
| Submit as Git repository | Repo initialized; `.gitignore` for `node_modules`, logs | `.gitignore` | Standard Node ignore plus e.g. `traces.log` |
| Setup and run instructions in RUNNING.md | Prerequisites, setup, run, optional server-only | `RUNNING.md` | Sections: Prerequisites, Setup (`npm install`), Run (`npm start`), Optional run server only |
| Easy to build and run from clean clone | Two commands | `RUNNING.md`, `package.json` | `npm install` then `npm start` |
| Dependencies in package.json | All server deps listed | `package.json` | express, cors, @opentelemetry/* (api, auto-instrumentations-node, resources, sdk-node, sdk-trace-node) |
| Single command to start client and server | One process serves API + static UI | `package.json` scripts, `server/index.js` | `npm start` → `node server/index.js`; server serves `public/` and `GET /` → index.html |
| No Vanguard libraries | No Vanguard packages | `package.json` | Only express, cors, OpenTelemetry packages |

---

## 3. OpenTelemetry Integration

### 3.1 Server-Side

| Requirement | Implementation | File(s) | Notes |
|-------------|----------------|---------|--------|
| OpenTelemetry loaded first | Required before Express/HTTP | `server/index.js` (line 6) | `require('./telemetry');` at top |
| Auto-instrumentation | Node auto-instrumentations | `server/telemetry.js` (lines 24–27) | `getNodeAutoInstrumentations()` in NodeSDK |
| Instrument HTTP requests/responses | Via auto-instrumentation | `server/telemetry.js` | HTTP instrumentation included in `getNodeAutoInstrumentations()` |
| Trace exporters | File exporter (no console) | `server/telemetry.js` (lines 7–10, 16, 21, 23) | `OTEL_TRACES_EXPORTER=none`; `FileSpanExporter` writing to `traces.log` |
| Spans for each endpoint | Manual spans per route | `server/index.js` | Each of the four handlers: `tracer.startSpan('POST /length')` etc., attributes, `span.end()`; `traceparent` stored when present |

**Relevant code:**

- **`server/telemetry.js`**  
  - Sets `OTEL_TRACES_EXPORTER` to avoid default console exporter.  
  - Creates `NodeSDK` with `getNodeAutoInstrumentations()` and `FileSpanExporter`.  
  - Exporter writes to `traces.log` (path from `OTEL_TRACES_FILE` or default).

- **`server/index.js`**  
  - Each route: `trace.getTracer('text-analysis-server', '1.0.0')`, `startSpan('POST /length')` (or GET, or `/num_vowels`), set attributes (e.g. `text.length`, `trace.parent`), `span.end()`; on error `recordException`, `setStatus`, then `span.end()`.

- **`server/file-span-exporter.js`**  
  - Custom `SpanExporter` that formats and appends spans to a file (name, traceId, spanId, duration, status, attributes, etc.).

### 3.2 Client-Side

| Requirement | Implementation | File(s) | Notes |
|-------------|----------------|---------|--------|
| Instrument fetch/XHR | Auto-instrumentation via OpenTelemetry | `src/telemetry-init.js` | `getWebAutoInstrumentations()`; FetchInstrumentation patches `fetch`, adds `traceparent`, creates spans |
| Trace exporters | ConsoleSpanExporter (spans logged on end) | `src/telemetry-init.js` | `SimpleSpanProcessor(new ConsoleSpanExporter())` |
| Client spans correlate with server | W3C Trace Context propagation | `src/telemetry-init.js` | `W3CTraceContextPropagator`; fetch instrumentation adds `traceparent` header |
| Spans for form submit and API calls | Manual spans in app.js | `src/app.js` (lines 165–167, 172–174, 176–181) | `form_submit`, `fetch_length_api`, `fetch_vowels_api`; started/ended around `Promise.all` |

**Relevant code:**

- **`src/telemetry-init.js`**  
  - Uses `@opentelemetry/sdk-trace-web` and `@opentelemetry/auto-instrumentations-web`.  
  - `WebTracerProvider` with `ZoneContextManager` and `W3CTraceContextPropagator`.  
  - `getWebAutoInstrumentations()` registers Fetch, Document Load, XHR, User Interaction instrumentation.  
  - Exposes `window.otelTracer` for manual spans in app.js.

- **`src/app.js`**  
  - On submit: starts `form_submit` span, then `fetch_length_api` and `fetch_vowels_api`; `Promise.all` for the two fetches; ends spans and parent in `finally`/catch.

---

## 4. Developer's Choice Enhancement

| Requirement | Implementation | File(s) | Notes |
|-------------|----------------|---------|--------|
| Document in RUNNING.md “Developer’s Choice” section | Full section with rationale and value | `RUNNING.md` (lines 40–61) | “Developer's Choice: Input validation and sanitization” |
| Explain why chosen | Rationale paragraph | `RUNNING.md` (lines 44–45) | Safety, UX, predictable behavior, avoid empty/oversized/unsafe input |
| Describe how it adds value | “Value to the application” | `RUNNING.md` (lines 56–60) | Robustness, safety, UX, API contract |
| Implement one enhancement | Input validation and sanitization (server + client) | `server/validation.js`, `server/index.js`, `src/app.js` | See below |

**Server-side validation and sanitization**

- **`server/validation.js`**  
  - `sanitizeText(raw)`: coerce to string, strip control characters.  
  - `validateAndSanitizeText(raw)`: trim, non-empty, max length 100,000; returns `{ ok, text? }` or `{ ok, error }`.  
  - Used by all four routes in `server/index.js`; invalid input → `res.status(400).json({ error: validated.error })`.

- **`server/index.js`**  
  - Every `/length` and `/num_vowels` handler (GET and POST): `getRawText(req)` → `validateAndSanitizeText(raw)`; if `!validated.ok`, set span status/attributes, `span.end()`, return 400 with `{ error }`.

**Client-side validation and sanitization**

- **`src/app.js`**  
  - `sanitizeText(str)`: strip control characters (same regex as server).  
  - `validateInput(raw)`: trim, non-empty, max 100,000; returns `{ ok, text? }` or `{ ok, error }`.  
  - On submit: `validateInput(textInput.value)` first; if `!validated.ok`, `showError(validated.error)` and return without calling the API.

**Testing (RUNNING.md)**

- **`RUNNING.md`** (lines 64–115)  
  - “How to test the changes”: browser tests (empty, whitespace, valid, too long) and curl examples for server (empty POST/GET, valid POST, too long, empty query). Expected status codes and response bodies are described.

---

## 5. Optional / Extra Features (Not Required by Spec)

These are implemented in the app but are not part of the written requirements:

| Feature | Implementation | File(s) |
|---------|----------------|--------|
| Session history (last N results) | In-memory array; last 10; rendered in UI | `src/app.js` (`sessionHistory`, `addToHistory`, `renderHistory`); `index.html` (history card); `public/styles.css` (history styles) |
| Clear button in textbox | Small × button; show when non-empty; clear and focus | `index.html` (input wrap + button); `src/app.js` (toggleClearButton, click handler); `public/styles.css` (`.input-clear`) |
| File trace exporter | Spans written to `traces.log` instead of console | `server/file-span-exporter.js`; `server/telemetry.js` |
| Styled UI (e.g. glassmorphism, red/white theme) | CSS for layout, cards, buttons, history | `public/styles.css` |

---

## 6. Quick Reference — Where to Find What

| Topic | Primary file(s) |
|-------|------------------|
| UI structure | `index.html` |
| Form submit, concurrent calls, validation, results, history | `src/app.js` |
| Client tracing (auto-instrumentation + manual spans) | `src/telemetry-init.js` |
| API routes, getRawText, validation usage, manual spans | `server/index.js` |
| Validation/sanitization logic (server) | `server/validation.js` |
| OpenTelemetry server setup, auto-instrumentation, file exporter | `server/telemetry.js` |
| Trace file export implementation | `server/file-span-exporter.js` |
| Setup/run and Developer’s Choice docs | `RUNNING.md` |
| Dependencies and scripts | `package.json` |

---

*Generated for the Text Analysis App. Use this document to walk through requirements and locate the corresponding code.*
