import type { BugFixScenario } from "../types"

export const arrayNullBugsScenarios: BugFixScenario[] = [
  {
    id: "bugfix-off-by-one-array",
    title: "Fix Off-By-One Error in Data Processor",
    type: "bugfix",
    difficulty: "easy",
    companies: ["Generic", "Amazon", "Microsoft"],
    description:
      "Fix an off-by-one error in a data processing pipeline causing array index out of bounds",
    tags: ["arrays", "loops", "debugging", "data-processing"],
    estimatedTime: 15,
    problemStatement: `A data processing system is crashing when trying to compare adjacent data points for trend analysis. The system processes sensor readings and needs to identify sudden changes between consecutive measurements. Debug the issue across the data processor and validator modules.`,
    buggyCode: {
      javascript: `// dataProcessor.js - Main file with the bug
function processAdjacentPairs(readings) {
  const changes = [];
  // BUG: Off-by-one error in loop condition
  for (let i = 0; i <= readings.length; i++) {
    const current = readings[i];
    const next = readings[i + 1];
    const change = calculateChange(current, next);
    changes.push(change);
  }
  return changes;
}`,
      typescript: `// dataProcessor.ts - Main file with the bug
function processAdjacentPairs(readings: number[]): number[] {
  const changes: number[] = [];
  // BUG: Off-by-one error in loop condition
  for (let i = 0; i <= readings.length; i++) {
    const current = readings[i];
    const next = readings[i + 1];
    const change = calculateChange(current, next);
    changes.push(change);
  }
  return changes;
}`,
      python: `# data_processor.py - Main file with the bug
def process_adjacent_pairs(readings):
    changes = []
    # BUG: Off-by-one error in loop condition
    for i in range(len(readings) + 1):
        current = readings[i]
        next_reading = readings[i + 1]
        change = calculate_change(current, next_reading)
        changes.append(change)
    return changes`,
      java: `// DataProcessor.java - Main file with the bug
import java.util.ArrayList;
import java.util.List;

public class DataProcessor {
    // BUG: Off-by-one error in loop condition
    public static List<Double> processAdjacentPairs(double[] readings) {
        List<Double> changes = new ArrayList<>();
        for (int i = 0; i <= readings.length; i++) {
            double current = readings[i];
            double next = readings[i + 1];
            double change = Calculator.calculateChange(current, next);
            changes.add(change);
        }
        return changes;
    }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "utils/calculator.js",
          content: `// Utility functions for change calculation
export function calculateChange(current, next) {
  if (current === undefined || next === undefined) {
    throw new Error('Invalid readings: undefined values');
  }
  return ((next - current) / current) * 100;
}

export function isSignificantChange(change, threshold = 10) {
  return Math.abs(change) > threshold;
}`,
          description: "Utility functions that expect valid data",
        },
        {
          fileName: "validators/dataValidator.js",
          content: `// Data validation module
export function validateReadings(readings) {
  if (!Array.isArray(readings)) {
    throw new Error('Readings must be an array');
  }
  if (readings.length < 2) {
    throw new Error('Need at least 2 readings for comparison');
  }
  if (readings.some(r => typeof r !== 'number')) {
    throw new Error('All readings must be numbers');
  }
  return true;
}`,
          description: "Validates input data before processing",
        },
        {
          fileName: "index.js",
          content: `// Main entry point
import { validateReadings } from './validators/dataValidator.js';
import { processAdjacentPairs } from './dataProcessor.js';
import { isSignificantChange } from './utils/calculator.js';

export function analyzeTrends(sensorData) {
  validateReadings(sensorData);
  const changes = processAdjacentPairs(sensorData);
  const significantChanges = changes.filter(c => isSignificantChange(c));
  return {
    allChanges: changes,
    significantChanges,
    trendStrength: significantChanges.length / changes.length
  };
}`,
          description: "Main module that coordinates the processing",
        },
      ],
      python: [
        {
          fileName: "utils/calculator.py",
          content: `# Utility functions for change calculation
def calculate_change(current, next_reading):
    """Calculate percentage change between two readings"""
    if current is None or next_reading is None:
        raise ValueError('Invalid readings: None values')
    if current == 0:
        return float('inf') if next_reading != 0 else 0
    return ((next_reading - current) / current) * 100

def is_significant_change(change, threshold=10):
    """Check if change exceeds threshold"""
    return abs(change) > threshold`,
          description: "Utility functions that expect valid data",
        },
        {
          fileName: "validators/data_validator.py",
          content: `# Data validation module
def validate_readings(readings):
    """Validate sensor readings before processing"""
    if not isinstance(readings, list):
        raise TypeError('Readings must be a list')
    if len(readings) < 2:
        raise ValueError('Need at least 2 readings for comparison')
    if not all(isinstance(r, (int, float)) for r in readings):
        raise TypeError('All readings must be numbers')
    return True`,
          description: "Validates input data before processing",
        },
        {
          fileName: "main.py",
          content: `# Main entry point
from validators.data_validator import validate_readings
from data_processor import process_adjacent_pairs
from utils.calculator import is_significant_change

def analyze_trends(sensor_data):
    """Analyze trends in sensor data"""
    validate_readings(sensor_data)
    changes = process_adjacent_pairs(sensor_data)
    significant_changes = [c for c in changes if is_significant_change(c)]
    return {
        'all_changes': changes,
        'significant_changes': significant_changes,
        'trend_strength': len(significant_changes) / len(changes) if changes else 0
    }`,
          description: "Main module that coordinates the processing",
        },
      ],
      java: [
        {
          fileName: "utils/Calculator.java",
          content: `// Utility functions for change calculation
package utils;

public class Calculator {
    public static double calculateChange(double current, double next) {
        if (Double.isNaN(current) || Double.isNaN(next)) {
            throw new IllegalArgumentException("Invalid readings: NaN values");
        }
        if (current == 0) {
            return next == 0 ? 0 : Double.POSITIVE_INFINITY;
        }
        return ((next - current) / current) * 100;
    }

    public static boolean isSignificantChange(double change, double threshold) {
        return Math.abs(change) > threshold;
    }

    public static boolean isSignificantChange(double change) {
        return isSignificantChange(change, 10.0);
    }
}`,
          description: "Utility functions that expect valid data",
        },
        {
          fileName: "validators/DataValidator.java",
          content: `// Data validation module
package validators;

public class DataValidator {
    public static boolean validateReadings(double[] readings) {
        if (readings == null) {
            throw new IllegalArgumentException("Readings must not be null");
        }
        if (readings.length < 2) {
            throw new IllegalArgumentException("Need at least 2 readings for comparison");
        }
        for (double reading : readings) {
            if (Double.isNaN(reading)) {
                throw new IllegalArgumentException("All readings must be valid numbers");
            }
        }
        return true;
    }
}`,
          description: "Validates input data before processing",
        },
        {
          fileName: "TrendAnalyzer.java",
          content: `// Main entry point
import validators.DataValidator;
import utils.Calculator;
import java.util.List;
import java.util.stream.Collectors;

public class TrendAnalyzer {
    public static class TrendResult {
        public List<Double> allChanges;
        public List<Double> significantChanges;
        public double trendStrength;

        public TrendResult(List<Double> allChanges, List<Double> significantChanges, double trendStrength) {
            this.allChanges = allChanges;
            this.significantChanges = significantChanges;
            this.trendStrength = trendStrength;
        }
    }

    public static TrendResult analyzeTrends(double[] sensorData) {
        DataValidator.validateReadings(sensorData);
        List<Double> changes = DataProcessor.processAdjacentPairs(sensorData);
        List<Double> significantChanges = changes.stream()
            .filter(Calculator::isSignificantChange)
            .collect(Collectors.toList());
        double trendStrength = changes.isEmpty() ? 0.0 : (double) significantChanges.size() / changes.size();
        return new TrendResult(changes, significantChanges, trendStrength);
    }
}`,
          description: "Main module that coordinates the processing",
        },
      ],
    },
    expectedBehavior:
      "Should process all adjacent pairs without index errors and return correct change calculations",
    bugDescription:
      "Off-by-one error in loop condition causes array index out of bounds when accessing readings[i] and readings[i+1]",
    hints: [
      "The loop condition allows i to go beyond valid array indices",
      "Think about what happens when i equals readings.length",
      "For n elements, there are only n-1 adjacent pairs",
      "The loop should stop before readings.length, not at or after it",
    ],
    testCases: [
      {
        input: { readings: [100, 110, 105, 120] },
        expected: [10, -4.55, 14.29],
        description: "Normal sensor readings with 3 adjacent pairs",
      },
      {
        input: { readings: [50, 50] },
        expected: [0],
        description: "Minimal case: 2 readings, 1 pair",
      },
      {
        input: { readings: [10, 20, 30, 40, 50] },
        expected: [100, 50, 33.33, 25],
        description: "Multiple readings showing increasing trend",
      },
    ],
  },
  {
    id: "bugfix-null-check",
    title: "Fix Null Reference Error in User Service",
    type: "bugfix",
    difficulty: "easy",
    companies: ["Generic", "Startup", "Amazon"],
    description:
      "Add proper null/undefined checks in a user management service to prevent runtime crashes",
    tags: ["null-safety", "error-handling", "defensive-programming", "api"],
    estimatedTime: 15,
    problemStatement: `A user management API is crashing with null reference errors when trying to format user data for email notifications. The service needs to handle cases where user data might be incomplete or null. Debug and fix the null safety issues across the user service modules.`,
    buggyCode: {
      javascript: `// userService.js - Main file with null reference bugs
function getUserEmailFormatted(user) {
  // BUG: No null check on user
  // BUG: No check if email exists
  return user.email.toLowerCase().trim();
}

function getUserDisplayName(user) {
  // BUG: Assumes user and name always exist
  return user.firstName + ' ' + user.lastName;
}`,
      typescript: `// userService.ts - Main file with null reference bugs
function getUserEmailFormatted(user: any): string {
  // BUG: No null check on user
  // BUG: No check if email exists
  return user.email.toLowerCase().trim();
}

function getUserDisplayName(user: any): string {
  // BUG: Assumes user and name always exist
  return user.firstName + ' ' + user.lastName;
}`,
      python: `# user_service.py - Main file with null reference bugs
def get_user_email_formatted(user):
    # BUG: No null check on user
    # BUG: No check if email exists
    return user['email'].lower().strip()

def get_user_display_name(user):
    # BUG: Assumes user and name always exist
    return f"{user['firstName']} {user['lastName']}"`,
      java: `// UserService.java - Main file with null reference bugs
public class UserService {
    // BUG: No null check on user
    // BUG: No check if email exists
    public static String getUserEmailFormatted(User user) {
        return user.getEmail().toLowerCase().trim();
    }

    // BUG: Assumes user and name always exist
    public static String getUserDisplayName(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "models/User.js",
          content: `// User model definition
export class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.email = data.email || null;
    this.firstName = data.firstName || null;
    this.lastName = data.lastName || null;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
  }
}

// NOTE: Users from external APIs might have missing fields
// or might be null/undefined entirely`,
          description: "User model that can have null/undefined fields",
        },
        {
          fileName: "services/emailService.js",
          content: `// Email service that uses user data
import { getUserEmailFormatted, getUserDisplayName } from './userService.js';

export function sendWelcomeEmail(user) {
  // This will crash if user data is incomplete
  const email = getUserEmailFormatted(user);
  const name = getUserDisplayName(user);

  console.log(\`Sending welcome email to \${email} for \${name}\`);
  // Email sending logic...
  return { success: true, recipient: email };
}

export function sendBulkEmails(users) {
  // Bulk processing - should handle invalid users gracefully
  const results = users.map(user => {
    try {
      return sendWelcomeEmail(user);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  return results;
}`,
          description: "Email service that depends on user service functions",
        },
        {
          fileName: "api/userController.js",
          content: `// API controller
import { User } from '../models/User.js';
import { sendWelcomeEmail } from '../services/emailService.js';

export async function registerUser(req, res) {
  const userData = req.body;
  const user = new User(userData);

  try {
    // User data from API might be incomplete
    const emailResult = sendWelcomeEmail(user);
    res.json({ success: true, ...emailResult });
  } catch (error) {
    // Currently crashes with null reference errors
    res.status(500).json({ error: 'Failed to process user registration' });
  }
}`,
          description: "API controller that registers users and sends emails",
        },
      ],
      python: [
        {
          fileName: "models/user.py",
          content: `# User model definition
class User:
    def __init__(self, data=None):
        data = data or {}
        self.id = data.get('id')
        self.email = data.get('email')
        self.first_name = data.get('firstName')
        self.last_name = data.get('lastName')
        self.is_active = data.get('isActive', True)

# NOTE: Users from external APIs might have missing fields
# or might be None entirely`,
          description: "User model that can have None fields",
        },
        {
          fileName: "services/email_service.py",
          content: `# Email service that uses user data
from user_service import get_user_email_formatted, get_user_display_name

def send_welcome_email(user):
    """Send welcome email to user"""
    # This will crash if user data is incomplete
    email = get_user_email_formatted(user)
    name = get_user_display_name(user)

    print(f'Sending welcome email to {email} for {name}')
    # Email sending logic...
    return {'success': True, 'recipient': email}

def send_bulk_emails(users):
    """Send emails to multiple users"""
    results = []
    for user in users:
        try:
            result = send_welcome_email(user)
            results.append(result)
        except Exception as e:
            results.append({'success': False, 'error': str(e)})
    return results`,
          description: "Email service that depends on user service functions",
        },
        {
          fileName: "api/user_controller.py",
          content: `# API controller
from models.user import User
from services.email_service import send_welcome_email

def register_user(request_data):
    """Register a new user"""
    user_data = request_data.get('body', {})
    user = User(user_data)

    try:
        # User data from API might be incomplete
        email_result = send_welcome_email(user)
        return {'success': True, **email_result}
    except Exception as error:
        # Currently crashes with None/AttributeError
        return {'error': 'Failed to process user registration'}, 500`,
          description: "API controller that registers users and sends emails",
        },
      ],
      java: [
        {
          fileName: "models/User.java",
          content: `// User model definition
package models;

public class User {
    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private boolean isActive;

    public User() {
        this.isActive = true;
    }

    public User(String id, String email, String firstName, String lastName) {
        this.id = id;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.isActive = true;
    }

    // Getters
    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public boolean isActive() { return isActive; }

    // Setters
    public void setId(String id) { this.id = id; }
    public void setEmail(String email) { this.email = email; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public void setActive(boolean active) { this.isActive = active; }
}

// NOTE: Users from external APIs might have missing fields
// or might be null entirely`,
          description: "User model that can have null fields",
        },
        {
          fileName: "services/EmailService.java",
          content: `// Email service that uses user data
package services;

import models.User;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

public class EmailService {
    // This will crash if user data is incomplete
    public static Map<String, Object> sendWelcomeEmail(User user) {
        String email = UserService.getUserEmailFormatted(user);
        String name = UserService.getUserDisplayName(user);

        System.out.println("Sending welcome email to " + email + " for " + name);
        // Email sending logic...
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("recipient", email);
        return result;
    }

    // Bulk processing - should handle invalid users gracefully
    public static List<Map<String, Object>> sendBulkEmails(List<User> users) {
        List<Map<String, Object>> results = new ArrayList<>();
        for (User user : users) {
            try {
                results.add(sendWelcomeEmail(user));
            } catch (Exception e) {
                Map<String, Object> errorResult = new HashMap<>();
                errorResult.put("success", false);
                errorResult.put("error", e.getMessage());
                results.add(errorResult);
            }
        }
        return results;
    }
}`,
          description: "Email service that depends on user service functions",
        },
        {
          fileName: "api/UserController.java",
          content: `// API controller
package api;

import models.User;
import services.EmailService;
import java.util.Map;
import java.util.HashMap;

public class UserController {
    public static Map<String, Object> registerUser(Map<String, Object> requestData) {
        Map<String, Object> userData = (Map<String, Object>) requestData.get("body");
        User user = new User();
        if (userData != null) {
            user.setId((String) userData.get("id"));
            user.setEmail((String) userData.get("email"));
            user.setFirstName((String) userData.get("firstName"));
            user.setLastName((String) userData.get("lastName"));
        }

        try {
            // User data from API might be incomplete
            Map<String, Object> emailResult = EmailService.sendWelcomeEmail(user);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.putAll(emailResult);
            return response;
        } catch (Exception error) {
            // Currently crashes with NullPointerException
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to process user registration");
            return errorResponse;
        }
    }
}`,
          description: "API controller that registers users and sends emails",
        },
      ],
    },
    expectedBehavior:
      "Should safely handle null/undefined user objects and missing fields without crashing, returning appropriate defaults or error messages",
    bugDescription:
      "Missing null/undefined checks cause crashes when user object is null or when required fields are missing",
    hints: [
      "Check if user exists before accessing any properties",
      "Check if each required field exists before using it",
      "Consider using optional chaining (?.) in JavaScript/TypeScript",
      "Provide sensible default values when data is missing",
      "Think about what the function should return when data is invalid",
    ],
    testCases: [
      {
        input: { user: { email: "USER@EXAMPLE.COM", firstName: "John", lastName: "Doe" } },
        expected: { email: "user@example.com", name: "John Doe" },
        description: "Valid complete user object",
      },
      {
        input: { user: null },
        expected: { email: null, name: null },
        description: "Null user object - should not crash",
      },
      {
        input: { user: { email: "test@test.com" } },
        expected: { email: "test@test.com", name: null },
        description: "User with email but no name - should not crash",
      },
      {
        input: { user: { firstName: "Jane" } },
        expected: { email: null, name: "Jane" },
        description: "User with name but no email - should not crash",
      },
    ],
  },
]
