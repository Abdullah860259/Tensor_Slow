// STUB for Agent F (manifest item 46)
// Signature freeze — will be replaced with full implementation by Agent F

export async function runEvals(): Promise<void> {
  throw new Error("not implemented");
}

if (process.env.NODE_ENV !== "test" && typeof window === "undefined" && require.main === module) {
  runEvals().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
