// STUB for Agent C (manifest item 33)

export interface RagResultItem {
  id: string;
  title: string;
  content: string;
  score: number;
}

export async function retrieveContext(
  query: string,
  ownerId: string,
  limit: number = 5
): Promise<RagResultItem[]> {
  throw new Error("not implemented");
}

export async function keywordSearchFallback(
  query: string,
  ownerId: string,
  limit: number = 5
): Promise<RagResultItem[]> {
  throw new Error("not implemented");
}
