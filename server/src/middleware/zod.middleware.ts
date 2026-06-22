import { ZodObject, ZodRawShape, z, ZodError, ZodIssue } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utilities/errors.util';

export function ZodBodyValidator<T extends ZodRawShape>(schema: ZodObject<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      let message = 'Validation Failed';
      let details: ZodIssue[] | Record<string, never> = {};

      if (err instanceof ZodError) {
        message = `Validation failed: ${err.issues.length} errors detected in body`;
        details = err.issues;
      }

      const badReqError = new BadRequestError(message);
      badReqError.details = details as unknown as Record<string, unknown>;

      next(badReqError);
    }
  };
}

export function ZodQueryValidator<T extends ZodRawShape>(schema: ZodObject<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      let message = 'Query Format Error';
      let details: ZodIssue[] | Record<string, never> = {};

      if (err instanceof ZodError) {
        message = `Validation failed: ${err.issues.length} errors detected in query params`;
        details = err.issues;
      }

      const badReqError = new BadRequestError(message);
      badReqError.details = details as unknown as Record<string, unknown>;

      next(badReqError);
    }
  };
}

export function ZodParamValidator<T extends ZodRawShape>(schema: ZodObject<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (err) {
      let message = 'Query Format Error';
      let details: ZodIssue[] | Record<string, never> = {};

      if (err instanceof ZodError) {
        message = `Validation failed: ${err.issues.length} errors detected in url params`;
        details = err.issues;
      }

      const badReqError = new BadRequestError(message);
      badReqError.details = details as unknown as Record<string, unknown>;

      next(badReqError);
    }
  };
}

export function ZodIdValidator(idField = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params[idField] = String(
        z.number({ coerce: true }).parse(req.params[idField])
      );
      next();
    } catch (err) {
      let message = 'Query Format Error';
      let details: ZodIssue[] | Record<string, never> = {};

      if (err instanceof ZodError) {
        message = err.message;
        details = err.issues;
      }

      const badReqError = new BadRequestError(message);
      badReqError.details = details as unknown as Record<string, unknown>;

      next(badReqError);
    }
  };
}
