async function captureSentryError(message: string, err?: any, context?: Record<string, any>) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    const match = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
    if (!match) return;

    const [, publicKey, host, projectId] = match;
    const storeUrl = `https://${host}/api/${projectId}/store/`;

    const errorObj = err instanceof Error ? err : null;
    const errorMsg = errorObj ? errorObj.message : typeof err === 'string' ? err : JSON.stringify(err || '');

    const payload = {
      event_id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)).replace(/-/g, ''),
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      platform: 'node',
      level: 'error',
      logger: 'apiUtils',
      message: {
        formatted: message ? `${message}${errorMsg ? `: ${errorMsg}` : ''}` : errorMsg || 'Server Error',
      },
      exception: errorObj
        ? {
            values: [
              {
                type: errorObj.name || 'Error',
                value: errorObj.message,
                stacktrace: errorObj.stack
                  ? {
                      frames: errorObj.stack
                        .split('\n')
                        .slice(1)
                        .map((line) => ({ filename: line.trim() })),
                    }
                  : undefined,
              },
            ],
          }
        : undefined,
      extra: {
        ...(context || {}),
        rawError: !errorObj && err ? err : undefined,
      },
    };

    fetch(storeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=custom-logger/1.0`,
      },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Ignore background fetch errors
    });
  } catch {
    // Silent catch so logging never throws
  }
}

export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        ...context,
      })
    );
  },
  warn: (message: string, context?: Record<string, any>) => {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message,
        ...context,
      })
    );
  },
  error: (message: string, err?: any, context?: Record<string, any>) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message,
        error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        ...context,
      })
    );

    if (process.env.SENTRY_DSN) {
      try {
        captureSentryError(message, err, context);
      } catch {
        // Silent catch so Sentry capture failures never throw
      }
    }
  },
};
