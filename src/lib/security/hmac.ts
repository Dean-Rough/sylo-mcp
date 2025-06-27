import crypto from 'crypto'

/**
 * Validates HMAC-SHA256 signatures for webhook security
 * Prevents signature attacks using timing-safe comparison
 */
export function validateHMACSignature(payload: string, signature: string, secret: string): boolean {
  if (!payload || !signature || !secret) {
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')

  // Remove 'sha256=' prefix if present
  const receivedSignature = signature.replace(/^sha256=/, '')

  // Ensure signatures are the same length before using timingSafeEqual
  // If lengths differ, return false immediately (still secure)
  if (expectedSignature.length !== receivedSignature.length) {
    return false
  }

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    )
  } catch (error) {
    // Handle invalid hex strings or other buffer creation errors
    return false
  }
}

/**
 * Generates HMAC-SHA256 signature for webhook payloads
 */
export function generateHMACSignature(payload: string, secret: string): string {
  if (!payload || !secret) {
    throw new Error('Payload and secret are required for HMAC signature generation')
  }

  const signature = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex')

  return `sha256=${signature}`
}

/**
 * Validates webhook timestamp to prevent replay attacks
 * @param timestamp Unix timestamp from webhook header
 * @param toleranceSeconds Maximum age of request in seconds (default: 300 = 5 minutes)
 */
export function validateTimestamp(timestamp: string | number, toleranceSeconds = 300): boolean {
  if (!timestamp) {
    return false
  }

  const requestTime = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp
  const currentTime = Math.floor(Date.now() / 1000)

  if (isNaN(requestTime)) {
    return false
  }

  return Math.abs(currentTime - requestTime) <= toleranceSeconds
}

/**
 * Complete webhook security validation
 * Validates both HMAC signature and timestamp
 */
export function validateWebhookSecurity(
  payload: string,
  signature: string,
  timestamp: string | number,
  secret: string,
  toleranceSeconds = 300
): { valid: boolean; error?: string } {
  // Validate inputs
  if (!payload) {
    return { valid: false, error: 'Missing payload' }
  }

  if (!signature) {
    return { valid: false, error: 'Missing signature' }
  }

  if (!timestamp) {
    return { valid: false, error: 'Missing timestamp' }
  }

  if (!secret) {
    return { valid: false, error: 'Missing secret' }
  }

  // Validate timestamp first (faster check)
  if (!validateTimestamp(timestamp, toleranceSeconds)) {
    return { valid: false, error: 'Request timestamp too old or invalid' }
  }

  // Validate HMAC signature
  if (!validateHMACSignature(payload, signature, secret)) {
    return { valid: false, error: 'Invalid signature' }
  }

  return { valid: true }
}
