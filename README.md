# Text Analysis App

Full-stack app that demonstrates:

- **Web UI**: Single text input, submit button, instructions, and display areas for two API results.
- **Client**: On submit, two concurrent async calls to the server (`/length` and `/num_vowels`); loading and error handling.
- **Server**: Node.js with two REST endpoints:
  - `GET` or `POST` `/length` — accepts text (query or body), returns `{"length": number}`.
  - `GET` or `POST` `/num_vowels` — accepts text (query or body), returns `{"vowel_count": number}` (a, e, i, o, u, case insensitive).
- **OpenTelemetry**: Server-side auto-instrumentation with console trace exporter; spans for each endpoint.

See **RUNNING.md** for setup and run instructions.
