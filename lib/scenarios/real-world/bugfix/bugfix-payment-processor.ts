import type { BugFixScenario } from "../../types"

export const bugfixPaymentProcessorScenario: BugFixScenario = {
  id: "bugfix-payment-processor",
  title: "E-Commerce Payment Processing Bug",
  type: "bugfix",
  difficulty: "medium",
  companies: ["Stripe", "Shopify", "Amazon", "Meta"],
  description: "Fix a critical bug in the payment processing flow causing failed transactions",
  tags: ["debugging", "payments", "async", "error-handling"],
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
        fileName: "api-client.js",
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
        description: "HTTP client for making API calls to payment provider",
      },
      {
        fileName: "order-service.js",
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
        description: "Order service that uses PaymentProcessor",
      },
      {
        fileName: "payment-processor.test.js",
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
        description: "Test file for PaymentProcessor - some tests may be failing",
      },
    ],
    python: [
      {
        fileName: "api_client.py",
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
        description: "HTTP client for making API calls to payment provider",
      },
    ],
  },
  expectedBehavior:
    "Payment should complete successfully and return transaction details. Inventory should be updated atomically.",
  bugDescription:
    'The confirmPayment method call is missing "await" keyword, causing the payment confirmation to not complete before inventory update. This leads to race conditions and silent failures.',
  hints: [
    "Look carefully at how async/await is being used in the processPayment method",
    "Is every async operation being properly awaited?",
    "Check the confirmPayment call - is it a Promise?",
    "The bug is related to async control flow, not logic",
  ],
  testCases: [
    {
      input: {
        amount: 1000,
        currency: "usd",
        customerId: "cust_1",
        items: [{ id: "item_1", quantity: 1 }],
      },
      expected: { success: true },
      description: "Valid payment should succeed",
    },
    {
      input: { amount: 0, items: [] },
      expected: "Error: Invalid amount",
      description: "Zero amount should throw error",
    },
    {
      input: { amount: -100, items: [] },
      expected: "Error: Invalid amount",
      description: "Negative amount should throw error",
    },
  ],
}
