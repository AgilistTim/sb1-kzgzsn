type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private logLevel: LogLevel = 'info';

  setLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  debug(...args: any[]) {
    if (this.shouldLog('debug')) {
      console.debug(new Date().toISOString(), '[DEBUG]', ...args);
    }
  }

  info(...args: any[]) {
    if (this.shouldLog('info')) {
      console.info(new Date().toISOString(), '[INFO]', ...args);
    }
  }

  warn(...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(new Date().toISOString(), '[WARN]', ...args);
    }
  }

  error(...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(new Date().toISOString(), '[ERROR]', ...args);
    }
  }
}

export const logger = new Logger();