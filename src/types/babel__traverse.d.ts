// This file overrides the @types/babel__traverse definitions
declare module '@babel/traverse' {
  export interface Visitor {
    [key: string]: any;
  }
  
  export default function traverse(ast: any, visitor: Visitor): void;
}

declare module '@babel/types' {
  export interface Node {
    type: string;
    [key: string]: any;
  }
  
  export interface Aliases {
    [key: string]: any;
  }
}
