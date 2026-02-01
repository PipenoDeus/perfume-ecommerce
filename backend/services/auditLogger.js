/**
 * Audit logging service for tracking sensitive operations
 * Should be logged to a secure, centralized logging system in production
 */

const auditLogs = []; // In production, write to database or external log service

export class AuditLogger {
  /**
   * Log a payment-related event
   */
  static logPayment(event, data) {
    const log = {
      timestamp: new Date().toISOString(),
      type: 'PAYMENT',
      event: event, // e.g., 'PAYMENT_CREATED', 'PAYMENT_VERIFIED', 'PAYMENT_FAILED'
      userId: data.userId,
      orderId: data.orderId,
      amount: data.amount,
      method: data.method, // 'paypal' or 'bank'
      status: data.status,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: data.metadata || {}
    };

    this._writeLog(log);
  }

  /**
   * Log a security-related event
   */
  static logSecurityEvent(event, data) {
    const log = {
      timestamp: new Date().toISOString(),
      type: 'SECURITY',
      event: event, // e.g., 'INVALID_SIGNATURE', 'CSRF_VALIDATION_FAILED', 'RATE_LIMIT_EXCEEDED'
      userId: data.userId,
      ipAddress: data.ipAddress,
      severity: data.severity || 'WARNING', // INFO, WARNING, CRITICAL
      details: data.details,
      userAgent: data.userAgent
    };

    this._writeLog(log);
  }

  /**
   * Log an authentication event
   */
  static logAuth(event, data) {
    const log = {
      timestamp: new Date().toISOString(),
      type: 'AUTH',
      event: event, // e.g., 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT'
      userId: data.userId,
      email: data.email,
      ipAddress: data.ipAddress,
      reason: data.reason || null,
      userAgent: data.userAgent
    };

    this._writeLog(log);
  }

  /**
   * Log an administrative action
   */
  static logAdmin(action, data) {
    const log = {
      timestamp: new Date().toISOString(),
      type: 'ADMIN',
      action: action, // e.g., 'PAYMENT_CONFIRMED', 'ORDER_CANCELLED', 'USER_BANNED'
      adminId: data.adminId,
      targetId: data.targetId,
      changes: data.changes || {},
      ipAddress: data.ipAddress,
      reason: data.reason || null,
      userAgent: data.userAgent
    };

    this._writeLog(log);
  }

  /**
   * Internal method to write logs
   */
  static _writeLog(log) {
    auditLogs.push(log);

    // In development, log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUDIT]', JSON.stringify(log, null, 2));
    }

    // TODO: In production, write to:
    // - Centralized logging service (e.g., ELK, Datadog, Splunk)
    // - Database audit table
    // - Secure file storage
    // Example for production:
    // if (process.env.LOG_SERVICE === 'datadog') {
    //   sendToDatadog(log);
    // }

    // Keep only recent logs in memory (last 1000)
    if (auditLogs.length > 1000) {
      auditLogs.shift();
    }
  }

  /**
   * Get recent logs (for debugging/monitoring)
   */
  static getRecentLogs(count = 50) {
    return auditLogs.slice(-count);
  }

  /**
   * Clear logs
   */
  static clearLogs() {
    auditLogs.length = 0;
  }
}

export default AuditLogger;
