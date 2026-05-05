import type { BugFixScenario } from "../types"

export const inferenceFeatureBugsScenarios: BugFixScenario[] = [
  {
    id: "bugfix-model-inference-memory-leak",
    title: "Model Inference Memory Leak",
    type: "bugfix",
    difficulty: "hard",
    companies: ["Google", "Amazon", "Meta", "Microsoft"],
    description: "Debug and fix a memory leak in a production ML inference service",
    tags: ["ai", "ml", "memory-leak", "tensorflow", "performance"],
    estimatedTime: 40,
    problemStatement: `A production machine learning inference service is experiencing memory leaks. The memory usage grows continuously over time until the service crashes. The issue is affecting the SLA as the service needs to be restarted frequently.

Your task is to identify and fix the memory leak in the inference code.`,
    buggyCode: {
      python: `import tensorflow as tf
import numpy as np
from flask import Flask, request, jsonify

app = Flask(__name__)

class ImageClassifier:
    def __init__(self, model_path):
        self.model = tf.keras.models.load_model(model_path)
        self.class_names = ['cat', 'dog', 'bird', 'fish']

    def preprocess_image(self, image_bytes):
        """Preprocess image for model input"""
        # Decode image
        image = tf.image.decode_jpeg(image_bytes, channels=3)

        # Resize to model input size
        image = tf.image.resize(image, [224, 224])

        # Normalize to [0, 1]
        image = image / 255.0

        # Add batch dimension
        image = tf.expand_dims(image, 0)

        return image

    def predict(self, image_bytes):
        """Run inference on image"""
        # Preprocess
        image_tensor = self.preprocess_image(image_bytes)

        # Run inference
        predictions = self.model(image_tensor, training=False)

        # Get top prediction
        class_idx = tf.argmax(predictions[0]).numpy()
        confidence = float(predictions[0][class_idx].numpy())

        return {
            'class': self.class_names[class_idx],
            'confidence': confidence
        }

# Initialize classifier
classifier = ImageClassifier('image_classifier.h5')

@app.route('/predict', methods=['POST'])
def predict():
    """API endpoint for image classification"""
    image_bytes = request.data
    result = classifier.predict(image_bytes)
    return jsonify(result)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)`,
      javascript: `const tf = require('@tensorflow/tfjs-node');
const express = require('express');
const multer = require('multer');

const app = express();
const upload = multer();

class ImageClassifier {
    constructor(modelPath) {
        this.modelPath = modelPath;
        this.model = null;
        this.classNames = ['cat', 'dog', 'bird', 'fish'];
    }

    async loadModel() {
        this.model = await tf.loadLayersModel(this.modelPath);
    }

    preprocessImage(imageBuffer) {
        // Decode image
        const imageTensor = tf.node.decodeImage(imageBuffer, 3);

        // Resize to model input size
        const resized = tf.image.resizeBilinear(imageTensor, [224, 224]);

        // Normalize to [0, 1]
        const normalized = resized.div(255.0);

        // Add batch dimension
        const batched = normalized.expandDims(0);

        return batched;
    }

    async predict(imageBuffer) {
        // Preprocess
        const imageTensor = this.preprocessImage(imageBuffer);

        // Run inference
        const predictions = await this.model.predict(imageTensor);

        // Get top prediction
        const predArray = await predictions.data();
        const classIdx = predArray.indexOf(Math.max(...predArray));
        const confidence = predArray[classIdx];

        return {
            class: this.classNames[classIdx],
            confidence: confidence
        };
    }
}

// Initialize classifier
const classifier = new ImageClassifier('file://./model/model.json');

app.post('/predict', upload.single('image'), async (req, res) => {
    try {
        const result = await classifier.predict(req.file.buffer);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

async function start() {
    await classifier.loadModel();
    app.listen(5000, () => {
        console.log('Server running on port 5000');
    });
}

start();`,
    },
    codebaseFiles: {
      python: [
        {
          fileName: "load_test.py",
          content: `import requests
import time

def load_test(num_requests=1000):
    """Simulate load on the inference service"""
    with open('test_image.jpg', 'rb') as f:
        image_bytes = f.read()

    for i in range(num_requests):
        response = requests.post('http://localhost:5000/predict', data=image_bytes)
        if i % 100 == 0:
            print(f"Request {i}: {response.json()}")

load_test()`,
          description: "Load testing script to reproduce memory leak",
        },
      ],
      javascript: [
        {
          fileName: "load_test.js",
          content: `const axios = require('axios');
const fs = require('fs');

async function loadTest(numRequests = 1000) {
    const imageBuffer = fs.readFileSync('test_image.jpg');

    for (let i = 0; i < numRequests; i++) {
        const formData = new FormData();
        formData.append('image', new Blob([imageBuffer]));

        const response = await axios.post('http://localhost:5000/predict', formData);

        if (i % 100 === 0) {
            console.log(\`Request \${i}: \${JSON.stringify(response.data)}\`);
        }
    }
}

loadTest();`,
          description: "Load testing script to reproduce memory leak",
        },
      ],
    },
    expectedBehavior:
      "The service should maintain constant memory usage over time by properly cleaning up TensorFlow tensors after each inference.",
    bugDescription:
      "The bug is a TensorFlow tensor memory leak. Intermediate tensors created during preprocessing (image, resized, normalized, batched) are not being disposed. In TensorFlow/TF.js, tensors must be explicitly disposed or managed with tf.tidy() to free GPU/CPU memory. Without cleanup, each inference accumulates tensors in memory.",
    hints: [
      "TensorFlow tensors need to be explicitly cleaned up",
      "Look at all the intermediate tensors created during preprocessing",
      "In Python, consider using context managers or explicit tensor cleanup",
      "In JavaScript, use tensor.dispose() or tf.tidy() to manage tensor memory",
      "The memory leak happens on every prediction request",
    ],
    testCases: [
      {
        input: "1000 sequential prediction requests",
        expected: "Memory usage should remain constant",
        description: "Memory leak test",
      },
      {
        input: "Monitor memory over time",
        expected: "No continuous memory growth",
        description: "Long-running stability test",
      },
    ],
  },
  {
    id: "bugfix-feature-engineering-nan",
    title: "Feature Engineering NaN Handling",
    type: "bugfix",
    difficulty: "easy",
    companies: ["Amazon", "Airbnb", "Shopify", "Walmart"],
    description: "Fix NaN propagation bug in feature engineering pipeline",
    tags: ["ai", "ml", "data-processing", "pandas", "debugging"],
    estimatedTime: 25,
    problemStatement: `A feature engineering pipeline is producing NaN values that propagate through the entire dataset, causing model training to fail. The issue occurs when calculating derived features from raw data.

Your task is to identify why NaN values are being produced and fix the feature engineering code.`,
    buggyCode: {
      python: `import pandas as pd
import numpy as np

class FeatureEngineer:
    def __init__(self):
        self.feature_names = []

    def engineer_features(self, df):
        """Create derived features from raw data"""
        result = df.copy()

        # Feature 1: Age group
        result['age_group'] = pd.cut(df['age'], bins=[0, 18, 30, 50, 100],
                                      labels=['minor', 'young', 'middle', 'senior'])

        # Feature 2: Income per year of age (income efficiency)
        result['income_per_age'] = df['income'] / df['age']

        # Feature 3: Debt to income ratio
        result['debt_to_income'] = df['debt'] / df['income']

        # Feature 4: Log of income (for normalization)
        result['log_income'] = np.log(df['income'])

        # Feature 5: Credit utilization (debt / credit_limit)
        result['credit_utilization'] = df['debt'] / df['credit_limit']

        # Feature 6: Savings rate
        result['savings_rate'] = (df['income'] - df['expenses']) / df['income']

        self.feature_names = result.columns.tolist()
        return result

    def validate_features(self, df):
        """Check for invalid values in features"""
        nan_counts = df.isna().sum()
        inf_counts = np.isinf(df.select_dtypes(include=[np.number])).sum()

        print("NaN counts per column:")
        print(nan_counts[nan_counts > 0])
        print("\\nInf counts per column:")
        print(inf_counts[inf_counts > 0])

        return df

# Test data
data = pd.DataFrame({
    'age': [25, 30, 0, 45, 35, 28],
    'income': [50000, 75000, 0, 90000, 60000, 55000],
    'debt': [5000, 10000, 0, 15000, 8000, 6000],
    'credit_limit': [10000, 20000, 0, 30000, 15000, 12000],
    'expenses': [40000, 60000, 500, 70000, 50000, 45000]
})

engineer = FeatureEngineer()
features = engineer.engineer_features(data)
engineer.validate_features(features)

print("\\nFeature summary:")
print(features.describe())`,
      javascript: `class FeatureEngineer {
    constructor() {
        this.featureNames = [];
    }

    engineerFeatures(data) {
        const result = data.map(row => ({ ...row }));

        for (let i = 0; i < result.length; i++) {
            const row = result[i];

            // Feature 1: Age group
            if (row.age < 18) row.age_group = 'minor';
            else if (row.age < 30) row.age_group = 'young';
            else if (row.age < 50) row.age_group = 'middle';
            else row.age_group = 'senior';

            // Feature 2: Income per year of age
            row.income_per_age = row.income / row.age;

            // Feature 3: Debt to income ratio
            row.debt_to_income = row.debt / row.income;

            // Feature 4: Log of income
            row.log_income = Math.log(row.income);

            // Feature 5: Credit utilization
            row.credit_utilization = row.debt / row.credit_limit;

            // Feature 6: Savings rate
            row.savings_rate = (row.income - row.expenses) / row.income;
        }

        return result;
    }

    validateFeatures(data) {
        const nanCounts = {};
        const infCounts = {};

        for (const row of data) {
            for (const [key, value] of Object.entries(row)) {
                if (typeof value === 'number') {
                    if (isNaN(value)) {
                        nanCounts[key] = (nanCounts[key] || 0) + 1;
                    }
                    if (!isFinite(value)) {
                        infCounts[key] = (infCounts[key] || 0) + 1;
                    }
                }
            }
        }

        console.log('NaN counts per column:');
        console.log(nanCounts);
        console.log('\\nInf counts per column:');
        console.log(infCounts);

        return data;
    }
}

// Test data
const data = [
    { age: 25, income: 50000, debt: 5000, credit_limit: 10000, expenses: 40000 },
    { age: 30, income: 75000, debt: 10000, credit_limit: 20000, expenses: 60000 },
    { age: 0, income: 0, debt: 0, credit_limit: 0, expenses: 500 },
    { age: 45, income: 90000, debt: 15000, credit_limit: 30000, expenses: 70000 },
    { age: 35, income: 60000, debt: 8000, credit_limit: 15000, expenses: 50000 },
    { age: 28, income: 55000, debt: 6000, credit_limit: 12000, expenses: 45000 }
];

const engineer = new FeatureEngineer();
const features = engineer.engineerFeatures(data);
engineer.validateFeatures(features);

console.log('\\nSample features:');
console.log(features[0]);`,
    },
    codebaseFiles: {
      python: [
        {
          fileName: "constants.py",
          content: `# Constants for feature engineering
MIN_AGE = 1
MIN_INCOME = 1
MIN_CREDIT_LIMIT = 1

# Default fill values for missing data
DEFAULT_FILL_VALUES = {
    'age': 30,
    'income': 50000,
    'debt': 0,
    'credit_limit': 10000,
    'expenses': 30000
}`,
          description: "Constants and default values",
        },
      ],
      javascript: [
        {
          fileName: "constants.js",
          content: `// Constants for feature engineering
const MIN_AGE = 1;
const MIN_INCOME = 1;
const MIN_CREDIT_LIMIT = 1;

// Default fill values for missing data
const DEFAULT_FILL_VALUES = {
    age: 30,
    income: 50000,
    debt: 0,
    credit_limit: 10000,
    expenses: 30000
};

module.exports = { MIN_AGE, MIN_INCOME, MIN_CREDIT_LIMIT, DEFAULT_FILL_VALUES };`,
          description: "Constants and default values",
        },
      ],
    },
    expectedBehavior:
      "Feature engineering should handle edge cases like division by zero and log of zero/negative numbers by either filtering invalid rows, imputing values, or using safe operations.",
    bugDescription:
      "Multiple bugs causing NaN/Inf values: 1) Division by zero when age/income/credit_limit is 0, 2) Log of zero or negative income, 3) No validation or handling of edge cases in input data. The fix requires adding proper validation, handling edge cases (zero values), and either filtering invalid data or using safe mathematical operations (e.g., np.log1p, adding epsilon to denominators).",
    hints: [
      "What happens when you divide by zero?",
      "What happens when you take log of zero or negative numbers?",
      "Look at the test data - are there any invalid values?",
      "Consider adding validation for input data before feature engineering",
      "You can either filter out invalid rows or handle them gracefully",
      "Use np.log1p() instead of np.log() for more robust log transformation",
    ],
    testCases: [
      {
        input: "Data with age=0, income=0, credit_limit=0",
        expected: "Should handle gracefully without producing NaN/Inf",
        description: "Edge case handling",
      },
      {
        input: "Normal data",
        expected: "Should produce valid features",
        description: "Normal case",
      },
    ],
  },
]
