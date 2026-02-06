/**
 * OpenTelemetry setup for the Node.js server.
 * Must be required before any other modules that use HTTP.
 * Traces are exported to a text file (traces.log) for easy viewing.
 */

// Prevent any env-based default from adding a console exporter
if (process.env.OTEL_TRACES_EXPORTER === undefined || process.env.OTEL_TRACES_EXPORTER === 'console') {
  process.env.OTEL_TRACES_EXPORTER = 'none';
}

const path = require('path');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { FileSpanExporter, TRACES_FILE } = require('./file-span-exporter');

const resource = new Resource({
  'service.name': 'text-analysis-server',
});

const traceExporter = new FileSpanExporter(process.env.OTEL_TRACES_FILE || TRACES_FILE);

const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

module.exports = { sdk };
