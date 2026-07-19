import os
from functools import lru_cache

from mlflow import MlflowClient

from app.config.settings import settings

# The MLflow client library reads S3 endpoint/credentials from the process
# environment (boto3 conventions), not from an explicit constructor argument -
# set them once at import time so every MlflowClient call that touches
# artifacts (stored in MinIO) resolves correctly.
if settings.MLFLOW_S3_ENDPOINT_URL:
    os.environ.setdefault("MLFLOW_S3_ENDPOINT_URL", settings.MLFLOW_S3_ENDPOINT_URL)
os.environ.setdefault("AWS_ACCESS_KEY_ID", settings.MINIO_ACCESS_KEY)
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", settings.MINIO_SECRET_KEY)


@lru_cache
def get_mlflow_client() -> MlflowClient:
    return MlflowClient(tracking_uri=settings.MLFLOW_TRACKING_URI)
