/**
 * Main application JavaScript
 * Handles form submission, API calls, and UI updates.
 * Includes client-side validation and sanitization (matches server limits).
 */

const form = document.getElementById('form');
const textInput = document.getElementById('text-input');
const inputClearBtn = document.getElementById('input-clear');
const submitBtn = document.getElementById('submit-btn');
const errorArea = document.getElementById('error-area');
const errorMessage = document.getElementById('error-message');
const resultsArea = document.getElementById('results-area');
const lengthValue = document.getElementById('length-value');
const lengthError = document.getElementById('length-error');
const vowelValue = document.getElementById('vowel-value');
const vowelError = document.getElementById('vowel-error');

const apiBase = '';

// Must match server validation (server/validation.js)
const MAX_TEXT_LENGTH = 100000;

// In-memory session history (last N results; cleared on refresh)
const MAX_HISTORY = 10;
const sessionHistory = [];

/** Strip control characters before sending to API */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/** Validate input; returns { ok: boolean, text?: string, error?: string } */
function validateInput(raw) {
  const sanitized = sanitizeText(raw).trim();
  if (sanitized.length === 0) {
    return { ok: false, error: 'Please enter some text.' };
  }
  if (sanitized.length > MAX_TEXT_LENGTH) {
    return {
      ok: false,
      error: `Text must be at most ${MAX_TEXT_LENGTH.toLocaleString()} characters (you entered ${sanitized.length.toLocaleString()}).`,
    };
  }
  return { ok: true, text: sanitized };
}

// Toggle clear button visibility based on input value
function toggleClearButton() {
  if (textInput.value.trim().length > 0) {
    inputClearBtn.classList.remove('hidden');
  } else {
    inputClearBtn.classList.add('hidden');
  }
}

// Focus the text input when page loads
window.addEventListener('DOMContentLoaded', () => {
  textInput.focus();
  toggleClearButton();
  renderHistory();
});

textInput.addEventListener('input', toggleClearButton);
textInput.addEventListener('paste', () => setTimeout(toggleClearButton, 0));

inputClearBtn.addEventListener('click', () => {
  textInput.value = '';
  textInput.focus();
  toggleClearButton();
});

/** Add a successful result to session history (newest first). */
function addToHistory(text, length, vowel_count) {
  sessionHistory.unshift({ text, length, vowel_count });
  if (sessionHistory.length > MAX_HISTORY) {
    sessionHistory.pop();
  }
  renderHistory();
}

/** Truncate text for display (e.g. 50 chars + "…"). */
function truncateForDisplay(str, maxLen = 50) {
  if (typeof str !== 'string') return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

/** Escape HTML for safe display. */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Render the history list in the DOM. */
function renderHistory() {
  const listEl = document.getElementById('history-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (sessionHistory.length === 0) {
    const li = document.createElement('li');
    li.className = 'history-item history-item--empty';
    li.textContent = 'No analyses yet. Submit some text above.';
    listEl.appendChild(li);
    return;
  }
  sessionHistory.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    const textDisplay = escapeHtml(truncateForDisplay(entry.text));
    const textTitle = escapeHtml(entry.text);
    li.innerHTML = `
      <span class="history-item-text" title="${textTitle}">${textDisplay}</span>
      <span class="history-item-stats">length: <strong>${entry.length}</strong>, vowels: <strong>${entry.vowel_count}</strong></span>
    `;
    listEl.appendChild(li);
  });
}

function showError(msg) {
  errorArea.classList.remove('hidden');
  errorMessage.textContent = msg;
  resultsArea.classList.add('hidden');
}

function showResults(data) {
  errorArea.classList.add('hidden');
  resultsArea.classList.remove('hidden');
  if (data.lengthError) {
    lengthValue.classList.add('hidden');
    lengthError.classList.remove('hidden');
    lengthError.textContent = data.lengthError;
  } else {
    lengthError.classList.add('hidden');
    lengthValue.classList.remove('hidden');
    lengthValue.textContent = data.length != null ? String(data.length) : '—';
  }
  if (data.vowelError) {
    vowelValue.classList.add('hidden');
    vowelError.classList.remove('hidden');
    vowelError.textContent = data.vowelError;
  } else {
    vowelError.classList.add('hidden');
    vowelValue.classList.remove('hidden');
    vowelValue.textContent = data.vowel_count != null ? String(data.vowel_count) : '—';
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const validated = validateInput(textInput.value || '');
  if (!validated.ok) {
    showError(validated.error);
    return;
  }
  const text = validated.text;

  submitBtn.disabled = true;
  errorArea.classList.add('hidden');
  resultsArea.classList.add('hidden');

  // Create parent span for the form submission
  const parentSpan = window.otelTracer ? window.otelTracer.startSpan('form_submit') : null;
  if (parentSpan) {
    parentSpan.setAttribute('user_input_length', text.length);
  }

  try {
    // Create spans for concurrent API calls
    const lengthSpan = window.otelTracer ? window.otelTracer.startSpan('fetch_length_api') : null;
    const vowelSpan = window.otelTracer ? window.otelTracer.startSpan('fetch_vowels_api') : null;

    const [lengthRes, vowelRes] = await Promise.all([
      fetch(apiBase + '/length', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
        .finally(() => { if (lengthSpan) lengthSpan.end(); }),
      fetch(apiBase + '/num_vowels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
        .finally(() => { if (vowelSpan) vowelSpan.end(); })
    ]);

    const lengthOk = lengthRes.ok;
    const vowelOk = vowelRes.ok;
    const lengthData = lengthOk ? await lengthRes.json() : null;
    const vowelData = vowelOk ? await vowelRes.json() : null;

    showResults({
      length: lengthOk ? lengthData.length : null,
      vowel_count: vowelOk ? vowelData.vowel_count : null,
      lengthError: lengthOk ? undefined : (lengthData?.error || 'Request failed'),
      vowelError: vowelOk ? undefined : (vowelData?.error || 'Request failed')
    });

    if (lengthOk && vowelOk) {
      addToHistory(text, lengthData.length, vowelData.vowel_count);
    }

    if (parentSpan) {
      parentSpan.setAttribute('result_length', lengthOk ? lengthData.length : 'error');
      parentSpan.setAttribute('result_vowels', vowelOk ? vowelData.vowel_count : 'error');
      parentSpan.setStatus({ code: (lengthOk && vowelOk) ? 1 : 2 });
    }
  } catch (err) {
    if (parentSpan) {
      parentSpan.recordException(err);
      parentSpan.setStatus({ code: 2 }); // ERROR
    }
    showError(err?.message || 'Something went wrong. Please try again.');
  } finally {
    if (parentSpan) parentSpan.end();
    submitBtn.disabled = false;
  }
});
