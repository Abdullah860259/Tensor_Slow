type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function formatError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  if (typeof err === "string") {
    return { name: "Error", message: err };
  }
  return { name: "UnknownError", message: String(err) };
}

function writeLog(level: LogLevel, message: string, meta?: Record<string, unknown>, error?: unknown): void {
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
    ...(error ? { error: formatError(error) } : {}),
  };

  const output = JSON.stringify(payload);

  if (level === "error") {
    process.stderr.write(output + "\n");
  } else {
    process.stdout.write(output + "\n");
  }
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== "production") {
      writeLog("debug", message, meta);
    }
  },
  info(message: string, meta?: Record<string, unknown>): void {
    writeLog("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    writeLog("warn", message, meta);
  },
  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    writeLog("error", message, meta, error);
  },
};
