FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

RUN pip install --no-cache-dir uv

COPY pyproject.toml README.md ./
RUN uv pip install --system --no-cache fastapi uvicorn pydantic

COPY src/ ./src/

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "aicon_hackathon.main:app", "--host", "0.0.0.0", "--port", "8000"]
