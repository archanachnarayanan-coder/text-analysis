# Setup and run instructions

## Prerequisites

- **Node.js** 18+ and **npm**

## Setup

From the project root (`text-analysis-app`):

```bash
npm install
```

## Run

Start both the API server and the web UI with a single command:

```bash
npm start
```

This builds the frontend (Vite) and starts the server. Then open **http://localhost:3000** in your browser.

- The server serves the API endpoints (`POST/GET /length`, `POST/GET /num_vowels`) and the static web UI.
- Enter text in the form and click **Submit** to see character length and vowel count from two concurrent API calls.
- OpenTelemetry is enabled; traces are written to **`traces.log`** in the project root for easy viewing. Set `OTEL_TRACES_FILE` to use a different path.

## Optional: run server only

```bash
npm run start:server
```

The API will be available at http://localhost:3000 (builds frontend and serves from `dist/`).

---

## Developer's Choice: Input validation and sanitization

**Chosen enhancement:** Input validation and sanitization on both server and client.

**Rationale:** The API accepts free-form text. Without validation, the app could accept empty input, oversized payloads, or non-string types, leading to confusing responses or abuse. Sanitization (e.g. stripping control characters) avoids passing unsafe or non-printable bytes into processing and keeps behavior predictable. Doing this on both client and server improves UX (immediate feedback) and security (server cannot trust the client).

**What was implemented:**

- **Server (`server/validation.js`):**
  - **Sanitization:** Input is coerced to a string; control characters (e.g. null bytes, other non-printable) are stripped.
  - **Validation:** Text must be non-empty after trimming; length is capped at 100,000 characters.
  - All four endpoints (`GET/POST /length`, `GET/POST /num_vowels`) use the same helper. Invalid input returns `400` with a clear `error` message in the JSON body (e.g. "Text is required and cannot be empty after trimming." or "Text must be at most 100,000 characters...").

- **Client (`src/app.js`):**
  - Same rules: trim, non-empty, max 100,000 characters. Control characters are stripped before sending.
  - Validation runs on submit; if invalid, the error message from `validateInput()` is shown in the UI and no API calls are made.

**Value to the application:**

- **Robustness:** Empty or invalid input is rejected with consistent, clear messages instead of odd results (e.g. length 0 with no explanation).
- **Safety:** Bounded length and type handling reduce risk of oversized or malformed payloads; stripping control characters avoids non-printable data in processing.
- **UX:** Users see immediate, specific feedback (e.g. "Text must be at most 100,000 characters") without waiting for the server.
- **API contract:** Callers (browser or other clients) get predictable 400 responses and error messages when input is invalid.

---

## How to test the changes

### 1. Start the server

```bash
npm start
```

Open **http://localhost:3000** in your browser.

### 2. Test in the browser (client-side validation)

| Test | Steps | Expected result |
|------|--------|------------------|
| **Empty** | Leave the text box empty and click **Submit** | Red error: "Please enter some text." No API calls. |
| **Whitespace only** | Type only spaces/tabs and click **Submit** | Same error: "Please enter some text." |
| **Valid** | Type e.g. `Hello world` and click **Submit** | Character length and vowel count shown. |
| **Too long** | Paste or type more than 100,000 characters and click **Submit** | Error: "Text must be at most 100,000 characters (you entered …)." No API calls. |

### 3. Test the API directly (server-side validation)

Use a terminal (PowerShell, Command Prompt, or Git Bash). Replace `http://localhost:3000` if your server runs elsewhere.

**Empty / missing text (POST):**

```bash
curl -X POST http://localhost:3000/length -H "Content-Type: application/json" -d "{\"text\":\"\"}"
```

Expected: HTTP **400**, body like `{"error":"Text is required and cannot be empty after trimming."}`

**Valid text (POST):**

```bash
curl -X POST http://localhost:3000/length -H "Content-Type: application/json" -d "{\"text\":\"hello\"}"
```

Expected: HTTP **200**, body `{"length":5}`

**Too long (POST):**  
Send a string longer than 100,000 characters (e.g. generate in a script). Expected: HTTP **400** with an error message about max length.

**GET with empty query:**

```bash
curl "http://localhost:3000/length?text="
```

Expected: HTTP **400** with the same "Text is required..." error.

If all of the above behave as in the table and examples, the validation and sanitization changes are working as intended.
