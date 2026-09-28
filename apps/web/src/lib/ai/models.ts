// STUB for Agent C (manifest item 29)
// The single model registry — sole owner: Agent C
import type { LanguageModel, EmbeddingModel } from "ai";

export const chatModel: LanguageModel = {
  specificationVersion: "v1",
  provider: "stub",
  modelId: "stub-chat",
  doGenerate: () => {
    throw new Error("not implemented");
  },
  doStream: () => {
    throw new Error("not implemented");
  },
} as unknown as LanguageModel;

export const fastModel: LanguageModel = {
  specificationVersion: "v1",
  provider: "stub",
  modelId: "stub-fast",
  doGenerate: () => {
    throw new Error("not implemented");
  },
  doStream: () => {
    throw new Error("not implemented");
  },
} as unknown as LanguageModel;

export const embeddingModel: EmbeddingModel = {
  specificationVersion: "v1",
  provider: "stub",
  modelId: "stub-embed",
  maxEmbeddingsPerCall: 100,
  supportsParallelCalls: true,
  doEmbed: () => {
    throw new Error("not implemented");
  },
} as unknown as EmbeddingModel;

export function getModelWithQuotaFallback(): LanguageModel {
  throw new Error("not implemented");
}
