/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

// Declare JSX namespace globally if React types aren't available
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
