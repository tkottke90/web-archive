export class HTTPError extends Error {
  code: number;
  details: Record<string, any>;

  constructor(
    message: string,
    code: number,
    details: Record<string, any> = {}
  ) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends HTTPError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends HTTPError {
  constructor(message: string) {
    super(message, 401);
  }
}

export class ForbiddenError extends HTTPError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class NotFoundError extends HTTPError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class UnprocessableError extends HTTPError {
  constructor(message: string) {
    super(message, 422);
  }
}

export class GeneralError extends HTTPError {
  constructor(message: string) {
    super(message, 500);
  }
}
