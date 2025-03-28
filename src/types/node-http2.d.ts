// This file provides simplified type definitions for Node.js HTTP2
// to work around compatibility issues with TypeScript 3.4.5

declare module 'http2' {
  // Simplified declarations
  interface Http2ServerRequest {}
  interface Http2ServerResponse {}
  
  // Export empty namespace to prevent errors
  namespace constants {}
  
  // Export default empty object
  const http2: any;
  export default http2;
}
