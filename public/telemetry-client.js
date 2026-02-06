/**
 * OpenTelemetry client-side instrumentation
 * This file will be bundled or loaded via script tag
 * For now, using manual instrumentation with fetch API
 */

(function() {
  'use strict';

  // Simple OpenTelemetry-like tracer for browser
  // In production, you'd use @opentelemetry/sdk-web
  class SimpleTracer {
    constructor(name, version) {
      this.name = name;
      this.version = version;
    }

    startSpan(name, options = {}) {
      const span = {
        name: name,
        startTime: performance.now(),
        attributes: {},
        status: { code: 1 }, // OK
        events: [],
      };

      span.setAttribute = (key, value) => {
        span.attributes[key] = value;
        return span;
      };

      span.setStatus = (status) => {
        span.status = status;
        return span;
      };

      span.recordException = (exception) => {
        span.events.push({
          name: 'exception',
          time: performance.now(),
          attributes: {
            'exception.type': exception.name || 'Error',
            'exception.message': exception.message || String(exception),
          },
        });
        span.status = { code: 2 }; // ERROR
        return span;
      };

      span.end = () => {
        span.endTime = performance.now();
        span.duration = span.endTime - span.startTime;
        
        // Export span to console (console exporter)
        console.log('[OpenTelemetry Client Span]', {
          name: span.name,
          duration: `${span.duration.toFixed(2)}ms`,
          status: span.status.code === 1 ? 'OK' : 'ERROR',
          attributes: span.attributes,
          events: span.events,
        });
        
        return span;
      };

      return span;
    }
  }

  // Create tracer instance
  const tracer = new SimpleTracer('text-analysis-client', '1.0.0');

  // Trace context propagation helpers
  const traceContext = {
    generateTraceId: () => {
      return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    },
    generateSpanId: () => {
      return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    },
    getCurrentTraceId: () => {
      return sessionStorage.getItem('otel_trace_id') || traceContext.generateTraceId();
    },
    setCurrentTraceId: (traceId) => {
      sessionStorage.setItem('otel_trace_id', traceId);
    },
  };

  // Instrument fetch to add trace context headers
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    const span = tracer.startSpan(`fetch ${options.method || 'GET'} ${url}`);
    
    // Get or create trace ID
    let traceId = traceContext.getCurrentTraceId();
    if (!traceId) {
      traceId = traceContext.generateTraceId();
      traceContext.setCurrentTraceId(traceId);
    }
    const spanId = traceContext.generateSpanId();

    // Add trace context headers (W3C Trace Context format)
    const headers = new Headers(options.headers || {});
    headers.set('traceparent', `00-${traceId}-${spanId}-01`);
    
    span.setAttribute('http.method', options.method || 'GET');
    span.setAttribute('http.url', url);
    span.setAttribute('trace_id', traceId);
    span.setAttribute('span_id', spanId);

    options.headers = headers;

    return originalFetch(url, options)
      .then((response) => {
        span.setAttribute('http.status_code', response.status);
        span.setAttribute('http.status_text', response.statusText);
        
        if (response.ok) {
          span.setStatus({ code: 1 }); // OK
        } else {
          span.setStatus({ code: 2 }); // ERROR
        }
        
        span.end();
        return response;
      })
      .catch((error) => {
        span.recordException(error);
        span.setStatus({ code: 2 }); // ERROR
        span.end();
        throw error;
      });
  };

  // Export for manual use
  window.otelTracer = tracer;
  window.otelTraceContext = traceContext;

  console.log('OpenTelemetry client instrumentation initialized');
})();
