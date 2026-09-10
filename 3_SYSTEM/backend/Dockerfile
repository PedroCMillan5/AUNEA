# [AUNEA-BUILD-BACKEND-DOCKER-010] START — Backend container image
# PURPOSE: Package aunea_backend + data into a runnable container serving the API via uvicorn.
# CHANGE_RISK: LOW.
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
# [AUNEA-BUILD-BACKEND-DOCKER-010] END
