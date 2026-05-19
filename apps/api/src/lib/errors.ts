export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Invalid input', public readonly details?: unknown) {
    super(400, 'VALIDATION_ERROR', message)
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message)
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message)
  }
}

export class NotFoundError extends HttpError {
  constructor(resource = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found`)
  }
}

export class BusinessError extends HttpError {
  constructor(code: string, message: string) {
    super(422, code, message)
  }
}

export class ConflictError extends HttpError {
  constructor(code: string, message: string) {
    super(409, code, message)
  }
}
