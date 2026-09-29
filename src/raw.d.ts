// Vite and Vitest load a file as text with ?raw (styles.test.ts reads the README).
declare module "*?raw" {
  const text: string;
  export default text;
}
