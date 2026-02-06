/**
 * Input validation and sanitization for text analysis API.
 * Ensures input is safe, bounded, and suitable for processing.
 */

const MAX_TEXT_LENGTH = 100000; // 100k chars to prevent abuse / memory issues
const MIN_TEXT_LENGTH = 1;

/**
 * Sanitize raw input: ensure it's a string and strip control characters.
 * @param {*} raw - Raw value from request (body.text or query.text)
 * @returns {string} Sanitized string (may be empty)
 */
function sanitizeText(raw) {
  if (raw == null) return '';
  if (typeof raw !== 'string') return '';
  // Strip control characters (e.g. null bytes, other non-printable)
  return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validate and sanitize text input for /length and /num_vowels.
 * @param {*} raw - Raw value from request
 * @returns {{ ok: boolean, text?: string, error?: string }}
 */
function validateAndSanitizeText(raw) {
  const sanitized = sanitizeText(raw).trim();
  if (sanitized.length < MIN_TEXT_LENGTH) {
    return { ok: false, error: 'Text is required and cannot be empty after trimming.' };
  }
  if (sanitized.length > MAX_TEXT_LENGTH) {
    return {
      ok: false,
      error: `Text must be at most ${MAX_TEXT_LENGTH.toLocaleString()} characters (got ${sanitized.length.toLocaleString()}).`,
    };
  }
  return { ok: true, text: sanitized };
}

module.exports = {
  validateAndSanitizeText,
  sanitizeText,
  MAX_TEXT_LENGTH,
  MIN_TEXT_LENGTH,
};
