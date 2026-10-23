'use client';

/**
 * Landing-page entry points into the editor. The editor code (compositor, export worker, capture client)
 * loads on first use, so phones that only read the landing page never download or parse it.
 */
export const editorActions = () => import('./actions');
