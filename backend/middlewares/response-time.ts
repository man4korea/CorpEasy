import { Request, Response, NextFunction } from 'express';

export const measureResponseTime = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} completed in ${duration}ms`);
  });
  
  next();
}; 