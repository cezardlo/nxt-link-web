type LogLevel = 'info' | 'warn' | 'error';

type LogPayload = {
  event: string;
  requestId?: string;
  [key: string]: unknown;
};

function write(level: LogLevel, payload: LogPayload) {
  const line = {
    level,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  // eslint-disable-next-line no-console
  console[level](JSON.stringify(line));
}

export const logger = {
  info(payload: LogPayload) {
    write('info', payload);
  },
  warn(payload: LogPayload) {
    write('warn', payload);
  },
  error(payload: LogPayload) {
    write('error', payload);
  },
};
