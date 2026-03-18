import morgan, { StreamOptions } from 'morgan';

const stream: StreamOptions = {
  write: (message: string) => process.stdout.write(message),
};

const skip = (): boolean => process.env.NODE_ENV === 'test';

export const loggerMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream, skip }
);
