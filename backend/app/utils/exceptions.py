class AppException(Exception):
    """Base application exception."""


class UserAlreadyExistsError(AppException):
    def __init__(self, email: str) -> None:
        self.email = email
        super().__init__(f"User with email '{email}' already exists")


class InvalidCredentialsError(AppException):
    def __init__(self) -> None:
        super().__init__("Invalid email or password")


class InvalidTokenError(AppException):
    def __init__(self, message: str = "Invalid or expired token") -> None:
        super().__init__(message)


class InactiveUserError(AppException):
    def __init__(self) -> None:
        super().__init__("User account is inactive")


class PermissionDeniedError(AppException):
    def __init__(self, message: str = "You do not have permission to perform this action") -> None:
        super().__init__(message)


class ProjectNotFoundError(AppException):
    def __init__(self, project_id: object) -> None:
        self.project_id = project_id
        super().__init__(f"Project '{project_id}' not found")


class PaperNotFoundError(AppException):
    def __init__(self, paper_id: object) -> None:
        self.paper_id = paper_id
        super().__init__(f"Paper '{paper_id}' not found")


class PaperNotParsedError(AppException):
    def __init__(self, paper_id: object) -> None:
        self.paper_id = paper_id
        super().__init__(f"Paper '{paper_id}' has not finished parsing yet; cannot extract knowledge from it")


class KnowledgeExtractionNotFoundError(AppException):
    def __init__(self, identifier: object) -> None:
        self.identifier = identifier
        super().__init__(f"Knowledge extraction '{identifier}' not found")


class KnowledgeExtractionNotCompletedError(AppException):
    def __init__(self, extraction_id: object) -> None:
        self.extraction_id = extraction_id
        super().__init__(f"Knowledge extraction '{extraction_id}' has not completed yet")


class GeneratedProjectNotFoundError(AppException):
    def __init__(self, identifier: object) -> None:
        self.identifier = identifier
        super().__init__(f"Generated project '{identifier}' not found")


class GeneratedProjectNotReadyError(AppException):
    def __init__(self, generated_project_id: object) -> None:
        self.generated_project_id = generated_project_id
        super().__init__(f"Generated project '{generated_project_id}' is not ready for download yet")


class ExecutionRunNotFoundError(AppException):
    def __init__(self, identifier: object) -> None:
        self.identifier = identifier
        super().__init__(f"Execution run '{identifier}' not found")


class ExecutionRunNotCancellableError(AppException):
    def __init__(self, execution_run_id: object) -> None:
        self.execution_run_id = execution_run_id
        super().__init__(f"Execution run '{execution_run_id}' is not in a cancellable state")


class FileAssetNotFoundError(AppException):
    def __init__(self, file_asset_id: object) -> None:
        self.file_asset_id = file_asset_id
        super().__init__(f"File '{file_asset_id}' not found")


class InvalidFileTypeError(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(message)


class FileTooLargeError(AppException):
    def __init__(self, max_size_mb: int) -> None:
        super().__init__(f"File exceeds the maximum allowed size of {max_size_mb}MB")
