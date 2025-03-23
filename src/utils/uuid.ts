/**
 * UUID utility functions
 * Using CommonJS require to avoid ESM import issues with Next.js
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const uuid = require('uuid');

// Export named functions
export const uuidv4 = uuid.v4;
export const v4 = uuid.v4; // Alias for compatibility
export const uuidv1 = uuid.v1;
export const uuidv3 = uuid.v3;
export const uuidv5 = uuid.v5;

// Default export
export default uuid; 