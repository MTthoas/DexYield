// Polyfills pour les APIs Node.js dans le navigateur
// Permet de résoudre les problèmes de compatibilité avec les librairies qui utilisent des APIs Node.js comme Buffer et process
import { Buffer } from 'buffer';

// Étendre les types Window
declare global {
  interface Window {
    global: typeof globalThis;
    Buffer: typeof Buffer;
    process: any;
  }
}

// Configurer les globals
(window as any).global = window.global ?? window;
(window as any).Buffer = window.Buffer ?? Buffer;

// Configurer process
(window as any).process = window.process ?? {
  env: { DEBUG: undefined },
  version: '',
  nextTick: (fn: () => void) => setTimeout(fn, 0),
};
