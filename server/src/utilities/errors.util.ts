export class BaseError extends Error {
  constructor(
    public message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(message);
  }

  toJSON() {
    return {
      ...this,
      stack: this.stack
    };
  }

  toString() {
    return `${this.name} ${JSON.stringify(this.toJSON())}`;
  }
}

export class HTTPError extends Error {
  code: number;
  details: Record<string, unknown>;

  constructor(
    message: string,
    code: number,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends HTTPError {
  name = 'BadRequestError';

  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends HTTPError {
  name = 'UnauthorizedError';

  constructor(message: string) {
    super(message, 401);
  }
}

export class ForbiddenError extends HTTPError {
  name = 'ForbiddenError';

  constructor(message: string) {
    super(message, 403);
  }
}

export class NotFoundError extends HTTPError {
  name = 'NotFoundError';

  constructor(message: string) {
    super(message, 404);
  }
}

export class NotImplemented extends HTTPError {
  name = 'NotImplemented';

  constructor(message: string) {
    super(message, 405);
  }
}

export class UnprocessableError extends HTTPError {
  name = 'UnprocessableError';

  constructor(message: string) {
    super(message, 422);
  }
}

export class GeneralError extends HTTPError {
  name = 'GeneralError';

  constructor(message: string) {
    super(message, 500);
  }
}
