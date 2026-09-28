// STUB for Agent C (manifest item 31)
import { EMBEDDING_DIMENSIONS } from "@/lib/contracts";

export { EMBEDDING_DIMENSIONS };

export async function embedText(text: string): Promise<number[]> {
  throw new Error("not implemented");
}

export async function embedManyTexts(texts: string[]): Promise<number[][]> {
  throw new Error("not implemented");
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: vector a has ${a.length} and vector b has ${b.length}`);
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const valA = a[i]!;
    const valB = b[i]!;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
