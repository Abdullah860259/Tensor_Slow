// STUB for Agent A (manifest item 27)
// Signature freeze — replaced by Agent A with full implementation
import { EMBEDDING_DIMENSIONS } from "@/lib/contracts";

export async function createIndexes(): Promise<void> {
  // Stub body throws until Agent A implements
  throw new Error("not implemented");
}

if (process.env.NODE_ENV !== "test" && typeof window === "undefined" && require.main === module) {
  createIndexes().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
