/**
 * OpenTelemetry SpanExporter that writes traces to a text file.
 * Spans are appended in a readable format for easy viewing.
 */
const fs = require('fs');
const path = require('path');
const { ExportResultCode } = require('@opentelemetry/core');

const TRACES_FILE = process.env.OTEL_TRACES_FILE || path.join(__dirname, '..', 'traces.log');

const SPAN_KIND_NAMES = {
  0: 'INTERNAL',
  1: 'SERVER',
  2: 'CLIENT',
  3: 'PRODUCER',
  4: 'CONSUMER',
};

function hrTimeToMicroseconds(hrTime) {
  if (!hrTime || !Array.isArray(hrTime) || hrTime.length < 2) return null;
  return Math.floor(hrTime[0] * 1e6 + hrTime[1] / 1e3);
}

function formatReadableSpan(span) {
  const ctx = typeof span.spanContext === 'function' ? span.spanContext() : {};
  const name = span.name || 'unknown';
  const traceId = ctx.traceId || '—';
  const spanId = ctx.spanId || '—';
  const parentId = span.parentSpanId ?? '—';
  const kind = span.kind != null ? span.kind : null;
  const kindLabel = kind != null ? SPAN_KIND_NAMES[kind] || `kind_${kind}` : '—';
  const timestampUs = hrTimeToMicroseconds(span.startTime);
  const durationUs = hrTimeToMicroseconds(span.duration);
  const durationMs = span.duration != null && Array.isArray(span.duration)
    ? (span.duration[0] * 1e9 + span.duration[1]) / 1e6
    : null;
  const statusCode = span.status?.code;
  const statusStr = statusCode === 0 ? 'OK' : statusCode === 2 ? 'ERROR' : 'UNSET';
  const statusMsg = span.status?.message || '';

  const lines = [];
  lines.push('---');
  lines.push(`name: ${name}`);
  lines.push(`traceId: ${traceId}`);
  lines.push(`parentId: ${parentId}`);
  lines.push(`id: ${spanId}`);
  lines.push(`kind: ${kind != null ? kind : '—'} (${kindLabel})`);
  lines.push(`timestamp: ${timestampUs != null ? timestampUs : '—'}`);
  lines.push(`duration: ${durationUs != null ? durationUs : '—'} (${durationMs != null ? durationMs.toFixed(2) : '—'} ms)`);
  lines.push(`status: { code: ${statusCode != null ? statusCode : '—'}, message: ${statusMsg ? `'${statusMsg}'` : 'undefined'}}`);

  const attrs = span.attributes || {};
  if (Object.keys(attrs).length > 0) {
    lines.push('attributes: {');
    for (const [k, v] of Object.entries(attrs)) {
      const val = typeof v === 'object' && v !== null ? JSON.stringify(v) : (typeof v === 'string' ? `'${v}'` : String(v));
      lines.push(`  ${k}: ${val},`);
    }
    lines.push('}');
  }
  if (span.events?.length) {
    lines.push('events: [');
    for (const ev of span.events) {
      const msg = ev.attributes?.['exception.message'] || ev.attributes?.['exception.type'] || JSON.stringify(ev.attributes || {});
      lines.push(`  { name: '${ev.name}', attributes: ${msg} },`);
    }
    lines.push(']');
  }
  lines.push('');
  return lines.join('\n');
}

class FileSpanExporter {
  constructor(filePath = TRACES_FILE) {
    this.filePath = filePath;
    this._writeStream = null;
  }

  _getStream() {
    if (!this._writeStream) {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this._writeStream = fs.createWriteStream(this.filePath, { flags: 'a' });
      const header = `\n========== OpenTelemetry traces (${new Date().toISOString()}) ==========\n\n`;
      this._writeStream.write(header);
    }
    return this._writeStream;
  }

  export(spans, resultCallback) {
    if (!spans || spans.length === 0) {
      resultCallback({ code: ExportResultCode.SUCCESS });
      return;
    }
    try {
      const stream = this._getStream();
      for (const span of spans) {
        const text = formatReadableSpan(span);
        stream.write(text);
      }
      stream.write('\n');
      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (err) {
      console.error('[FileSpanExporter] export error:', err);
      resultCallback({ code: ExportResultCode.FAILURE });
    }
  }

  shutdown() {
    if (this._writeStream) {
      this._writeStream.end();
      this._writeStream = null;
    }
  }
}

module.exports = { FileSpanExporter, TRACES_FILE };
