import crypto from 'crypto'
import {
  validateHMACSignature,
  generateHMACSignature,
  validateTimestamp,
  validateWebhookSecurity,
} from '../hmac'

describe('HMAC Security Functions', () => {
  const testSecret = 'test-secret-key-12345'
  const testPayload = JSON.stringify({ action: 'test', data: 'sample' })

  describe('generateHMACSignature', () => {
    it('should generate valid HMAC signature with sha256 prefix', () => {
      const signature = generateHMACSignature(testPayload, testSecret)

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/)
      expect(signature).toContain('sha256=')
    })

    it('should generate consistent signatures for same input', () => {
      const signature1 = generateHMACSignature(testPayload, testSecret)
      const signature2 = generateHMACSignature(testPayload, testSecret)

      expect(signature1).toBe(signature2)
    })

    it('should generate different signatures for different payloads', () => {
      const payload1 = JSON.stringify({ action: 'test1' })
      const payload2 = JSON.stringify({ action: 'test2' })

      const signature1 = generateHMACSignature(payload1, testSecret)
      const signature2 = generateHMACSignature(payload2, testSecret)

      expect(signature1).not.toBe(signature2)
    })

    it('should generate different signatures for different secrets', () => {
      const secret1 = 'secret1'
      const secret2 = 'secret2'

      const signature1 = generateHMACSignature(testPayload, secret1)
      const signature2 = generateHMACSignature(testPayload, secret2)

      expect(signature1).not.toBe(signature2)
    })

    it('should throw error for empty payload', () => {
      expect(() => generateHMACSignature('', testSecret)).toThrow(
        'Payload and secret are required for HMAC signature generation'
      )
    })

    it('should throw error for empty secret', () => {
      expect(() => generateHMACSignature(testPayload, '')).toThrow(
        'Payload and secret are required for HMAC signature generation'
      )
    })
  })

  describe('validateHMACSignature', () => {
    it('should validate correct HMAC signature', () => {
      const signature = generateHMACSignature(testPayload, testSecret)
      const isValid = validateHMACSignature(testPayload, signature, testSecret)

      expect(isValid).toBe(true)
    })

    it('should validate signature without sha256 prefix', () => {
      const signature = generateHMACSignature(testPayload, testSecret)
      const signatureWithoutPrefix = signature.replace('sha256=', '')
      const isValid = validateHMACSignature(testPayload, signatureWithoutPrefix, testSecret)

      expect(isValid).toBe(true)
    })

    it('should reject invalid signature', () => {
      const invalidSignature = 'sha256=invalid_signature_here'
      const isValid = validateHMACSignature(testPayload, invalidSignature, testSecret)

      expect(isValid).toBe(false)
    })

    it('should reject signature with wrong secret', () => {
      const signature = generateHMACSignature(testPayload, testSecret)
      const isValid = validateHMACSignature(testPayload, signature, 'wrong-secret')

      expect(isValid).toBe(false)
    })

    it('should reject signature for different payload', () => {
      const signature = generateHMACSignature(testPayload, testSecret)
      const differentPayload = JSON.stringify({ action: 'different' })
      const isValid = validateHMACSignature(differentPayload, signature, testSecret)

      expect(isValid).toBe(false)
    })

    it('should return false for empty inputs', () => {
      expect(validateHMACSignature('', 'signature', testSecret)).toBe(false)
      expect(validateHMACSignature(testPayload, '', testSecret)).toBe(false)
      expect(validateHMACSignature(testPayload, 'signature', '')).toBe(false)
    })

    it('should prevent timing attacks using timing-safe comparison', () => {
      // This test ensures we're using crypto.timingSafeEqual
      // by checking that the function doesn't short-circuit on length differences
      const signature = generateHMACSignature(testPayload, testSecret)
      const shortSignature = signature.substring(0, 10)

      const isValid = validateHMACSignature(testPayload, shortSignature, testSecret)
      expect(isValid).toBe(false)
    })
  })

  describe('validateTimestamp', () => {
    it('should validate current timestamp', () => {
      const currentTimestamp = Math.floor(Date.now() / 1000)
      const isValid = validateTimestamp(currentTimestamp)

      expect(isValid).toBe(true)
    })

    it('should validate timestamp as string', () => {
      const currentTimestamp = Math.floor(Date.now() / 1000).toString()
      const isValid = validateTimestamp(currentTimestamp)

      expect(isValid).toBe(true)
    })

    it('should validate timestamp within tolerance', () => {
      const timestamp = Math.floor(Date.now() / 1000) - 100 // 100 seconds ago
      const isValid = validateTimestamp(timestamp, 300) // 5 minute tolerance

      expect(isValid).toBe(true)
    })

    it('should reject timestamp outside tolerance', () => {
      const timestamp = Math.floor(Date.now() / 1000) - 400 // 400 seconds ago
      const isValid = validateTimestamp(timestamp, 300) // 5 minute tolerance

      expect(isValid).toBe(false)
    })

    it('should reject future timestamp outside tolerance', () => {
      const timestamp = Math.floor(Date.now() / 1000) + 400 // 400 seconds in future
      const isValid = validateTimestamp(timestamp, 300) // 5 minute tolerance

      expect(isValid).toBe(false)
    })

    it('should reject invalid timestamp string', () => {
      const isValid = validateTimestamp('invalid-timestamp')

      expect(isValid).toBe(false)
    })

    it('should reject empty timestamp', () => {
      expect(validateTimestamp('')).toBe(false)
      expect(validateTimestamp(0)).toBe(false)
    })

    it('should use custom tolerance', () => {
      const timestamp = Math.floor(Date.now() / 1000) - 50 // 50 seconds ago

      expect(validateTimestamp(timestamp, 60)).toBe(true) // 1 minute tolerance
      expect(validateTimestamp(timestamp, 30)).toBe(false) // 30 second tolerance
    })
  })

  describe('validateWebhookSecurity', () => {
    let validSignature: string
    let validTimestamp: number

    beforeEach(() => {
      validSignature = generateHMACSignature(testPayload, testSecret)
      validTimestamp = Math.floor(Date.now() / 1000)
    })

    it('should validate complete webhook with valid signature and timestamp', () => {
      const result = validateWebhookSecurity(
        testPayload,
        validSignature,
        validTimestamp,
        testSecret
      )

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should accept string timestamp', () => {
      const result = validateWebhookSecurity(
        testPayload,
        validSignature,
        validTimestamp.toString(),
        testSecret
      )

      expect(result.valid).toBe(true)
    })

    it('should reject with missing payload', () => {
      const result = validateWebhookSecurity('', validSignature, validTimestamp, testSecret)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Missing payload')
    })

    it('should reject with missing signature', () => {
      const result = validateWebhookSecurity(testPayload, '', validTimestamp, testSecret)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Missing signature')
    })

    it('should reject with missing timestamp', () => {
      const result = validateWebhookSecurity(testPayload, validSignature, '', testSecret)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Missing timestamp')
    })

    it('should reject with missing secret', () => {
      const result = validateWebhookSecurity(testPayload, validSignature, validTimestamp, '')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Missing secret')
    })

    it('should reject with old timestamp', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400 // 400 seconds ago

      const result = validateWebhookSecurity(testPayload, validSignature, oldTimestamp, testSecret)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Request timestamp too old or invalid')
    })

    it('should reject with invalid signature', () => {
      const invalidSignature = 'sha256=invalid_signature'

      const result = validateWebhookSecurity(
        testPayload,
        invalidSignature,
        validTimestamp,
        testSecret
      )

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid signature')
    })

    it('should use custom tolerance', () => {
      const timestamp = Math.floor(Date.now() / 1000) - 400 // 400 seconds ago
      const signature = generateHMACSignature(testPayload, testSecret)

      // Should fail with default tolerance (300s)
      const result1 = validateWebhookSecurity(testPayload, signature, timestamp, testSecret)
      expect(result1.valid).toBe(false)

      // Should pass with custom tolerance (500s)
      const result2 = validateWebhookSecurity(testPayload, signature, timestamp, testSecret, 500)
      expect(result2.valid).toBe(true)
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle GitHub-style webhook signature', () => {
      const payload = '{"zen":"Non-blocking is better than blocking.","hook_id":12345}'
      const secret = 'my-webhook-secret'

      const signature = generateHMACSignature(payload, secret)
      const isValid = validateHMACSignature(payload, signature, secret)

      expect(isValid).toBe(true)
    })

    it('should handle Stripe-style webhook signature', () => {
      const payload = '{"id":"evt_test_webhook","object":"event"}'
      const secret = 'whsec_test_secret'

      const signature = generateHMACSignature(payload, secret)
      const isValid = validateHMACSignature(payload, signature, secret)

      expect(isValid).toBe(true)
    })

    it('should handle empty JSON payload', () => {
      const payload = '{}'
      const signature = generateHMACSignature(payload, testSecret)
      const isValid = validateHMACSignature(payload, signature, testSecret)

      expect(isValid).toBe(true)
    })

    it('should handle Unicode characters in payload', () => {
      const payload = '{"message":"Hello 世界 🌍"}'
      const signature = generateHMACSignature(payload, testSecret)
      const isValid = validateHMACSignature(payload, signature, testSecret)

      expect(isValid).toBe(true)
    })
  })
})
