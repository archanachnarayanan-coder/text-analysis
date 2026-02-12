/**
 * Application entry point.
 * Load telemetry first (must run before any fetch calls), then the app.
 */
import './telemetry-init.js';
import './app.js';
