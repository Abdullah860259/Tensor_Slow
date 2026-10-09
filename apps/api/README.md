# AICON Hackathon — Optional Python/FastAPI Sidecar

This service is an **optional sidecar** for heavy Python AI/ML workloads (e.g. PyTorch, OCR, Docling, local transformers).
The main application (`apps/web`) is self-contained and **never** hard-depends on this service.
