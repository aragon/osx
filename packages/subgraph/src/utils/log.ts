import {log} from '@graphprotocol/graph-ts';

// The header for log messages that will trigger alerts in monitoring systems
export const LOG_ALERT_HEADER = '[SUBGRAPH CRITICAL RUNTIME ERROR]::{}';

/**
 * Create a log message that will trigger alerts in monitoring systems.
 * This is an alternative to throwing an exception that preserves liveness.
 * @param message The message to log
 */
export function logAlert(message: string): void {
  log.warning(LOG_ALERT_HEADER, [message]);
}
