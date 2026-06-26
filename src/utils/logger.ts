

type Level = 'info' | 'warn' | 'error' | 'debug';

function timestamp(): string {
  return new Date().toISOString();
}

function format(level: Level, message: string): string {
  return `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
}

export const logger = {
  info: (message: string) => console.log(format('info', message)),
  warn: (message: string) => console.warn(format('warn', message)),
  error: (message: string) => console.error(format('error', message)),
  debug: (message: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(format('debug', message));
    }
  },
};
