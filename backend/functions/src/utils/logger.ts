type LogLevel = 'info' | 'error' | 'warn' | 'debug';

interface LogMessage {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: any;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, args: any[]): LogMessage {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      details: args.length ? args : undefined
    };
  }

  info(message: string, ...args: any[]): void {
    const logMessage = this.formatMessage('info', message, args);
    console.log(`[${logMessage.timestamp}] [INFO] ${logMessage.message}`, ...(args || []));
  }

  error(message: string | Error, ...args: any[]): void {
    const errorMessage = message instanceof Error ? message.message : message;
    const logMessage = this.formatMessage('error', errorMessage, args);
    console.error(`[${logMessage.timestamp}] [ERROR] ${logMessage.message}`, ...(args || []));
  }

  warn(message: string, ...args: any[]): void {
    const logMessage = this.formatMessage('warn', message, args);
    console.warn(`[${logMessage.timestamp}] [WARN] ${logMessage.message}`, ...(args || []));
  }

  debug(message: string, ...args: any[]): void {
    const logMessage = this.formatMessage('debug', message, args);
    console.debug(`[${logMessage.timestamp}] [DEBUG] ${logMessage.message}`, ...(args || []));
  }
}

export const logger = new Logger(); 