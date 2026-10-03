// Stands in for the server-only package under Vitest. The real package throws
// on import outside a React Server environment, which is exactly its job in
// the app and exactly wrong in a unit test.
export {};
