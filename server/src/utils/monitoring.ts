import type { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

let initialized = false;
const register = new client.Registry();

let httpRequestDurationHistogram: client.Histogram<string>;

export const initMonitoring = () => {
  if (initialized) {
    return;
  }

  client.collectDefaultMetrics({ register });

  httpRequestDurationHistogram = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [
      0.005,
      0.01,
      0.025,
      0.05,
      0.1,
      0.25,
      0.5,
      1,
      2.5,
      5,
      10,
    ],
    registers: [register],
  });

  initialized = true;
};

export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!initialized || !httpRequestDurationHistogram) {
    return next();
  }

  if (req.path === '/metrics') {
    return next();
  }

  const end = httpRequestDurationHistogram.startTimer();

  res.on('finish', () => {
    const route = req.route?.path || req.baseUrl || req.path;
    end({
      method: req.method,
      route,
      status_code: res.statusCode,
    });
  });

  next();
};

export const metricsHandler = async (_req: Request, res: Response) => {
  if (!initialized) {
    res.status(503).json({ message: 'Monitoring not enabled' });
    return;
  }

  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
};
