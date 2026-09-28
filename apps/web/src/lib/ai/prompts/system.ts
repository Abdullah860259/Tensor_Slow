// STUB for Agent C (manifest item 30)
import { SYSTEM_PROMPT_VERSION } from "@/lib/contracts";

export const PROMPT_VERSION = SYSTEM_PROMPT_VERSION;

export const SYSTEM_PROMPT = `You are an AI assistant for the AICON Hackathon starter application.
Answer user questions helpfully, concisely, and cite retrieved items when available.
Version: ${PROMPT_VERSION}`;

export const EXTRACTION_PROMPT = `Extract a concise 1-2 sentence summary and 3-5 descriptive lowercase tags from the provided content.
Version: ${PROMPT_VERSION}`;
