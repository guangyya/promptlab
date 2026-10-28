import { localRequest, createBrowserSession } from './browser-engine.mjs';
export const IS_NATIVE = import.meta.env.VITE_PREVIEW_ENGINE === 'native';
let engine = { request: localRequest, createSession: createBrowserSession };
// Direct compile-time condition lets Vite remove the optional transport module.
if (import.meta.env.VITE_PREVIEW_ENGINE === 'native') engine = await import('./native-client.mjs');
export const request = engine.request;
export const createSession = engine.createSession;
