/** Satrdan deterministik UUID ko'rinishidagi ID (FNV-1a asosida). Faqat demo maʼlumotlar uchun. */
export function demoId(seed: string): string {
  let hex = "";
  for (let round = 0; hex.length < 32; round++) {
    let hash = 0x811c9dc5 ^ round;
    for (const char of seed) {
      hash ^= char.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    hex += hash.toString(16).padStart(8, "0");
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Deterministik psevdo-tasodifiy son [0, 1) — demo koordinatalar uchun */
export function seededRandom(seed: string): () => number {
  let state = Number.parseInt(demoId(seed).slice(0, 8), 16) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
