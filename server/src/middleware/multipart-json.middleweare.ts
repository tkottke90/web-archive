import { Request, Response, NextFunction } from 'express';

/**
 * Parse a body parameter, convert the values from strings to
 * JSON.  If the parameter is a array, convert each of the child
 * parameters
 */
export function MultipartJson(key: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body[key]) {
        if (Array.isArray(req.body[key])) {
          req.body[key] = req.body[key].map((item: string) => JSON.parse(item));
        } else {
          req.body[key] = JSON.parse(req.body[key]);
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
