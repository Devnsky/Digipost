export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Sumber daya tidak ditemukan.", code = "NOT_FOUND") {
    super(message, 404, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Akses ditolak.", code = "FORBIDDEN") {
    super(message, 403, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Autentikasi diperlukan.", code = "UNAUTHORIZED") {
    super(message, 401, code);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Permintaan tidak valid.", code = "BAD_REQUEST") {
    super(message, 400, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Terjadi konflik data.", code = "CONFLICT") {
    super(message, 409, code);
  }
}

export class VersionConflictError extends ConflictError {
  constructor(
    message = "Dokumen telah dimodifikasi oleh aksi lain.",
    code = "VERSION_CONFLICT",
  ) {
    super(message, code);
  }
}
