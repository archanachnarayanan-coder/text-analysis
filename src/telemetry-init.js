/**
 * OpenTelemetry client-side auto-instrumentation.
 * Uses @opentelemetry/sdk-trace-web and @opentelemetry/auto-instrumentations-web
 * to automatically trace fetch calls and propagate trace context to the server.
 */
import {
  WebTracerProvider,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { trace } from '@opentelemetry/api';

const provider = new WebTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
});

provider.register({
  contextManager: new ZoneContextManager(),
  propagator: new W3CTraceContextPropagator(),
});

registerInstrumentations({
  instrumentations: [getWebAutoInstrumentations()],
});

// Expose tracer for manual spans in app.js (form_submit, fetch_length_api, fetch_vowels_api)
window.otelTracer = trace.getTracer('text-analysis-client', '1.0.0');

console.log('OpenTelemetry client auto-instrumentation initialized');
