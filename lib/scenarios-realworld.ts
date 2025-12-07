/**
 * Real-World Interview Scenarios
 *
 * These scenarios simulate actual Meta/Google AI-assisted interview formats:
 *
 * 60-minute round split into:
 * 1. Explore and fix issues (read existing code, debug failing tests, fix small bugs)
 * 2. Implement new functionality (add a new function/feature)
 * 3. Extend/improve the system (modify components, add complex features, optimize)
 *
 * Key aspects:
 * - Real codebase with multiple files
 * - Failing tests to debug
 * - Context like a real product
 * - Emphasis on understanding, not just fixing
 */

import type { BugFixScenario, SystemDesignScenario } from './scenarios';

// =============================================================================
// REAL-WORLD BUG FIX SCENARIOS
// =============================================================================

export const realWorldBugFixScenarios: BugFixScenario[] = [
  {
    id: 'bugfix-payment-processor',
    title: 'E-Commerce Payment Processing Bug',
    type: 'bugfix',
    difficulty: 'medium',
    companies: ['Stripe', 'Shopify', 'Amazon', 'Meta'],
    description: 'Fix a critical bug in the payment processing flow causing failed transactions',
    tags: ['debugging', 'payments', 'async', 'error-handling'],
    estimatedTime: 45,
    problemStatement: `You're working on an e-commerce platform's checkout system. Users are reporting that some payments are failing silently - they click "Pay" but nothing happens. The payment sometimes goes through on retry.

**Your task:**
1. Read the existing code and tests to understand the system
2. Identify why payments are failing silently
3. Fix the bug and ensure all tests pass
4. Explain your fix to the interviewer

**Context:** This is a real production bug that's costing the company revenue. The code hasn't been touched in 6 months.`,
    buggyCode: {
      javascript: `// payment-processor.js
// BUG: Payments fail silently under certain conditions

class PaymentProcessor {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async processPayment(order) {
    const { amount, currency, customerId, items } = order;

    // Validate order
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    try {
      // Create payment intent
      const paymentIntent = await this.createPaymentIntent({
        amount,
        currency: currency || 'usd',
        customerId,
        metadata: { itemCount: items.length }
      });

      // Confirm the payment
      const result = this.confirmPayment(paymentIntent.id);

      // Update inventory
      await this.updateInventory(items);

      return {
        success: true,
        transactionId: paymentIntent.id,
        amount: paymentIntent.amount
      };

    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        return this.processPayment(order);
      }
      throw error;
    }
  }

  async createPaymentIntent(params) {
    const response = await this.apiClient.post('/payment-intents', params);
    return response.data;
  }

  async confirmPayment(intentId) {
    const response = await this.apiClient.post(\`/payment-intents/\${intentId}/confirm\`);
    return response.data;
  }

  async updateInventory(items) {
    const updates = items.map(item =>
      this.apiClient.patch(\`/inventory/\${item.id}\`, {
        quantity: item.quantity * -1
      })
    );
    return Promise.all(updates);
  }
}

module.exports = { PaymentProcessor };`,
      python: `# payment_processor.py
# BUG: Payments fail silently under certain conditions

class PaymentProcessor:
    def __init__(self, api_client):
        self.api_client = api_client
        self.retry_count = 0
        self.max_retries = 3

    async def process_payment(self, order):
        amount = order.get('amount')
        currency = order.get('currency', 'usd')
        customer_id = order.get('customer_id')
        items = order.get('items', [])

        # Validate order
        if not amount or amount <= 0:
            raise ValueError('Invalid amount')

        try:
            # Create payment intent
            payment_intent = await self.create_payment_intent({
                'amount': amount,
                'currency': currency,
                'customer_id': customer_id,
                'metadata': {'item_count': len(items)}
            })

            # Confirm the payment
            result = self.confirm_payment(payment_intent['id'])

            # Update inventory
            await self.update_inventory(items)

            return {
                'success': True,
                'transaction_id': payment_intent['id'],
                'amount': payment_intent['amount']
            }

        except Exception as error:
            if self.retry_count < self.max_retries:
                self.retry_count += 1
                return await self.process_payment(order)
            raise error

    async def create_payment_intent(self, params):
        response = await self.api_client.post('/payment-intents', params)
        return response['data']

    async def confirm_payment(self, intent_id):
        response = await self.api_client.post(f'/payment-intents/{intent_id}/confirm')
        return response['data']

    async def update_inventory(self, items):
        updates = [
            self.api_client.patch(f'/inventory/{item["id"]}', {
                'quantity': item['quantity'] * -1
            })
            for item in items
        ]
        return await asyncio.gather(*updates)`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'api-client.js',
          content: `// api-client.js
// HTTP client for external API calls

class ApiClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.timeout = 5000;
  }

  async post(endpoint, data) {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${this.apiKey}\`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(\`API Error: \${response.status}\`);
    }

    return { data: await response.json() };
  }

  async patch(endpoint, data) {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${this.apiKey}\`
      },
      body: JSON.stringify(data)
    });

    return { data: await response.json() };
  }
}

module.exports = { ApiClient };`,
          description: 'HTTP client for making API calls to payment provider',
        },
        {
          fileName: 'order-service.js',
          content: `// order-service.js
// Handles order creation and management

const { PaymentProcessor } = require('./payment-processor');

class OrderService {
  constructor(paymentProcessor, orderRepository) {
    this.paymentProcessor = paymentProcessor;
    this.orderRepository = orderRepository;
  }

  async checkout(cart, customer) {
    // Calculate total
    const total = cart.items.reduce((sum, item) =>
      sum + (item.price * item.quantity), 0
    );

    // Create order
    const order = {
      id: this.generateOrderId(),
      customerId: customer.id,
      items: cart.items,
      amount: total,
      currency: customer.currency || 'usd',
      status: 'pending',
      createdAt: new Date()
    };

    // Save order
    await this.orderRepository.save(order);

    try {
      // Process payment
      const result = await this.paymentProcessor.processPayment(order);

      // Update order status
      order.status = 'completed';
      order.transactionId = result.transactionId;
      await this.orderRepository.update(order);

      return order;

    } catch (error) {
      order.status = 'failed';
      order.error = error.message;
      await this.orderRepository.update(order);
      throw error;
    }
  }

  generateOrderId() {
    return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = { OrderService };`,
          description: 'Order service that uses PaymentProcessor',
        },
        {
          fileName: 'payment-processor.test.js',
          content: `// payment-processor.test.js
// Tests for PaymentProcessor

const { PaymentProcessor } = require('./payment-processor');

describe('PaymentProcessor', () => {
  let processor;
  let mockApiClient;

  beforeEach(() => {
    mockApiClient = {
      post: jest.fn(),
      patch: jest.fn()
    };
    processor = new PaymentProcessor(mockApiClient);
  });

  test('should process valid payment successfully', async () => {
    mockApiClient.post.mockResolvedValueOnce({
      data: { id: 'pi_123', amount: 1000 }
    });
    mockApiClient.post.mockResolvedValueOnce({
      data: { status: 'succeeded' }
    });
    mockApiClient.patch.mockResolvedValue({ data: {} });

    const order = {
      amount: 1000,
      currency: 'usd',
      customerId: 'cust_1',
      items: [{ id: 'item_1', quantity: 1 }]
    };

    const result = await processor.processPayment(order);

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('pi_123');
  });

  test('should throw error for invalid amount', async () => {
    const order = { amount: 0, items: [] };

    await expect(processor.processPayment(order))
      .rejects.toThrow('Invalid amount');
  });

  test('should update inventory after successful payment', async () => {
    mockApiClient.post.mockResolvedValue({
      data: { id: 'pi_123', amount: 1000 }
    });
    mockApiClient.patch.mockResolvedValue({ data: {} });

    const order = {
      amount: 1000,
      customerId: 'cust_1',
      items: [
        { id: 'item_1', quantity: 2 },
        { id: 'item_2', quantity: 1 }
      ]
    };

    await processor.processPayment(order);

    expect(mockApiClient.patch).toHaveBeenCalledTimes(2);
  });
});`,
          description: 'Test file for PaymentProcessor - some tests may be failing',
        },
      ],
      python: [
        {
          fileName: 'api_client.py',
          content: `# api_client.py
# HTTP client for external API calls

import aiohttp

class ApiClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.api_key = api_key
        self.timeout = 5

    async def post(self, endpoint, data):
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}{endpoint}",
                json=data,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.api_key}'
                },
                timeout=self.timeout
            ) as response:
                if not response.ok:
                    raise Exception(f"API Error: {response.status}")
                return {'data': await response.json()}

    async def patch(self, endpoint, data):
        async with aiohttp.ClientSession() as session:
            async with session.patch(
                f"{self.base_url}{endpoint}",
                json=data,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.api_key}'
                }
            ) as response:
                return {'data': await response.json()}`,
          description: 'HTTP client for making API calls to payment provider',
        },
      ],
    },
    expectedBehavior: 'Payment should complete successfully and return transaction details. Inventory should be updated atomically.',
    bugDescription: 'The confirmPayment method call is missing "await" keyword, causing the payment confirmation to not complete before inventory update. This leads to race conditions and silent failures.',
    hints: [
      'Look carefully at how async/await is being used in the processPayment method',
      'Is every async operation being properly awaited?',
      'Check the confirmPayment call - is it a Promise?',
      'The bug is related to async control flow, not logic',
    ],
    testCases: [
      {
        input: { amount: 1000, currency: 'usd', customerId: 'cust_1', items: [{ id: 'item_1', quantity: 1 }] },
        expected: { success: true },
        description: 'Valid payment should succeed',
      },
      {
        input: { amount: 0, items: [] },
        expected: 'Error: Invalid amount',
        description: 'Zero amount should throw error',
      },
      {
        input: { amount: -100, items: [] },
        expected: 'Error: Invalid amount',
        description: 'Negative amount should throw error',
      },
    ],
  },

  {
    id: 'bugfix-rate-limiter',
    title: 'API Rate Limiter Race Condition',
    type: 'bugfix',
    difficulty: 'hard',
    companies: ['Meta', 'Google', 'Netflix', 'Amazon'],
    description: 'Fix a race condition in the distributed rate limiter causing request leaks',
    tags: ['concurrency', 'race-condition', 'distributed-systems', 'redis'],
    estimatedTime: 50,
    problemStatement: `Your company's API rate limiter is occasionally allowing more requests than the limit. In high-traffic scenarios, some requests slip through even when the limit should be exceeded.

**Your task:**
1. Analyze the rate limiter implementation
2. Identify the race condition causing request leaks
3. Fix the bug to ensure accurate rate limiting
4. Explain the concurrency issue and your fix

**Context:** This rate limiter protects critical API endpoints from abuse. The bug is causing billing issues and potential service degradation.`,
    buggyCode: {
      javascript: `// rate-limiter.js
// BUG: Race condition allows more requests than limit

class RateLimiter {
  constructor(redisClient, options = {}) {
    this.redis = redisClient;
    this.limit = options.limit || 100;
    this.windowMs = options.windowMs || 60000; // 1 minute
  }

  async isAllowed(clientId) {
    const key = \`ratelimit:\${clientId}\`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get current request count
    const currentCount = await this.redis.zcount(key, windowStart, now);

    if (currentCount >= this.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: await this.getResetTime(key)
      };
    }

    // Add current request
    await this.redis.zadd(key, now, \`\${now}-\${Math.random()}\`);

    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Set expiry
    await this.redis.expire(key, Math.ceil(this.windowMs / 1000));

    return {
      allowed: true,
      remaining: this.limit - currentCount - 1,
      resetAt: now + this.windowMs
    };
  }

  async getResetTime(key) {
    const ttl = await this.redis.ttl(key);
    return Date.now() + (ttl * 1000);
  }

  async getRemainingRequests(clientId) {
    const key = \`ratelimit:\${clientId}\`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const count = await this.redis.zcount(key, windowStart, now);
    return Math.max(0, this.limit - count);
  }
}

module.exports = { RateLimiter };`,
      python: `# rate_limiter.py
# BUG: Race condition allows more requests than limit

import time
import random

class RateLimiter:
    def __init__(self, redis_client, limit=100, window_ms=60000):
        self.redis = redis_client
        self.limit = limit
        self.window_ms = window_ms  # 1 minute

    async def is_allowed(self, client_id):
        key = f"ratelimit:{client_id}"
        now = int(time.time() * 1000)
        window_start = now - self.window_ms

        # Get current request count
        current_count = await self.redis.zcount(key, window_start, now)

        if current_count >= self.limit:
            return {
                'allowed': False,
                'remaining': 0,
                'reset_at': await self.get_reset_time(key)
            }

        # Add current request
        await self.redis.zadd(key, {f"{now}-{random.random()}": now})

        # Remove old entries
        await self.redis.zremrangebyscore(key, 0, window_start)

        # Set expiry
        await self.redis.expire(key, self.window_ms // 1000)

        return {
            'allowed': True,
            'remaining': self.limit - current_count - 1,
            'reset_at': now + self.window_ms
        }

    async def get_reset_time(self, key):
        ttl = await self.redis.ttl(key)
        return int(time.time() * 1000) + (ttl * 1000)

    async def get_remaining_requests(self, client_id):
        key = f"ratelimit:{client_id}"
        now = int(time.time() * 1000)
        window_start = now - self.window_ms

        count = await self.redis.zcount(key, window_start, now)
        return max(0, self.limit - count)`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'rate-limiter-middleware.js',
          content: `// rate-limiter-middleware.js
// Express middleware using RateLimiter

const { RateLimiter } = require('./rate-limiter');

function createRateLimitMiddleware(redisClient, options) {
  const limiter = new RateLimiter(redisClient, options);

  return async (req, res, next) => {
    const clientId = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    try {
      const result = await limiter.isAllowed(clientId);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': options.limit || 100,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': result.resetAt
      });

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Too Many Requests',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request if rate limiter fails
      next();
    }
  };
}

module.exports = { createRateLimitMiddleware };`,
          description: 'Express middleware that uses the RateLimiter',
        },
        {
          fileName: 'rate-limiter.test.js',
          content: `// rate-limiter.test.js
// Tests for RateLimiter - including concurrency tests

const { RateLimiter } = require('./rate-limiter');

describe('RateLimiter', () => {
  let limiter;
  let mockRedis;

  beforeEach(() => {
    mockRedis = {
      zcount: jest.fn().mockResolvedValue(0),
      zadd: jest.fn().mockResolvedValue(1),
      zremrangebyscore: jest.fn().mockResolvedValue(0),
      expire: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(60)
    };
    limiter = new RateLimiter(mockRedis, { limit: 5, windowMs: 60000 });
  });

  test('should allow requests under limit', async () => {
    const result = await limiter.isAllowed('client1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  test('should block requests over limit', async () => {
    mockRedis.zcount.mockResolvedValue(5);

    const result = await limiter.isAllowed('client1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test('should handle concurrent requests correctly', async () => {
    // Simulate 10 concurrent requests with limit of 5
    // BUG: This test may fail due to race condition
    const limit = 5;
    limiter = new RateLimiter(mockRedis, { limit, windowMs: 60000 });

    let count = 0;
    mockRedis.zcount.mockImplementation(() => Promise.resolve(count));
    mockRedis.zadd.mockImplementation(() => {
      count++;
      return Promise.resolve(1);
    });

    // Fire 10 concurrent requests
    const requests = Array(10).fill().map(() =>
      limiter.isAllowed('client1')
    );

    const results = await Promise.all(requests);
    const allowedCount = results.filter(r => r.allowed).length;

    // Should only allow 5 requests
    expect(allowedCount).toBeLessThanOrEqual(limit);
  });
});`,
          description: 'Tests for RateLimiter including concurrency test that may fail',
        },
      ],
      python: [],
    },
    expectedBehavior: 'Rate limiter should accurately limit requests even under high concurrency. No more than the limit should be allowed within any window.',
    bugDescription: 'There is a race condition between checking the count and adding the request. Multiple concurrent requests can all pass the check before any are added, leading to more requests than the limit being allowed.',
    hints: [
      'Think about what happens when two requests arrive at the exact same time',
      'The check-then-act pattern is not atomic',
      'Consider using Redis transactions or Lua scripts for atomicity',
      'Look up "MULTI/EXEC" or Lua scripting in Redis for atomic operations',
    ],
    testCases: [
      {
        input: { clientId: 'client1', requests: 1, limit: 5 },
        expected: { allowed: true, remaining: 4 },
        description: 'Single request under limit should be allowed',
      },
      {
        input: { clientId: 'client1', requests: 6, limit: 5 },
        expected: { allowed: false },
        description: 'Request over limit should be blocked',
      },
      {
        input: { clientId: 'client1', concurrentRequests: 10, limit: 5 },
        expected: { allowedCount: 5 },
        description: 'Concurrent requests should respect limit exactly',
      },
    ],
  },

  {
    id: 'bugfix-user-session',
    title: 'User Session Memory Leak',
    type: 'bugfix',
    difficulty: 'medium',
    companies: ['Meta', 'Google', 'Netflix', 'Slack'],
    description: 'Fix a memory leak in the user session management system causing server crashes',
    tags: ['memory-leak', 'sessions', 'garbage-collection', 'performance'],
    estimatedTime: 40,
    problemStatement: `Your Node.js server is experiencing increasing memory usage over time, eventually crashing with an "out of memory" error. The issue seems related to the user session management system.

**Your task:**
1. Identify the memory leak in the session management code
2. Fix the leak while maintaining session functionality
3. Add proper cleanup mechanisms
4. Explain why the leak occurred and how your fix addresses it

**Context:** This is a production server handling thousands of concurrent users. The server needs to be restarted every few hours due to memory issues.`,
    buggyCode: {
      javascript: `// session-manager.js
// BUG: Memory leak in session management

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.sessionTimeouts = {};
    this.eventListeners = [];
    this.SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
  }

  createSession(userId, userData) {
    const sessionId = this.generateSessionId();

    const session = {
      id: sessionId,
      userId,
      data: { ...userData },
      createdAt: Date.now(),
      lastActivity: Date.now(),
      eventHistory: [],
    };

    this.sessions.set(sessionId, session);

    // Set up session expiry
    this.sessionTimeouts[sessionId] = setTimeout(() => {
      this.expireSession(sessionId);
    }, this.SESSION_DURATION);

    // Add event listener for user activity
    const listener = (event) => {
      if (event.sessionId === sessionId) {
        this.updateActivity(sessionId);
        session.eventHistory.push({
          type: event.type,
          timestamp: Date.now(),
          data: event.data
        });
      }
    };

    this.eventListeners.push(listener);
    global.eventEmitter.on('userActivity', listener);

    return session;
  }

  updateActivity(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();

      // Reset timeout
      clearTimeout(this.sessionTimeouts[sessionId]);
      this.sessionTimeouts[sessionId] = setTimeout(() => {
        this.expireSession(sessionId);
      }, this.SESSION_DURATION);
    }
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  expireSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      console.log(\`Session expired: \${sessionId}\`);
      this.sessions.delete(sessionId);
      // Note: Timeout and listener not cleaned up
    }
  }

  destroySession(sessionId) {
    this.sessions.delete(sessionId);
    clearTimeout(this.sessionTimeouts[sessionId]);
  }

  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getActiveSessionCount() {
    return this.sessions.size;
  }

  // Debug method
  getMemoryStats() {
    return {
      sessions: this.sessions.size,
      timeouts: Object.keys(this.sessionTimeouts).length,
      listeners: this.eventListeners.length
    };
  }
}

module.exports = { SessionManager };`,
      python: `# session_manager.py
# BUG: Memory leak in session management

import time
import uuid
import threading
from typing import Dict, Any, List, Callable

class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, dict] = {}
        self.session_timeouts: Dict[str, threading.Timer] = {}
        self.event_listeners: List[Callable] = []
        self.SESSION_DURATION = 30 * 60  # 30 minutes

    def create_session(self, user_id: str, user_data: dict) -> dict:
        session_id = self._generate_session_id()

        session = {
            'id': session_id,
            'user_id': user_id,
            'data': {**user_data},
            'created_at': time.time(),
            'last_activity': time.time(),
            'event_history': [],
        }

        self.sessions[session_id] = session

        # Set up session expiry
        timer = threading.Timer(
            self.SESSION_DURATION,
            self.expire_session,
            args=[session_id]
        )
        timer.start()
        self.session_timeouts[session_id] = timer

        # Add event listener for user activity
        def listener(event):
            if event.get('session_id') == session_id:
                self.update_activity(session_id)
                session['event_history'].append({
                    'type': event.get('type'),
                    'timestamp': time.time(),
                    'data': event.get('data')
                })

        self.event_listeners.append(listener)
        global_event_emitter.on('user_activity', listener)

        return session

    def update_activity(self, session_id: str):
        session = self.sessions.get(session_id)
        if session:
            session['last_activity'] = time.time()

            # Reset timeout
            if session_id in self.session_timeouts:
                self.session_timeouts[session_id].cancel()

            timer = threading.Timer(
                self.SESSION_DURATION,
                self.expire_session,
                args=[session_id]
            )
            timer.start()
            self.session_timeouts[session_id] = timer

    def get_session(self, session_id: str) -> dict:
        return self.sessions.get(session_id)

    def expire_session(self, session_id: str):
        session = self.sessions.get(session_id)
        if session:
            print(f"Session expired: {session_id}")
            del self.sessions[session_id]
            # Note: Timer and listener not cleaned up

    def destroy_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]
        if session_id in self.session_timeouts:
            self.session_timeouts[session_id].cancel()

    def _generate_session_id(self) -> str:
        return f"sess_{int(time.time())}_{uuid.uuid4().hex[:9]}"

    def get_active_session_count(self) -> int:
        return len(self.sessions)

    def get_memory_stats(self) -> dict:
        return {
            'sessions': len(self.sessions),
            'timeouts': len(self.session_timeouts),
            'listeners': len(self.event_listeners)
        }`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'session-manager.test.js',
          content: `// session-manager.test.js
// Tests for SessionManager

const { SessionManager } = require('./session-manager');
const { EventEmitter } = require('events');

describe('SessionManager', () => {
  let manager;

  beforeAll(() => {
    global.eventEmitter = new EventEmitter();
  });

  beforeEach(() => {
    manager = new SessionManager();
  });

  afterEach(() => {
    global.eventEmitter.removeAllListeners();
  });

  test('should create session', () => {
    const session = manager.createSession('user1', { name: 'Test' });
    expect(session.userId).toBe('user1');
    expect(manager.getActiveSessionCount()).toBe(1);
  });

  test('should retrieve session', () => {
    const created = manager.createSession('user1', { name: 'Test' });
    const retrieved = manager.getSession(created.id);
    expect(retrieved).toEqual(created);
  });

  test('should not leak memory after session expiry', (done) => {
    // Create many sessions
    for (let i = 0; i < 100; i++) {
      manager.createSession(\`user\${i}\`, { name: \`Test \${i}\` });
    }

    const initialStats = manager.getMemoryStats();
    expect(initialStats.sessions).toBe(100);
    expect(initialStats.listeners).toBe(100);

    // Force expire all sessions
    manager.sessions.forEach((_, sessionId) => {
      manager.expireSession(sessionId);
    });

    // Check for leaks
    const finalStats = manager.getMemoryStats();

    // BUG: These assertions will fail
    expect(finalStats.sessions).toBe(0);
    expect(finalStats.listeners).toBe(0); // Will be 100 (leak!)
    expect(finalStats.timeouts).toBe(0);  // Will be 100 (leak!)

    done();
  }, 10000);
});`,
          description: 'Tests for SessionManager including memory leak detection',
        },
      ],
      python: [],
    },
    expectedBehavior: 'Sessions should be properly cleaned up when they expire, including event listeners, timeouts, and all references.',
    bugDescription: 'When sessions expire, event listeners and timeouts are not removed, causing memory to accumulate over time. The eventListeners array grows indefinitely and listeners remain attached to the global event emitter.',
    hints: [
      'Look at what happens in expireSession vs destroySession',
      'Event listeners are being added but never removed',
      'The eventListeners array keeps growing even after sessions expire',
      'Consider storing the listener reference with the session so it can be removed later',
    ],
    testCases: [
      {
        input: { action: 'create', userId: 'user1', userData: { name: 'Test' } },
        expected: { success: true, sessionCount: 1 },
        description: 'Session creation should work',
      },
      {
        input: { action: 'expire', sessionCount: 100 },
        expected: { sessions: 0, listeners: 0, timeouts: 0 },
        description: 'All resources should be freed after expiry',
      },
    ],
  },
];

// =============================================================================
// REAL-WORLD SYSTEM DESIGN SCENARIOS
// =============================================================================

export const realWorldSystemDesignScenarios: SystemDesignScenario[] = [
  {
    id: 'system-design-newsfeed',
    title: 'Design Facebook/Instagram News Feed',
    type: 'system-design',
    difficulty: 'hard',
    companies: ['Meta', 'Google', 'Amazon', 'Netflix'],
    description: 'Design a scalable news feed system like Facebook or Instagram',
    tags: ['system-design', 'scalability', 'distributed-systems', 'feed-ranking'],
    estimatedTime: 45,
    problemStatement: `Design a news feed system similar to Facebook or Instagram that can handle billions of users.

**The 60-minute interview is split into:**
1. **Clarifying Requirements** (10 min) - Ask questions, define scope
2. **High-Level Design** (15 min) - Core components and data flow
3. **Deep Dive** (20 min) - Focus on 1-2 areas in detail
4. **Optimization & Trade-offs** (15 min) - Scale, performance, edge cases

**Your task:**
- Design the system architecture
- Discuss data models and storage
- Explain feed generation and ranking
- Address scalability and performance
- Consider trade-offs and alternatives`,
    functionalRequirements: [
      'Users can create posts (text, images, videos)',
      'Users can follow other users',
      'News feed shows posts from followed users',
      'Feed is personalized and ranked by relevance',
      'Support for likes, comments, and shares',
      'Real-time updates for new posts',
    ],
    nonFunctionalRequirements: [
      'Highly available (99.99% uptime)',
      'Low latency feed loading (<200ms p99)',
      'Eventually consistent (acceptable for social)',
      'Support billions of users',
      'Handle viral content gracefully',
    ],
    constraints: [
      '2 billion daily active users',
      '500 million new posts per day',
      'Average user follows 200 people',
      'Feed refresh every few minutes',
      'Global distribution required',
    ],
    keyComponents: [
      'Post Service - Handle post creation and storage',
      'User Graph Service - Manage follow relationships',
      'Feed Generation Service - Build personalized feeds',
      'Ranking Service - ML-based relevance scoring',
      'Notification Service - Push updates',
      'Media Service - Image/video storage and CDN',
    ],
    hints: [
      'Consider the difference between push vs pull models for feed generation',
      'Think about how to handle celebrities with millions of followers',
      'Consider using pre-computed feeds vs on-demand generation',
      'Caching is critical for hot content and popular users',
    ],
    evaluationCriteria: [
      { category: 'Requirements Clarification', description: 'Asks good questions, defines scope clearly', weight: 15 },
      { category: 'High-Level Design', description: 'Clean architecture, right components', weight: 25 },
      { category: 'Data Model', description: 'Appropriate storage choices, efficient schema', weight: 20 },
      { category: 'Scalability', description: 'Handles scale, identifies bottlenecks', weight: 25 },
      { category: 'Trade-offs', description: 'Discusses alternatives, explains decisions', weight: 15 },
    ],
    exampleSolution: {
      overview: 'Hybrid push-pull feed generation with pre-computed feeds for most users and on-demand generation for celebrity followers',
      architecture: [
        'API Gateway - Load balancing, rate limiting, authentication',
        'Post Service - Sharded by user_id, writes to Kafka',
        'Fan-out Service - Consumes from Kafka, updates follower feeds',
        'Feed Service - Reads pre-computed feeds from cache/storage',
        'Ranking Service - ML model scores posts for relevance',
        'Notification Service - WebSocket connections for real-time',
      ],
      dataModel: [
        'Posts: { post_id, user_id, content, media_urls, created_at, engagement_count }',
        'UserFeeds: { user_id, feed_posts: [post_id], last_updated }',
        'Follows: { follower_id, followee_id, created_at }',
        'Engagements: { post_id, user_id, type, created_at }',
      ],
      apiDesign: [
        'GET /feed - Fetch paginated news feed',
        'POST /posts - Create new post',
        'POST /posts/:id/like - Like a post',
        'GET /posts/:id/comments - Get comments',
        'POST /users/:id/follow - Follow a user',
      ],
      scalability: [
        'Pre-compute feeds for 95% of users (fan-out on write)',
        'On-demand generation for celebrity followers (fan-out on read)',
        'Multi-layer caching: CDN → Redis → Local',
        'Shard posts by user_id, feeds by user_id',
        'Async processing via Kafka for non-critical paths',
      ],
      tradeoffs: [
        'Fan-out on write: Fast reads, slow writes, storage heavy',
        'Fan-out on read: Slow reads, fast writes, compute heavy',
        'Hybrid approach: Complexity vs optimal performance',
        'Eventual consistency: Simplicity vs strict ordering',
        'Pre-ranking vs real-time ranking: Freshness vs compute cost',
      ],
    },
    discussionPoints: [
      'How do you handle a user with 100 million followers posting?',
      'How do you ensure feed freshness while keeping latency low?',
      'How would you implement content moderation at scale?',
      'What happens if the ranking service goes down?',
      'How do you test feed quality?',
    ],
  },
];

export default {
  realWorldBugFixScenarios,
  realWorldSystemDesignScenarios,
};
