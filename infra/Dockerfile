FROM python:3.11-slim
WORKDIR /srv
ENV PYTHONUNBUFFERED=1
COPY pyproject.toml README.md ./
COPY app ./app
RUN pip install --no-cache-dir -e ".[observability]"
EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
