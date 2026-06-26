import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { ApiError } from '../utils/ApiError';

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`Role '${req.user.role}' is not permitted to perform this action`)
      );
    }
    next();
  };
}
