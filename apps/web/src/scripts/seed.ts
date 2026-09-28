// STUB for Agent A (manifest item 28)
// Signature freeze — replaced by Agent A with full implementation

export async function seed(): Promise<void> {
  throw new Error("not implemented");
}

if (process.env.NODE_ENV !== "test" && typeof window === "undefined" && require.main === module) {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
