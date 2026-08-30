declare module 'exifr/dist/lite.esm.mjs' {
  const exifr: { parse(input: ArrayBuffer | Uint8Array, options?: Record<string, unknown>): Promise<Record<string, any> | undefined> };
  export default exifr;
}
