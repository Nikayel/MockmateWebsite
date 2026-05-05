import type { BugFixScenario } from "../types"

export const batchApiBugsScenarios: BugFixScenario[] = [
  {
    id: "bugfix-batch-dimension-mismatch",
    title: "Batch Processing Dimension Mismatch",
    type: "bugfix",
    difficulty: "medium",
    companies: ["Google", "Amazon", "Meta", "Microsoft"],
    description: "Fix dimension mismatch bug in batched model inference",
    tags: ["ai", "ml", "tensorflow", "numpy", "debugging"],
    estimatedTime: 30,
    problemStatement: `A batch inference service works correctly for single samples but crashes with dimension mismatch errors when processing batches of multiple samples. The error occurs intermittently and seems related to batch size.

Your task is to identify and fix the dimension handling bug in the batch inference code.`,
    buggyCode: {
      python: `import numpy as np
import tensorflow as tf

class BatchPredictor:
    def __init__(self, model_path):
        self.model = tf.keras.models.load_model(model_path)
        self.input_shape = (10,)  # Model expects 10 features

    def preprocess_sample(self, sample):
        """Preprocess a single sample"""
        # Ensure sample is numpy array
        if not isinstance(sample, np.ndarray):
            sample = np.array(sample)

        # Validate shape
        if sample.shape != self.input_shape:
            raise ValueError(f"Expected shape {self.input_shape}, got {sample.shape}")

        # Normalize
        normalized = (sample - sample.mean()) / (sample.std() + 1e-8)

        return normalized

    def predict_batch(self, samples):
        """Predict on a batch of samples"""
        # Preprocess each sample
        processed_samples = [self.preprocess_sample(s) for s in samples]

        # Convert to batch tensor
        batch = np.array(processed_samples)

        # Run inference
        predictions = self.model.predict(batch, verbose=0)

        return predictions

    def predict_single(self, sample):
        """Predict on a single sample"""
        # Preprocess
        processed = self.preprocess_sample(sample)

        # Add batch dimension
        batch = np.expand_dims(processed, axis=0)

        # Run inference
        prediction = self.model.predict(batch, verbose=0)

        # Remove batch dimension
        return prediction[0]

# Create a simple test model
def create_test_model():
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=(10,)),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    model.compile(optimizer='adam', loss='binary_crossentropy')
    return model

# Test the predictor
model = create_test_model()
model.save('test_model.h5')

predictor = BatchPredictor('test_model.h5')

# Test single prediction - works fine
sample1 = np.random.randn(10)
print("Single prediction:")
result1 = predictor.predict_single(sample1)
print(f"Result: {result1}")

# Test batch prediction - may crash
print("\\nBatch prediction:")
samples = [np.random.randn(10) for _ in range(5)]
results = predictor.predict_batch(samples)
print(f"Results shape: {results.shape}")`,
      javascript: `const tf = require('@tensorflow/tfjs-node');

class BatchPredictor {
    constructor(model) {
        this.model = model;
        this.inputShape = [10];  // Model expects 10 features
    }

    preprocessSample(sample) {
        // Ensure sample is tensor
        let sampleTensor;
        if (sample instanceof tf.Tensor) {
            sampleTensor = sample;
        } else {
            sampleTensor = tf.tensor1d(sample);
        }

        // Validate shape
        if (sampleTensor.shape[0] !== this.inputShape[0]) {
            throw new Error(\`Expected shape [\${this.inputShape}], got [\${sampleTensor.shape}]\`);
        }

        // Normalize
        const mean = sampleTensor.mean();
        const std = tf.moments(sampleTensor).variance.sqrt();
        const normalized = sampleTensor.sub(mean).div(std.add(1e-8));

        return normalized;
    }

    async predictBatch(samples) {
        // Preprocess each sample
        const processedSamples = samples.map(s => this.preprocessSample(s));

        // Stack into batch tensor
        const batch = tf.stack(processedSamples);

        // Run inference
        const predictions = await this.model.predict(batch);
        const results = await predictions.array();

        // Cleanup
        batch.dispose();
        predictions.dispose();
        processedSamples.forEach(t => t.dispose());

        return results;
    }

    async predictSingle(sample) {
        // Preprocess
        const processed = this.preprocessSample(sample);

        // Add batch dimension
        const batch = processed.expandDims(0);

        // Run inference
        const prediction = await this.model.predict(batch);
        const result = await prediction.array();

        // Cleanup
        batch.dispose();
        prediction.dispose();
        processed.dispose();

        // Remove batch dimension
        return result[0];
    }
}

// Create test model
function createTestModel() {
    const model = tf.sequential({
        layers: [
            tf.layers.dense({ units: 64, activation: 'relu', inputShape: [10] }),
            tf.layers.dense({ units: 32, activation: 'relu' }),
            tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
    });
    model.compile({ optimizer: 'adam', loss: 'binaryCrossentropy' });
    return model;
}

// Test the predictor
async function test() {
    const model = createTestModel();
    const predictor = new BatchPredictor(model);

    // Test single prediction
    console.log('Single prediction:');
    const sample1 = Array.from({ length: 10 }, () => Math.random());
    const result1 = await predictor.predictSingle(sample1);
    console.log('Result:', result1);

    // Test batch prediction
    console.log('\\nBatch prediction:');
    const samples = Array.from({ length: 5 }, () =>
        Array.from({ length: 10 }, () => Math.random())
    );
    const results = await predictor.predictBatch(samples);
    console.log('Results:', results);
}

test();`,
    },
    codebaseFiles: {
      python: [
        {
          fileName: "test_cases.py",
          content: `import numpy as np

# Test cases that reveal the bug
test_cases = {
    'single_sample': np.random.randn(10),
    'batch_2': [np.random.randn(10) for _ in range(2)],
    'batch_5': [np.random.randn(10) for _ in range(5)],
    'batch_10': [np.random.randn(10) for _ in range(10)],
}

# Edge cases
edge_cases = {
    'all_zeros': [np.zeros(10) for _ in range(3)],
    'constant_value': [np.ones(10) * 5 for _ in range(3)],
    'mixed': [np.random.randn(10), np.zeros(10), np.ones(10)]
}`,
          description: "Test cases to reproduce the bug",
        },
      ],
      javascript: [
        {
          fileName: "test_cases.js",
          content: `// Test cases that reveal the bug
const testCases = {
    singleSample: Array.from({ length: 10 }, () => Math.random()),
    batch2: Array.from({ length: 2 }, () => Array.from({ length: 10 }, () => Math.random())),
    batch5: Array.from({ length: 5 }, () => Array.from({ length: 10 }, () => Math.random())),
    batch10: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => Math.random())),
};

// Edge cases
const edgeCases = {
    allZeros: Array.from({ length: 3 }, () => Array.from({ length: 10 }, () => 0)),
    constantValue: Array.from({ length: 3 }, () => Array.from({ length: 10 }, () => 5)),
    mixed: [
        Array.from({ length: 10 }, () => Math.random()),
        Array.from({ length: 10 }, () => 0),
        Array.from({ length: 10 }, () => 1)
    ]
};

module.exports = { testCases, edgeCases };`,
          description: "Test cases to reproduce the bug",
        },
      ],
    },
    expectedBehavior:
      "Batch prediction should normalize each sample independently (per-sample statistics) or use global statistics, not compute statistics across the entire batch which changes dimensions.",
    bugDescription:
      "The bug is in preprocess_sample: it computes normalization statistics (mean, std) on individual samples of shape (10,), which works for single predictions. But when called within predict_batch, the normalization with sample.mean() and sample.std() is applied per-sample. The issue appears when samples have zero std (constant values) or when the normalization isn't applied consistently. The actual bug is that normalization should use the same statistics for all samples (fitted on training data), not per-sample statistics which can vary.",
    hints: [
      "Compare how single prediction and batch prediction preprocess data",
      "What normalization statistics are being used?",
      "Should normalization use per-sample statistics or global statistics?",
      "What happens if a sample has constant values (std = 0)?",
      "Consider storing training set statistics for normalization",
      "In batch processing, normalization should be consistent across all samples",
    ],
    testCases: [
      {
        input: "Batch of 5 samples",
        expected: "Should process without dimension errors",
        description: "Normal batch",
      },
      {
        input: "Batch with constant value samples",
        expected: "Should handle gracefully without NaN or errors",
        description: "Edge case with zero std",
      },
    ],
  },
  {
    id: "bugfix-ai-api-retry-logic",
    title: "AI API Retry Logic Bug",
    type: "bugfix",
    difficulty: "medium",
    companies: ["Startup", "Google", "Microsoft", "Meta"],
    description:
      "Fix a critical bug in AI API integration where retry logic fails for rate limits and certain error conditions",
    tags: ["AI", "API", "Error Handling", "Async", "OpenAI", "Claude", "Rate Limiting"],
    estimatedTime: 20,
    problemStatement: `Your team has built an AI-powered customer support chatbot that uses OpenAI's GPT API. Users are reporting intermittent failures where the bot stops responding, especially during peak hours. The application crashes with rate limit errors and sometimes returns partial/corrupted responses.

The codebase includes an AI service wrapper that handles API calls with retry logic. However, the retry mechanism is buggy and doesn't properly handle:
1. Rate limit errors (429 status)
2. Token streaming interruptions
3. Exponential backoff timing
4. Maximum retry limits

Your task is to identify and fix the bugs in the retry logic to make the AI integration robust and production-ready.`,
    buggyCode: {
      typescript: `import OpenAI from 'openai';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIResponse {
  content: string;
  tokens: number;
  model: string;
}

class AIService {
  private client: OpenAI;
  private maxRetries = 3;
  private baseDelay = 1000; // ms

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  // BUG: Retry logic doesn't handle all error types correctly
  async chat(messages: ChatMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse> {
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        const response = await this.client.chat.completions.create({
          model: 'gpt-4',
          messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 1000,
        });

        return {
          content: response.choices[0].message.content,
          tokens: response.usage.total_tokens,
          model: response.model,
        };
      } catch (error: any) {
        retries++;

        // BUG 1: Only checks for 429, misses other retryable errors
        if (error.status === 429) {
          const delay = this.baseDelay * retries; // BUG 2: Linear backoff instead of exponential
          await this.sleep(delay);
          continue;
        }

        // BUG 3: Throws immediately on any other error, even retryable ones
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  // BUG: Doesn't handle stream interruptions or reconnection
  async chatStream(messages: ChatMessage[], onChunk: (text: string) => void): Promise<AIResponse> {
    const stream = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages,
      stream: true,
    });

    let fullContent = '';
    let totalTokens = 0;

    // BUG 4: No error handling for stream interruptions
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullContent += content;
      onChunk(content);
      totalTokens++; // BUG 5: Counting chunks as tokens (wrong metric)
    }

    return {
      content: fullContent,
      tokens: totalTokens,
      model: 'gpt-4',
    };
  }

  // BUG: Sleep doesn't handle edge cases
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AIService;`,
      python: `import openai
import time
from typing import List, Dict, Callable, Optional

class AIService:
    def __init__(self, api_key: str):
        openai.api_key = api_key
        self.max_retries = 3
        self.base_delay = 1.0  # seconds

    # BUG: Retry logic doesn't handle all error types correctly
    def chat(self, messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 1000) -> Dict:
        retries = 0

        while retries < self.max_retries:
            try:
                response = openai.ChatCompletion.create(
                    model="gpt-4",
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )

                return {
                    'content': response.choices[0].message.content,
                    'tokens': response.usage.total_tokens,
                    'model': response.model
                }
            except openai.error.RateLimitError as e:
                retries += 1
                # BUG 1: Linear backoff instead of exponential
                delay = self.base_delay * retries
                time.sleep(delay)
                continue
            except Exception as e:
                # BUG 2: Throws immediately on any error, even retryable ones
                raise e

        raise Exception('Max retries exceeded')

    # BUG: Doesn't handle stream interruptions
    def chat_stream(self, messages: List[Dict[str, str]], on_chunk: Callable[[str], None]) -> Dict:
        # BUG 3: No error handling for stream interruptions
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=messages,
            stream=True
        )

        full_content = ''
        total_tokens = 0

        for chunk in response:
            content = chunk.choices[0].delta.get('content', '')
            full_content += content
            on_chunk(content)
            total_tokens += 1  # BUG 4: Counting chunks as tokens

        return {
            'content': full_content,
            'tokens': total_tokens,
            'model': 'gpt-4'
        }`,
      javascript: `const OpenAI = require('openai');

class AIService {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
    this.maxRetries = 3;
    this.baseDelay = 1000; // ms
  }

  // BUG: Retry logic doesn't handle all error types correctly
  async chat(messages, options = {}) {
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        const response = await this.client.chat.completions.create({
          model: 'gpt-4',
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
        });

        return {
          content: response.choices[0].message.content,
          tokens: response.usage.total_tokens,
          model: response.model,
        };
      } catch (error) {
        retries++;

        // BUG 1: Only checks for 429, misses other retryable errors
        if (error.status === 429) {
          const delay = this.baseDelay * retries; // BUG 2: Linear backoff instead of exponential
          await this.sleep(delay);
          continue;
        }

        // BUG 3: Throws immediately on any other error
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  // BUG: Doesn't handle stream interruptions
  async chatStream(messages, onChunk) {
    const stream = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages,
      stream: true,
    });

    let fullContent = '';
    let totalTokens = 0;

    // BUG 4: No error handling for stream interruptions
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullContent += content;
      onChunk(content);
      totalTokens++; // BUG 5: Counting chunks as tokens
    }

    return {
      content: fullContent,
      tokens: totalTokens,
      model: 'gpt-4',
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AIService;`,
    },
    codebaseFiles: {
      typescript: [
        {
          fileName: "types.ts",
          content: `export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  tokens: number;
  model: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
}

// Error types from OpenAI API
export enum OpenAIErrorType {
  RATE_LIMIT = 'rate_limit_error',
  TIMEOUT = 'timeout_error',
  API_ERROR = 'api_error',
  INVALID_REQUEST = 'invalid_request_error',
  AUTH = 'authentication_error',
  CONNECTION = 'connection_error',
}`,
          description: "Type definitions for AI service",
        },
        {
          fileName: "test-cases.ts",
          content: `import AIService from './ai-service';

// Test cases to validate the fix
export const testCases = {
  // Should retry on rate limit errors
  rateLimitError: async (service: AIService) => {
    const messages = [{ role: 'user' as const, content: 'Hello' }];
    // Mock to throw rate limit error twice, then succeed
    return await service.chat(messages);
  },

  // Should handle timeout errors with retry
  timeoutError: async (service: AIService) => {
    const messages = [{ role: 'user' as const, content: 'Test' }];
    return await service.chat(messages);
  },

  // Should use exponential backoff
  exponentialBackoff: async (service: AIService) => {
    // Test that delays increase exponentially: 1s, 2s, 4s, 8s...
    const startTime = Date.now();
    try {
      await service.chat([{ role: 'user', content: 'Test' }]);
    } catch (e) {
      const elapsed = Date.now() - startTime;
      return elapsed > 7000; // Should have tried multiple times with backoff
    }
  },

  // Should handle stream interruptions
  streamInterruption: async (service: AIService) => {
    let chunks = [];
    await service.chatStream(
      [{ role: 'user', content: 'Tell me a story' }],
      (chunk) => chunks.push(chunk)
    );
    return chunks.length > 0;
  },
};`,
          description: "Test cases for AI service",
        },
        {
          fileName: "config.ts",
          content: `export const AI_CONFIG = {
  // Retryable HTTP status codes
  RETRYABLE_STATUS_CODES: [408, 429, 500, 502, 503, 504],

  // Retryable error types
  RETRYABLE_ERROR_TYPES: [
    'rate_limit_error',
    'timeout_error',
    'api_error',
    'connection_error',
  ],

  // Non-retryable error types (fail fast)
  NON_RETRYABLE_ERROR_TYPES: [
    'authentication_error',
    'invalid_request_error',
    'permission_error',
  ],

  // Retry configuration
  RETRY_CONFIG: {
    maxRetries: 5,
    baseDelay: 1000, // 1 second
    maxDelay: 60000, // 60 seconds
    exponentialBase: 2, // 2^n backoff
    jitterFactor: 0.1, // Add 10% random jitter
  },
};`,
          description: "Configuration constants",
        },
      ],
      python: [
        {
          fileName: "types.py",
          content: `from typing import TypedDict, Literal
from enum import Enum

class ChatMessage(TypedDict):
    role: Literal['user', 'assistant', 'system']
    content: str

class AIResponse(TypedDict):
    content: str
    tokens: int
    model: str

class OpenAIErrorType(Enum):
    RATE_LIMIT = 'rate_limit_error'
    TIMEOUT = 'timeout_error'
    API_ERROR = 'api_error'
    INVALID_REQUEST = 'invalid_request_error'
    AUTH = 'authentication_error'
    CONNECTION = 'connection_error'`,
          description: "Type definitions",
        },
        {
          fileName: "config.py",
          content: `# Configuration for AI service
AI_CONFIG = {
    'RETRYABLE_STATUS_CODES': [408, 429, 500, 502, 503, 504],
    'RETRYABLE_ERROR_TYPES': [
        'rate_limit_error',
        'timeout_error',
        'api_error',
        'connection_error',
    ],
    'NON_RETRYABLE_ERROR_TYPES': [
        'authentication_error',
        'invalid_request_error',
        'permission_error',
    ],
    'RETRY_CONFIG': {
        'max_retries': 5,
        'base_delay': 1.0,
        'max_delay': 60.0,
        'exponential_base': 2,
        'jitter_factor': 0.1,
    },
}`,
          description: "Configuration constants",
        },
      ],
      javascript: [
        {
          fileName: "config.js",
          content: `module.exports = {
  RETRYABLE_STATUS_CODES: [408, 429, 500, 502, 503, 504],

  RETRYABLE_ERROR_TYPES: [
    'rate_limit_error',
    'timeout_error',
    'api_error',
    'connection_error',
  ],

  NON_RETRYABLE_ERROR_TYPES: [
    'authentication_error',
    'invalid_request_error',
    'permission_error',
  ],

  RETRY_CONFIG: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 60000,
    exponentialBase: 2,
    jitterFactor: 0.1,
  },
};`,
          description: "Configuration constants",
        },
      ],
    },
    expectedBehavior:
      "The AI service should gracefully handle rate limits, timeouts, and transient API errors with exponential backoff retry logic. Stream interruptions should be caught and retried. Non-retryable errors like authentication failures should fail fast without retries.",
    bugDescription: `Multiple bugs in the retry logic:
1. Only retries on 429 errors, but should retry on other transient errors (500, 502, 503, 504, timeouts)
2. Uses linear backoff (delay * retries) instead of exponential backoff (baseDelay * 2^retries)
3. No jitter in retry delays, which can cause thundering herd problem
4. chatStream has no error handling - any network interruption crashes the stream
5. Incorrectly counts stream chunks as tokens instead of using actual token usage
6. No maximum delay cap - could wait indefinitely
7. Doesn't check for non-retryable errors (auth errors should fail fast)
8. No retry-after header handling for rate limits`,
    hints: [
      "Look at what error types should be retried vs. fail fast",
      "Exponential backoff formula: baseDelay * (2 ^ attemptNumber)",
      "Consider adding random jitter to prevent thundering herd",
      "Check if the API response includes retry-after headers",
      "Stream errors need try-catch and reconnection logic",
      "Token counting should use API usage data, not chunk count",
      "Some errors (auth, invalid request) should never be retried",
    ],
    testCases: [
      {
        input: "API returns 429 rate limit error",
        expected: "Should retry with exponential backoff and respect retry-after header",
        description: "Rate limit handling",
      },
      {
        input: "API returns 500 server error",
        expected: "Should retry with exponential backoff",
        description: "Server error handling",
      },
      {
        input: "API returns 401 auth error",
        expected: "Should fail immediately without retries",
        description: "Non-retryable error",
      },
      {
        input: "Stream interrupted mid-response",
        expected: "Should catch error and retry stream from beginning",
        description: "Stream interruption",
      },
      {
        input: "Multiple rapid requests",
        expected: "Should use jittered backoff to avoid thundering herd",
        description: "Concurrent retry behavior",
      },
    ],
  },
]
