import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class FileCategory(str, enum.Enum):
    PDF = "pdf"
    IMAGE = "image"


class FileAsset(BaseModel):
    """Logical file identity. Each upload against it creates a new immutable FileVersion."""

    __tablename__ = "file_assets"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[FileCategory] = mapped_column(
        Enum(FileCategory, name="file_category", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    latest_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    versions: Mapped[list["FileVersion"]] = relationship(
        "FileVersion",
        back_populates="file_asset",
        cascade="all, delete-orphan",
        order_by="FileVersion.version",
    )


class FileVersion(BaseModel):
    """Immutable pointer to one uploaded object in MinIO."""

    __tablename__ = "file_versions"
    __table_args__ = (
        UniqueConstraint("file_asset_id", "version", name="uq_file_versions_asset_version"),
    )

    file_asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("file_assets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)

    file_asset: Mapped["FileAsset"] = relationship("FileAsset", back_populates="versions")
