import type { BugFixScenario } from "../types"

export const mlDataBugsScenarios: BugFixScenario[] = [
  {
    id: "bugfix-ml-prediction-pipeline",
    title: "ML Model Prediction Pipeline Bug",
    type: "bugfix",
    difficulty: "medium",
    companies: ["Google", "Meta", "Amazon", "Netflix"],
    description: "Debug a machine learning prediction pipeline that returns incorrect predictions",
    tags: ["ai", "ml", "debugging", "tensorflow", "numpy"],
    estimatedTime: 35,
    problemStatement: `A machine learning prediction service is deployed, but users are reporting that predictions are wildly incorrect. The model was trained and validated with good accuracy, but something is wrong in the production prediction pipeline.

Your task is to identify and fix the bug causing incorrect predictions.`,
    buggyCode: {
      python: `import numpy as np
import tensorflow as tf

class ModelPredictor:
    def __init__(self, model_path):
        self.model = tf.keras.models.load_model(model_path)
        self.feature_names = ['age', 'income', 'credit_score', 'loan_amount']

    def preprocess(self, raw_data):
        """Preprocess raw input data for model prediction"""
        # Extract features in order
        features = []
        for name in self.feature_names:
            features.append(raw_data[name])

        # Convert to numpy array
        X = np.array([features])

        # Normalize features (min-max scaling)
        X_normalized = (X - X.min()) / (X.max() - X.min())

        return X_normalized

    def predict(self, raw_data):
        """Make prediction on raw input data"""
        X = self.preprocess(raw_data)
        prediction = self.model.predict(X)
        return prediction[0][0]

# Example usage
predictor = ModelPredictor('loan_approval_model.h5')

# Test case 1: Should predict ~0.85 (high approval probability)
test_input_1 = {
    'age': 35,
    'income': 75000,
    'credit_score': 750,
    'loan_amount': 20000
}
print(f"Prediction 1: {predictor.predict(test_input_1)}")

# Test case 2: Should predict ~0.15 (low approval probability)
test_input_2 = {
    'age': 22,
    'income': 25000,
    'credit_score': 550,
    'loan_amount': 50000
}
print(f"Prediction 2: {predictor.predict(test_input_2)}")`,
      javascript: `const tf = require('@tensorflow/tfjs-node');

class ModelPredictor {
    constructor(modelPath) {
        this.modelPath = modelPath;
        this.model = null;
        this.featureNames = ['age', 'income', 'credit_score', 'loan_amount'];
    }

    async loadModel() {
        this.model = await tf.loadLayersModel(this.modelPath);
    }

    preprocess(rawData) {
        // Extract features in order
        const features = this.featureNames.map(name => rawData[name]);

        // Convert to tensor
        const X = tf.tensor2d([features]);

        // Normalize features (min-max scaling)
        const min = X.min();
        const max = X.max();
        const XNormalized = X.sub(min).div(max.sub(min));

        return XNormalized;
    }

    async predict(rawData) {
        const X = this.preprocess(rawData);
        const prediction = await this.model.predict(X);
        const result = prediction.dataSync()[0];

        // Clean up tensors
        X.dispose();
        prediction.dispose();

        return result;
    }
}

// Example usage
async function main() {
    const predictor = new ModelPredictor('file://./loan_approval_model/model.json');
    await predictor.loadModel();

    // Test case 1: Should predict ~0.85 (high approval probability)
    const testInput1 = {
        age: 35,
        income: 75000,
        credit_score: 750,
        loan_amount: 20000
    };
    console.log(\`Prediction 1: \${await predictor.predict(testInput1)}\`);

    // Test case 2: Should predict ~0.15 (low approval probability)
    const testInput2 = {
        age: 22,
        income: 25000,
        credit_score: 550,
        loan_amount: 50000
    };
    console.log(\`Prediction 2: \${await predictor.predict(testInput2)}\`);
}

main();`,
    },
    codebaseFiles: {
      python: [
        {
          fileName: "training_pipeline.py",
          content: `import numpy as np
from sklearn.preprocessing import StandardScaler
import tensorflow as tf

# Training pipeline showing how data was preprocessed during training
def train_model(X_train, y_train):
    # Feature names
    feature_names = ['age', 'income', 'credit_score', 'loan_amount']

    # Normalize using StandardScaler (z-score normalization)
    scaler = StandardScaler()
    X_train_normalized = scaler.fit_transform(X_train)

    # Build model
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=(4,)),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])

    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    model.fit(X_train_normalized, y_train, epochs=50, batch_size=32)

    return model, scaler

# Training statistics
print("Training data statistics:")
print("Mean: age=38.5, income=55000, credit_score=680, loan_amount=30000")
print("Std: age=12.3, income=25000, credit_score=85, loan_amount=15000")`,
          description: "Training pipeline showing preprocessing method used",
        },
      ],
      javascript: [
        {
          fileName: "training_pipeline.js",
          content: `const tf = require('@tensorflow/tfjs-node');

// Training pipeline showing how data was preprocessed during training
async function trainModel(XTrain, yTrain) {
    // Feature names
    const featureNames = ['age', 'income', 'credit_score', 'loan_amount'];

    // Calculate mean and std for StandardScaler (z-score normalization)
    const mean = XTrain.mean(0);
    const std = XTrain.sub(mean).square().mean(0).sqrt();

    // Normalize using StandardScaler
    const XTrainNormalized = XTrain.sub(mean).div(std);

    // Build model
    const model = tf.sequential({
        layers: [
            tf.layers.dense({ units: 64, activation: 'relu', inputShape: [4] }),
            tf.layers.dense({ units: 32, activation: 'relu' }),
            tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
    });

    model.compile({ optimizer: 'adam', loss: 'binaryCrossentropy', metrics: ['accuracy'] });
    await model.fit(XTrainNormalized, yTrain, { epochs: 50, batchSize: 32 });

    return { model, mean, std };
}

// Training statistics
console.log("Training data statistics:");
console.log("Mean: age=38.5, income=55000, credit_score=680, loan_amount=30000");
console.log("Std: age=12.3, income=25000, credit_score=85, loan_amount=15000");`,
          description: "Training pipeline showing preprocessing method used",
        },
      ],
    },
    expectedBehavior:
      "The predictor should use the same normalization method (StandardScaler with training statistics) as was used during training to get accurate predictions.",
    bugDescription:
      "The bug is in the preprocessing step: the code uses min-max normalization on individual samples, but the model was trained using StandardScaler (z-score normalization) on the entire training dataset. This mismatch causes predictions to be incorrect because the model receives inputs in a completely different scale than what it was trained on.",
    hints: [
      "Compare the preprocessing in the prediction pipeline with the training pipeline",
      "What normalization method was used during training?",
      "Min-max normalization on a single sample will give different results than on a dataset",
      "You need to store and reuse the training statistics (mean and std) for consistent normalization",
      "StandardScaler uses (x - mean) / std, not (x - min) / (max - min)",
    ],
    testCases: [
      {
        input: { age: 35, income: 75000, credit_score: 750, loan_amount: 20000 },
        expected: "Should return ~0.85 (high approval probability)",
        description: "High quality applicant",
      },
      {
        input: { age: 22, income: 25000, credit_score: 550, loan_amount: 50000 },
        expected: "Should return ~0.15 (low approval probability)",
        description: "Low quality applicant",
      },
    ],
  },
  {
    id: "bugfix-data-preprocessing-race",
    title: "Data Preprocessing Race Condition",
    type: "bugfix",
    difficulty: "hard",
    companies: ["Google", "Meta", "Netflix", "Amazon"],
    description: "Fix a race condition in parallel data preprocessing for ML training",
    tags: ["ai", "ml", "concurrency", "debugging", "multithreading"],
    estimatedTime: 40,
    problemStatement: `A data preprocessing pipeline for training machine learning models is producing corrupted data batches intermittently. The issue only occurs when processing data in parallel, and it's causing training to fail randomly with NaN losses.

Your task is to identify and fix the race condition in the data preprocessing pipeline.`,
    buggyCode: {
      python: `import numpy as np
from concurrent.futures import ThreadPoolExecutor
import time

class DataPreprocessor:
    def __init__(self):
        self.scaler_mean = None
        self.scaler_std = None
        self.total_samples = 0

    def fit_scaler(self, data):
        """Fit the scaler on training data"""
        self.scaler_mean = np.mean(data, axis=0)
        self.scaler_std = np.std(data, axis=0)

    def normalize(self, data):
        """Normalize data using fitted scaler"""
        if self.scaler_mean is None:
            raise ValueError("Scaler not fitted")
        return (data - self.scaler_mean) / (self.scaler_std + 1e-8)

    def augment(self, sample):
        """Apply data augmentation (add random noise)"""
        noise = np.random.normal(0, 0.1, size=sample.shape)
        return sample + noise

    def process_batch(self, batch):
        """Process a batch of data with augmentation and normalization"""
        # Apply augmentation
        augmented = np.array([self.augment(sample) for sample in batch])

        # Normalize
        normalized = self.normalize(augmented)

        # Update count
        self.total_samples += len(batch)

        return normalized

    def process_dataset_parallel(self, data, batch_size=32, num_workers=4):
        """Process entire dataset in parallel"""
        # First fit the scaler
        self.fit_scaler(data)
        self.total_samples = 0

        # Split data into batches
        batches = [data[i:i+batch_size] for i in range(0, len(data), batch_size)]

        # Process batches in parallel
        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            processed_batches = list(executor.map(self.process_batch, batches))

        # Concatenate results
        result = np.concatenate(processed_batches, axis=0)

        return result, self.total_samples

# Test the preprocessor
np.random.seed(42)
data = np.random.randn(1000, 10)  # 1000 samples, 10 features

preprocessor = DataPreprocessor()
processed_data, count = preprocessor.process_dataset_parallel(data, batch_size=32, num_workers=4)

print(f"Processed {count} samples")
print(f"Expected: 1000 samples")
print(f"Data shape: {processed_data.shape}")
print(f"Contains NaN: {np.isnan(processed_data).any()}")`,
      javascript: `class DataPreprocessor {
    constructor() {
        this.scalerMean = null;
        this.scalerStd = null;
        this.totalSamples = 0;
    }

    fitScaler(data) {
        // Calculate mean and std
        const sum = data.reduce((acc, row) =>
            row.map((val, i) => (acc[i] || 0) + val), []);
        this.scalerMean = sum.map(s => s / data.length);

        const sqDiff = data.map(row =>
            row.map((val, i) => Math.pow(val - this.scalerMean[i], 2)));
        const variance = sqDiff.reduce((acc, row) =>
            row.map((val, i) => (acc[i] || 0) + val), [])
            .map(s => s / data.length);
        this.scalerStd = variance.map(Math.sqrt);
    }

    normalize(data) {
        if (!this.scalerMean) {
            throw new Error('Scaler not fitted');
        }
        return data.map(row =>
            row.map((val, i) => (val - this.scalerMean[i]) / (this.scalerStd[i] + 1e-8))
        );
    }

    augment(sample) {
        // Add random noise
        return sample.map(val => val + (Math.random() - 0.5) * 0.2);
    }

    processBatch(batch) {
        // Apply augmentation
        const augmented = batch.map(sample => this.augment(sample));

        // Normalize
        const normalized = this.normalize(augmented);

        // Update count
        this.totalSamples += batch.length;

        return normalized;
    }

    async processDatasetParallel(data, batchSize = 32) {
        // First fit the scaler
        this.fitScaler(data);
        this.totalSamples = 0;

        // Split data into batches
        const batches = [];
        for (let i = 0; i < data.length; i += batchSize) {
            batches.push(data.slice(i, i + batchSize));
        }

        // Process batches in parallel
        const processedBatches = await Promise.all(
            batches.map(batch => Promise.resolve(this.processBatch(batch)))
        );

        // Concatenate results
        const result = processedBatches.flat();

        return { data: result, count: this.totalSamples };
    }
}

// Test the preprocessor
function generateData(samples, features) {
    return Array.from({ length: samples }, () =>
        Array.from({ length: features }, () => Math.random() * 2 - 1)
    );
}

async function test() {
    const data = generateData(1000, 10);

    const preprocessor = new DataPreprocessor();
    const { data: processedData, count } = await preprocessor.processDatasetParallel(data, 32);

    console.log(\`Processed \${count} samples\`);
    console.log(\`Expected: 1000 samples\`);
    console.log(\`Data length: \${processedData.length}\`);
}

test();`,
    },
    codebaseFiles: {
      python: [
        {
          fileName: "utils.py",
          content: `import threading

class ThreadSafeCounter:
    """Thread-safe counter implementation"""
    def __init__(self):
        self.value = 0
        self.lock = threading.Lock()

    def increment(self, amount=1):
        with self.lock:
            self.value += amount

    def get(self):
        with self.lock:
            return self.value`,
          description: "Thread-safe counter utility",
        },
      ],
      javascript: [
        {
          fileName: "utils.js",
          content: `class ThreadSafeCounter {
    constructor() {
        this.value = 0;
        this.lock = Promise.resolve();
    }

    async increment(amount = 1) {
        // Queue the increment operation
        this.lock = this.lock.then(async () => {
            this.value += amount;
        });
        await this.lock;
    }

    getValue() {
        return this.value;
    }
}

module.exports = { ThreadSafeCounter };`,
          description: "Thread-safe counter utility",
        },
      ],
    },
    expectedBehavior:
      "The preprocessor should correctly count all samples and avoid race conditions when updating shared state (total_samples) from multiple threads.",
    bugDescription:
      "The bug is a race condition on self.total_samples. Multiple threads are reading and writing to this shared variable without synchronization, causing incorrect counts and potential data corruption. The fix is to use thread-safe operations (locks, atomic operations, or avoiding shared mutable state altogether).",
    hints: [
      "Multiple threads are modifying self.total_samples simultaneously",
      "Look at what state is shared between threads",
      "Consider using locks or atomic operations for thread-safe updates",
      "Alternatively, collect counts from each batch and sum them afterwards",
      "The utils.py file provides a ThreadSafeCounter class that might be useful",
    ],
    testCases: [
      {
        input: "1000 samples processed in parallel",
        expected: "Should count exactly 1000 samples, no race condition",
        description: "Parallel processing test",
      },
      {
        input: "Run multiple times",
        expected: "Should produce consistent results across runs",
        description: "Consistency test",
      },
    ],
  },
]
