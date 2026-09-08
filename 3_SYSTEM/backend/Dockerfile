FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml README.md ./
COPY aunea_backend ./aunea_backend
COPY data ./data
RUN pip install --no-cache-dir .
ENV AUNEA_DB_PATH=/data/aunea_runtime.db
VOLUME ["/data"]
EXPOSE 8000
CMD ["uvicorn","aunea_backend.main:app","--host","0.0.0.0","--port","8000"]
