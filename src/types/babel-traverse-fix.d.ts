// This is a simplified declaration file to replace the problematic @types/babel__traverse
declare module '@babel/traverse' {
  // Simplified interfaces that avoid the advanced TypeScript features
  export interface Visitor {
    [key: string]: any;
  }

  export default function traverse(ast: any, visitor: Visitor): void;
}
