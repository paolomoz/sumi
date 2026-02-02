FROM python:3.13-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir .
COPY . .
RUN mkdir -p output
EXPOSE 8000
CMD ["sh", "-c", "uvicorn sumi.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
