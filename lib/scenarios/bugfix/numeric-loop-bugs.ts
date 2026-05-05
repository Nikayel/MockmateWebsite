import type { BugFixScenario } from "../types"

export const numericLoopBugsScenarios: BugFixScenario[] = [
  {
    id: "bugfix-floating-point",
    title: "Fix Floating Point Precision Bug",
    type: "bugfix",
    difficulty: "medium",
    companies: ["Generic"],
    description: "Fix precision issues with floating point arithmetic",
    tags: ["math", "precision", "floating-point"],
    estimatedTime: 15,
    problemStatement: `This function calculates totals for financial transactions, but produces incorrect results due to floating point precision. Fix it.`,
    buggyCode: {
      javascript: `function calculateTotal(prices) {
  return prices.reduce((sum, price) => sum + price, 0);
}
// calculateTotal([0.1, 0.2]) returns 0.30000000000000004`,
      typescript: `function calculateTotal(prices: number[]): number {
  return prices.reduce((sum, price) => sum + price, 0);
}`,
      python: `def calculateTotal(prices):
    return sum(prices)
# calculateTotal([0.1, 0.2]) returns 0.30000000000000004`,
      java: `// InvoiceCalculator.java - Floating point precision bug
public class InvoiceCalculator {
    public static double calculateTotal(double[] prices) {
        double sum = 0.0;
        for (double price : prices) {
            sum += price; // BUG: Direct floating point addition
        }
        return sum;
    }
    // calculateTotal(new double[]{0.1, 0.2}) returns 0.30000000000000004
}`,
    },
    expectedBehavior: "Should return precise decimal values suitable for financial calculations",
    bugDescription: "Floating point arithmetic causes precision errors",
    hints: [
      "Convert to cents (integers) for calculations",
      "Use toFixed() or round to specific decimal places",
      "Consider using a decimal library for financial calculations",
    ],
    testCases: [
      {
        input: "[0.1, 0.2]",
        expected: "0.3 (or 0.30)",
        description: "Simple floating point precision issue",
      },
      {
        input: "[10.15, 5.99, 2.50]",
        expected: "18.64",
        description: "Multiple price calculations with precision",
      },
    ],
    codebaseFiles: {
      javascript: [
        {
          fileName: "services/InvoiceCalculator.js",
          content: `export class InvoiceCalculator {
  // BUG: Direct floating point arithmetic causes precision errors
  calculateTotal(lineItems) {
    return lineItems.reduce((sum, item) => sum + item.price, 0);
    // 0.1 + 0.2 = 0.30000000000000004
  }

  calculateTax(subtotal, taxRate) {
    return subtotal * taxRate;
    // Can produce results like 10.004999999999999 instead of 10.01
  }

  calculateDiscount(price, discountPercent) {
    const discount = price * (discountPercent / 100);
    return price - discount;
    // Precision errors compound
  }

  generateInvoice(items, taxRate = 0.08) {
    const subtotal = this.calculateTotal(items);
    const tax = this.calculateTax(subtotal, taxRate);
    const total = subtotal + tax;

    return {
      subtotal, // BUG: May have precision errors
      tax,      // BUG: May have precision errors
      total,    // BUG: Compounded errors
      items
    };
  }
}

// Example usage showing the bug
const calculator = new InvoiceCalculator();
const items = [
  { name: 'Item 1', price: 0.1 },
  { name: 'Item 2', price: 0.2 }
];

const result = calculator.calculateTotal(items);
console.log(result); // 0.30000000000000004 instead of 0.3`,
          description: "Invoice calculator with floating point precision bugs",
        },
        {
          fileName: "services/PaymentProcessor.js",
          content: `import { InvoiceCalculator } from './InvoiceCalculator';

export class PaymentProcessor {
  constructor() {
    this.calculator = new InvoiceCalculator();
  }

  processPayment(items, paymentAmount) {
    const invoice = this.calculator.generateInvoice(items);

    // BUG: Comparing floating point numbers directly
    if (paymentAmount === invoice.total) {
      return { status: 'success', message: 'Payment exact' };
    } else if (paymentAmount < invoice.total) {
      const shortage = invoice.total - paymentAmount;
      return {
        status: 'insufficient',
        message: \`Short by $\${shortage}\` // BUG: May show weird decimals
      };
    } else {
      const change = paymentAmount - invoice.total;
      return {
        status: 'success',
        change: change // BUG: Precision errors in change calculation
      };
    }
  }

  splitBill(totalAmount, numPeople) {
    // BUG: Division can create repeating decimals
    const perPerson = totalAmount / numPeople;
    const total = perPerson * numPeople;

    // This might not equal the original totalAmount!
    if (total !== totalAmount) {
      console.warn('Rounding error detected!');
    }

    return perPerson;
  }

  // Example that fails spectacularly
  demonstrateBug() {
    const items = [
      { name: 'Coffee', price: 2.50 },
      { name: 'Muffin', price: 3.15 },
      { name: 'Juice', price: 1.99 }
    ];

    const invoice = this.calculator.generateInvoice(items);
    console.log('Total:', invoice.total); // Might be 8.211200000000001

    // Customer pays exact amount shown on screen: 8.21
    const payment = this.processPayment(items, 8.21);
    console.log(payment); // Might say "insufficient" due to precision!
  }
}`,
          description: "Payment processor that compounds floating point errors",
        },
        {
          fileName: "tests/floatingPointBug.test.js",
          content: `import { InvoiceCalculator } from '../services/InvoiceCalculator';
import { PaymentProcessor } from '../services/PaymentProcessor';

describe('Floating Point Precision Bugs', () => {
  describe('InvoiceCalculator', () => {
    const calculator = new InvoiceCalculator();

    test('demonstrates basic floating point error', () => {
      const items = [
        { name: 'Item 1', price: 0.1 },
        { name: 'Item 2', price: 0.2 }
      ];

      const total = calculator.calculateTotal(items);

      // This test FAILS due to floating point precision
      expect(total).toBe(0.3); // FAILS!

      // Actual value
      expect(total).toBe(0.30000000000000004); // Passes but wrong!
    });

    test('demonstrates compounding errors', () => {
      const items = [
        { name: 'A', price: 10.15 },
        { name: 'B', price: 5.99 },
        { name: 'C', price: 2.50 }
      ];

      const invoice = calculator.generateInvoice(items, 0.08);

      // Expected: 18.64 + tax (1.49) = 20.13
      // Actual: Precision errors make this unpredictable
      console.log('Subtotal:', invoice.subtotal); // Might be wrong
      console.log('Tax:', invoice.tax); // Definitely wrong
      console.log('Total:', invoice.total); // Compounded errors

      // This assertion is flaky
      expect(invoice.total).toBe(20.13); // FAILS sometimes!
    });
  });

  describe('PaymentProcessor', () => {
    const processor = new PaymentProcessor();

    test('demonstrates payment comparison bug', () => {
      const items = [{ name: 'Item', price: 0.1 }];

      // Customer tries to pay exact amount
      const result = processor.processPayment(items, 0.108);

      // Expected: 'success' (0.1 * 1.08 = 0.108)
      // Actual: 'insufficient' due to precision errors
      expect(result.status).toBe('success'); // FAILS!
      expect(result.status).toBe('insufficient'); // Actually true
    });

    test('demonstrates bill splitting bug', () => {
      const total = 10.00;
      const perPerson = processor.splitBill(total, 3);

      // 10 / 3 = 3.3333...
      expect(perPerson).toBe(3.33); // FAILS!
      expect(perPerson).toBe(3.3333333333333335); // Actual

      // When you multiply back
      const reconstructedTotal = perPerson * 3;
      expect(reconstructedTotal).toBe(total); // FAILS! Off by tiny amount
    });
  });
});`,
          description: "Tests demonstrating various floating point precision errors",
        },
        {
          fileName: "utils/moneyUtils.js",
          content: `// Utility functions showing proper ways to handle money

/**
 * Convert dollars to cents to work with integers
 * This avoids floating point errors entirely
 */
export function dollarsToCents(dollars) {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents) {
  return cents / 100;
}

/**
 * Add money amounts safely
 */
export function addMoney(...amounts) {
  const cents = amounts.map(dollarsToCents);
  const totalCents = cents.reduce((sum, c) => sum + c, 0);
  return centsToDollars(totalCents);
}

/**
 * Round to 2 decimal places properly
 */
export function roundToMoney(amount) {
  return Math.round(amount * 100) / 100;
}

/**
 * Compare money amounts safely
 */
export function moneyEquals(a, b) {
  return Math.abs(a - b) < 0.001; // Epsilon comparison
}

// Example: Fixed invoice calculator
export class FixedInvoiceCalculator {
  calculateTotal(lineItems) {
    const centsArray = lineItems.map(item => dollarsToCents(item.price));
    const totalCents = centsArray.reduce((sum, cents) => sum + cents, 0);
    return centsToDollars(totalCents);
  }

  calculateTax(subtotal, taxRate) {
    const subtotalCents = dollarsToCents(subtotal);
    const taxCents = Math.round(subtotalCents * taxRate);
    return centsToDollars(taxCents);
  }
}

// Demonstration
const buggy = 0.1 + 0.2; // 0.30000000000000004
const fixed = addMoney(0.1, 0.2); // 0.3

console.log('Buggy:', buggy);
console.log('Fixed:', fixed);
console.log('Are they equal?', buggy === 0.3); // false
console.log('Fixed equals 0.3?', fixed === 0.3); // true`,
          description:
            "Utility functions showing proper techniques for handling money calculations",
        },
      ],
      typescript: [
        {
          fileName: "services/InvoiceCalculator.ts",
          content: `export interface LineItem {
  name: string;
  price: number;
}

export interface Invoice {
  subtotal: number;
  tax: number;
  total: number;
  items: LineItem[];
}

export class InvoiceCalculator {
  // BUG: Direct floating point arithmetic causes precision errors
  calculateTotal(lineItems: LineItem[]): number {
    return lineItems.reduce((sum, item) => sum + item.price, 0);
    // 0.1 + 0.2 = 0.30000000000000004
  }

  calculateTax(subtotal: number, taxRate: number): number {
    return subtotal * taxRate;
  }

  generateInvoice(items: LineItem[], taxRate: number = 0.08): Invoice {
    const subtotal = this.calculateTotal(items);
    const tax = this.calculateTax(subtotal, taxRate);
    const total = subtotal + tax;

    return {
      subtotal, // BUG: May have precision errors
      tax,      // BUG: May have precision errors
      total,    // BUG: Compounded errors
      items
    };
  }
}`,
          description: "Invoice calculator with floating point precision bugs",
        },
        {
          fileName: "utils/moneyUtils.ts",
          content: `// Utility functions showing proper ways to handle money

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function addMoney(...amounts: number[]): number {
  const cents = amounts.map(dollarsToCents);
  const totalCents = cents.reduce((sum, c) => sum + c, 0);
  return centsToDollars(totalCents);
}

export function roundToMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function moneyEquals(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001; // Epsilon comparison
}`,
          description:
            "Utility functions showing proper techniques for handling money calculations",
        },
      ],
      python: [
        {
          fileName: "services/invoice_calculator.py",
          content: `from decimal import Decimal, ROUND_HALF_UP

class InvoiceCalculator:
    """Invoice calculator showing floating point bugs"""

    def calculate_total_buggy(self, line_items):
        """BUG: Float arithmetic has precision errors"""
        total = sum(item['price'] for item in line_items)
        return total
        # 0.1 + 0.2 = 0.30000000000000004

    def calculate_total_fixed(self, line_items):
        """Fixed: Using Decimal for precise calculations"""
        total = sum(Decimal(str(item['price'])) for item in line_items)
        return float(total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

    def calculate_tax_buggy(self, subtotal, tax_rate):
        """BUG: Float multiplication causes precision errors"""
        return subtotal * tax_rate

    def calculate_tax_fixed(self, subtotal, tax_rate):
        """Fixed: Using Decimal"""
        subtotal_dec = Decimal(str(subtotal))
        tax_rate_dec = Decimal(str(tax_rate))
        tax = subtotal_dec * tax_rate_dec
        return float(tax.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

    def generate_invoice_buggy(self, items, tax_rate=0.08):
        """BUG: Compounding precision errors"""
        subtotal = self.calculate_total_buggy(items)
        tax = self.calculate_tax_buggy(subtotal, tax_rate)
        total = subtotal + tax

        return {
            'subtotal': subtotal,  # May have errors
            'tax': tax,           # May have errors
            'total': total,       # Compounded errors
            'items': items
        }`,
          description: "Python invoice calculator showing float vs Decimal",
        },
        {
          fileName: "tests/test_floating_point.py",
          content: `import unittest
from decimal import Decimal
from services.invoice_calculator import InvoiceCalculator

class TestFloatingPointBugs(unittest.TestCase):
    def setUp(self):
        self.calculator = InvoiceCalculator()

    def test_basic_float_bug(self):
        """Demonstrates basic floating point error"""
        items = [
            {'name': 'Item 1', 'price': 0.1},
            {'name': 'Item 2', 'price': 0.2}
        ]

        total = self.calculator.calculate_total_buggy(items)

        # This assertion FAILS
        # self.assertEqual(total, 0.3)

        # This is what actually happens
        self.assertEqual(total, 0.30000000000000004)

    def test_decimal_fix(self):
        """Shows Decimal provides correct results"""
        items = [
            {'name': 'Item 1', 'price': 0.1},
            {'name': 'Item 2', 'price': 0.2}
        ]

        total = self.calculator.calculate_total_fixed(items)

        # With Decimal, this works correctly
        self.assertEqual(total, 0.3)

    def test_invoice_precision(self):
        """Demonstrates compounding errors in invoice"""
        items = [
            {'name': 'A', 'price': 10.15},
            {'name': 'B', 'price': 5.99},
            {'name': 'C', 'price': 2.50}
        ]

        invoice = self.calculator.generate_invoice_buggy(items, 0.08)

        # Expected: 18.64 + 1.49 = 20.13
        # Actual: Precision errors
        print(f"Subtotal: {invoice['subtotal']}")
        print(f"Tax: {invoice['tax']}")
        print(f"Total: {invoice['total']}")

        # This might fail due to precision
        # self.assertAlmostEqual(invoice['total'], 20.13, places=2)`,
          description: "Tests demonstrating floating point bugs in Python",
        },
      ],
      java: [
        {
          fileName: "services/InvoiceCalculator.java",
          content: `// Invoice calculator with floating point precision bugs
package services;

import java.util.List;

public class InvoiceCalculator {
    public static class LineItem {
        public String name;
        public double price;

        public LineItem(String name, double price) {
            this.name = name;
            this.price = price;
        }
    }

    public static class Invoice {
        public double subtotal;
        public double tax;
        public double total;
        public List<LineItem> items;

        public Invoice(double subtotal, double tax, double total, List<LineItem> items) {
            this.subtotal = subtotal;
            this.tax = tax;
            this.total = total;
            this.items = items;
        }
    }

    // BUG: Direct floating point arithmetic causes precision errors
    public double calculateTotal(List<LineItem> lineItems) {
        double sum = 0.0;
        for (LineItem item : lineItems) {
            sum += item.price; // BUG: Direct addition
        }
        return sum;
        // 0.1 + 0.2 = 0.30000000000000004
    }

    public double calculateTax(double subtotal, double taxRate) {
        return subtotal * taxRate; // BUG: Precision errors
    }

    public double calculateDiscount(double price, double discountPercent) {
        double discount = price * (discountPercent / 100);
        return price - discount; // BUG: Precision errors compound
    }

    public Invoice generateInvoice(List<LineItem> items, double taxRate) {
        double subtotal = calculateTotal(items);
        double tax = calculateTax(subtotal, taxRate);
        double total = subtotal + tax;

        return new Invoice(
            subtotal, // BUG: May have precision errors
            tax,      // BUG: May have precision errors
            total,    // BUG: Compounded errors
            items
        );
    }

    public Invoice generateInvoice(List<LineItem> items) {
        return generateInvoice(items, 0.08);
    }

    // Example usage showing the bug
    public static void main(String[] args) {
        InvoiceCalculator calculator = new InvoiceCalculator();
        List<LineItem> items = List.of(
            new LineItem("Item 1", 0.1),
            new LineItem("Item 2", 0.2)
        );

        double result = calculator.calculateTotal(items);
        System.out.println(result); // 0.30000000000000004 instead of 0.3
    }
}`,
          description: "Invoice calculator with floating point precision bugs",
        },
        {
          fileName: "services/PaymentProcessor.java",
          content: `// Payment processor that compounds floating point errors
package services;

import services.InvoiceCalculator;
import services.InvoiceCalculator.LineItem;
import services.InvoiceCalculator.Invoice;
import java.util.List;

public class PaymentProcessor {
    private InvoiceCalculator calculator;

    public static class PaymentResult {
        public String status;
        public String message;
        public Double change;

        public PaymentResult(String status, String message) {
            this.status = status;
            this.message = message;
            this.change = null;
        }

        public PaymentResult(String status, String message, Double change) {
            this.status = status;
            this.message = message;
            this.change = change;
        }
    }

    public PaymentProcessor() {
        this.calculator = new InvoiceCalculator();
    }

    public PaymentResult processPayment(List<LineItem> items, double paymentAmount) {
        Invoice invoice = calculator.generateInvoice(items);

        // BUG: Comparing floating point numbers directly
        if (paymentAmount == invoice.total) {
            return new PaymentResult("success", "Payment exact");
        } else if (paymentAmount < invoice.total) {
            double shortage = invoice.total - paymentAmount;
            return new PaymentResult(
                "insufficient",
                String.format("Short by $%.2f", shortage) // BUG: May show weird decimals
            );
        } else {
            double change = paymentAmount - invoice.total;
            return new PaymentResult(
                "success",
                "Payment received",
                change // BUG: Precision errors in change calculation
            );
        }
    }

    public double splitBill(double totalAmount, int numPeople) {
        // BUG: Division can create repeating decimals
        double perPerson = totalAmount / numPeople;
        double total = perPerson * numPeople;

        // This might not equal the original totalAmount!
        if (total != totalAmount) {
            System.out.println("WARNING: Rounding error detected!");
        }

        return perPerson;
    }

    // Example that fails spectacularly
    public void demonstrateBug() {
        List<LineItem> items = List.of(
            new LineItem("Coffee", 2.50),
            new LineItem("Muffin", 3.15),
            new LineItem("Juice", 1.99)
        );

        Invoice invoice = calculator.generateInvoice(items);
        System.out.println("Total: " + invoice.total); // Might be 8.211200000000001

        // Customer pays exact amount shown on screen: 8.21
        PaymentResult payment = processPayment(items, 8.21);
        System.out.println(payment.status); // Might say "insufficient" due to precision!
    }
}`,
          description: "Payment processor that compounds floating point errors",
        },
        {
          fileName: "utils/MoneyUtils.java",
          content: `// Utility functions showing proper ways to handle money
package utils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import services.InvoiceCalculator.LineItem;
import java.util.List;

public class MoneyUtils {

    /**
     * Convert dollars to cents to work with integers
     * This avoids floating point errors entirely
     */
    public static long dollarsToCents(double dollars) {
        return Math.round(dollars * 100);
    }

    public static double centsToDollars(long cents) {
        return cents / 100.0;
    }

    /**
     * Add money amounts safely using BigDecimal
     */
    public static double addMoney(double... amounts) {
        BigDecimal total = BigDecimal.ZERO;
        for (double amount : amounts) {
            total = total.add(BigDecimal.valueOf(amount));
        }
        return total.setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    /**
     * Round to 2 decimal places properly
     */
    public static double roundToMoney(double amount) {
        return Math.round(amount * 100.0) / 100.0;
    }

    /**
     * Compare money amounts safely
     */
    public static boolean moneyEquals(double a, double b) {
        return Math.abs(a - b) < 0.001; // Epsilon comparison
    }

    // Example: Fixed invoice calculator
    public static class FixedInvoiceCalculator {
        public double calculateTotal(List<LineItem> lineItems) {
            long totalCents = 0;
            for (LineItem item : lineItems) {
                totalCents += dollarsToCents(item.price);
            }
            return centsToDollars(totalCents);
        }

        public double calculateTax(double subtotal, double taxRate) {
            long subtotalCents = dollarsToCents(subtotal);
            long taxCents = Math.round(subtotalCents * taxRate);
            return centsToDollars(taxCents);
        }
    }

    // Demonstration
    public static void main(String[] args) {
        double buggy = 0.1 + 0.2; // 0.30000000000000004
        double fixed = addMoney(0.1, 0.2); // 0.3

        System.out.println("Buggy: " + buggy);
        System.out.println("Fixed: " + fixed);
        System.out.println("Are they equal? " + (buggy == 0.3)); // false
        System.out.println("Fixed equals 0.3? " + (fixed == 0.3)); // true
    }
}`,
          description:
            "Utility functions showing proper techniques for handling money calculations",
        },
      ],
    },
  },
  {
    id: "bugfix-infinite-loop",
    title: "Fix Infinite Loop Bug",
    type: "bugfix",
    difficulty: "easy",
    companies: ["Generic"],
    description: "Fix infinite loop caused by incorrect loop condition",
    tags: ["loops", "control-flow", "debugging"],
    estimatedTime: 10,
    problemStatement: `This function should count down from n to 0, but it never stops. Fix the infinite loop.`,
    buggyCode: {
      javascript: `function countdown(n) {
  let count = n;
  while (count >= 0) {
    console.log(count);
    count++;
  }
}`,
      typescript: `function countdown(n: number): void {
  let count = n;
  while (count >= 0) {
    console.log(count);
    count++;
  }
}`,
      python: `def countdown(n):
    count = n
    while count >= 0:
        print(count)
        count += 1`,
      java: `// CountdownTimer.java - Infinite loop bug
public class CountdownTimer {
    public static void countdown(int n) {
        int count = n;
        while (count >= 0) {
            System.out.println(count);
            count++; // BUG: Should be count-- to decrement!
        }
        // This function never returns - program hangs!
    }
}`,
    },
    expectedBehavior: "Should count down from n to 0 and then stop",
    bugDescription: "Loop increments instead of decrements, causing infinite loop",
    hints: [
      "Check the loop update statement",
      "Should the count be increasing or decreasing?",
      "Trace through the loop manually to see what happens",
    ],
    testCases: [
      {
        input: "5",
        expected: "Prints 5, 4, 3, 2, 1, 0 and stops",
        description: "Countdown timer should decrement correctly",
      },
    ],
    codebaseFiles: {
      javascript: [
        {
          fileName: "components/TimerComponent.jsx",
          content: `import React, { useState, useEffect } from 'react';

export function TimerComponent({ startTime }) {
  const [timeLeft, setTimeLeft] = useState(startTime);
  const [isRunning, setIsRunning] = useState(false);

  // BUG: Infinite loop in countdown logic
  function countdown(n) {
    let count = n;
    while (count >= 0) {
      console.log(count);
      count++; // BUG: Should be count-- to decrement!
    }
    // This function never returns - browser hangs!
  }

  const startTimer = () => {
    setIsRunning(true);
    // WARNING: This will freeze the browser!
    countdown(timeLeft);
    setTimeLeft(0);
  };

  return (
    <div className="timer">
      <h2>Countdown Timer</h2>
      <div className="time-display">{timeLeft} seconds</div>
      <button onClick={startTimer} disabled={isRunning}>
        Start Countdown
      </button>
      {isRunning && <p>Counting down...</p>}
    </div>
  );
}`,
          description: "Timer component with infinite loop bug that freezes the browser",
        },
        {
          fileName: "animations/AnimationController.js",
          content: `export class AnimationController {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
  }

  // BUG: Infinite loop in particle update
  updateParticles() {
    let i = 0;
    while (i < this.particles.length) {
      const particle = this.particles[i];

      // Update particle position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // BUG: Forgot to increment i!
      // i++; // This line is missing

      // Remove particles that are off screen
      if (particle.y > this.canvas.height) {
        this.particles.splice(i, 1);
        // BUG: After splice, we should NOT increment i
        // but we forgot to increment i at all!
      }
    }
    // This function hangs because i never changes
  }

  // Another infinite loop bug
  fadeOutAnimation(element, duration) {
    let opacity = 1.0;
    const step = 0.05;

    // BUG: Condition will never be false
    while (opacity > 0) {
      element.style.opacity = opacity;
      opacity += step; // BUG: Should be -= not +=
      // opacity keeps increasing, never reaches 0
    }
  }

  // Correct version for comparison
  updateParticlesFixed() {
    let i = 0;
    while (i < this.particles.length) {
      const particle = this.particles[i];

      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.y > this.canvas.height) {
        this.particles.splice(i, 1);
        // Don't increment i when we remove an element
      } else {
        i++; // Increment when we keep the element
      }
    }
  }
}`,
          description: "Animation controller with multiple infinite loop bugs",
        },
        {
          fileName: "tests/infiniteLoop.test.js",
          content: `import { TimerComponent } from '../components/TimerComponent';
import { AnimationController } from '../animations/AnimationController';

describe('Infinite Loop Bugs', () => {
  describe('TimerComponent countdown bug', () => {
    test('countdown never terminates', () => {
      // WARNING: This test will hang if you run it!
      // Normally we'd use a timeout to detect infinite loops

      const countdown = (n) => {
        let count = n;
        while (count >= 0) {
          console.log(count);
          count++; // BUG: increments instead of decrements
        }
      };

      // This will hang:
      // countdown(5);

      // To test this safely, we need a timeout:
      jest.setTimeout(1000); // 1 second timeout

      expect(() => {
        const timeout = setTimeout(() => {
          throw new Error('Function timed out - likely infinite loop');
        }, 500);

        countdown(5);
        clearTimeout(timeout);
      }).toThrow('Function timed out');
    });

    test('demonstrates correct countdown', () => {
      const countdownFixed = (n) => {
        let count = n;
        const results = [];
        while (count >= 0) {
          results.push(count);
          count--; // FIXED: Now it decrements
        }
        return results;
      };

      const result = countdownFixed(5);
      expect(result).toEqual([5, 4, 3, 2, 1, 0]);
    });
  });

  describe('AnimationController bugs', () => {
    test('updateParticles hangs due to missing increment', () => {
      const canvas = document.createElement('canvas');
      const controller = new AnimationController(canvas);

      controller.particles = [
        { x: 10, y: 10, vx: 1, vy: 1 },
        { x: 20, y: 20, vx: 1, vy: 1 }
      ];

      // This would hang:
      // controller.updateParticles();

      // Fixed version works:
      controller.updateParticlesFixed();
      expect(controller.particles.length).toBeLessThanOrEqual(2);
    });

    test('fadeOut increments instead of decrements', () => {
      const element = document.createElement('div');
      element.style.opacity = '1.0';
      const controller = new AnimationController(document.createElement('canvas'));

      // This would hang forever:
      // controller.fadeOutAnimation(element, 1000);

      // The bug: opacity starts at 1.0, adds 0.05 each iteration
      // So it becomes 1.05, 1.10, 1.15... never reaches 0
      expect(1.0 + 0.05).toBeGreaterThan(0); // Always true!
    });
  });
});`,
          description: "Tests that would hang due to infinite loops (with safety timeouts)",
        },
        {
          fileName: "utils/loopDebugger.js",
          content: `// Utilities to detect and debug infinite loops

/**
 * Wraps a while loop with iteration limit to prevent infinite loops
 */
export function safeWhile(condition, body, maxIterations = 10000) {
  let iterations = 0;

  while (condition() && iterations < maxIterations) {
    body();
    iterations++;

    if (iterations >= maxIterations) {
      throw new Error(
        \`Possible infinite loop detected: exceeded \${maxIterations} iterations\`
      );
    }
  }

  return iterations;
}

/**
 * Wraps a function with a timeout to prevent hanging
 */
export function withTimeout(fn, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(\`Function timed out after \${timeoutMs}ms - possible infinite loop\`));
    }, timeoutMs);

    try {
      const result = fn();
      clearTimeout(timer);
      resolve(result);
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

/**
 * Example: Safe countdown implementation
 */
export function safeCountdown(n) {
  const results = [];
  let count = n;
  let iterations = 0;
  const MAX_ITERATIONS = 1000;

  while (count >= 0) {
    if (iterations++ > MAX_ITERATIONS) {
      throw new Error('Infinite loop detected in countdown');
    }

    results.push(count);
    count--; // Correct decrement
  }

  return results;
}

/**
 * Detects common infinite loop patterns
 */
export function detectInfiniteLoopPattern(code) {
  const warnings = [];

  // Pattern 1: while loop with wrong increment direction
  if (/while.*>=.*\\{[^}]*\\+\\+/.test(code)) {
    warnings.push('Potential infinite loop: incrementing when condition checks >=');
  }

  // Pattern 2: while loop with wrong decrement direction
  if (/while.*<=.*\\{[^}]*--/.test(code)) {
    warnings.push('Potential infinite loop: decrementing when condition checks <=');
  }

  // Pattern 3: while loop with no increment/decrement
  if (/while.*\\{(?!.*(?:\\+\\+|--|\\+=|-=))[^}]*\\}/.test(code)) {
    warnings.push('Potential infinite loop: loop variable not modified');
  }

  return warnings;
}

// Example usage
const buggyCode = \`
function countdown(n) {
  let count = n;
  while (count >= 0) {
    console.log(count);
    count++; // BUG!
  }
}
\`;

console.log('Loop warnings:', detectInfiniteLoopPattern(buggyCode));`,
          description: "Debugging utilities to detect and prevent infinite loops",
        },
      ],
      typescript: [
        {
          fileName: "components/TimerComponent.tsx",
          content: `import React, { useState } from 'react';

interface TimerProps {
  startTime: number;
}

export function TimerComponent({ startTime }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(startTime);
  const [isRunning, setIsRunning] = useState(false);

  // BUG: Infinite loop in countdown logic
  function countdown(n: number): void {
    let count = n;
    while (count >= 0) {
      console.log(count);
      count++; // BUG: Should be count-- to decrement!
    }
    // This function never returns - browser hangs!
  }

  const startTimer = () => {
    setIsRunning(true);
    // WARNING: This will freeze the browser!
    countdown(timeLeft);
    setTimeLeft(0);
  };

  return (
    <div className="timer">
      <h2>Countdown Timer</h2>
      <div className="time-display">{timeLeft} seconds</div>
      <button onClick={startTimer} disabled={isRunning}>
        Start Countdown
      </button>
      {isRunning && <p>Counting down...</p>}
    </div>
  );
}`,
          description: "Timer component with infinite loop bug that freezes the browser",
        },
        {
          fileName: "utils/loopDebugger.ts",
          content: `// Utilities to detect and debug infinite loops

export function safeWhile(
  condition: () => boolean,
  body: () => void,
  maxIterations: number = 10000
): number {
  let iterations = 0;

  while (condition() && iterations < maxIterations) {
    body();
    iterations++;

    if (iterations >= maxIterations) {
      throw new Error(
        \`Possible infinite loop detected: exceeded \${maxIterations} iterations\`
      );
    }
  }

  return iterations;
}

export function withTimeout<T>(
  fn: () => T,
  timeoutMs: number = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(\`Function timed out after \${timeoutMs}ms - possible infinite loop\`));
    }, timeoutMs);

    try {
      const result = fn();
      clearTimeout(timer);
      resolve(result);
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

export function safeCountdown(n: number): number[] {
  const results: number[] = [];
  let count = n;
  let iterations = 0;
  const MAX_ITERATIONS = 1000;

  while (count >= 0) {
    if (iterations++ > MAX_ITERATIONS) {
      throw new Error('Infinite loop detected in countdown');
    }

    results.push(count);
    count--;
  }

  return results;
}`,
          description: "Debugging utilities to detect and prevent infinite loops",
        },
      ],
      python: [
        {
          fileName: "utils/timer.py",
          content: `import time
from typing import List

class TimerController:
    """Timer with infinite loop bug"""

    def countdown_buggy(self, n: int) -> None:
        """BUG: Infinite loop - increments instead of decrements"""
        count = n
        while count >= 0:
            print(count)
            count += 1  # BUG: Should be count -= 1
            # This will run forever!

    def countdown_fixed(self, n: int) -> List[int]:
        """Fixed version that correctly counts down"""
        count = n
        results = []
        while count >= 0:
            results.append(count)
            count -= 1  # FIXED: Now it decrements
        return results

    def fade_animation_buggy(self, duration: float) -> None:
        """BUG: Opacity increases instead of decreases"""
        opacity = 1.0
        step = 0.05

        while opacity > 0:
            print(f"Opacity: {opacity}")
            opacity += step  # BUG: Should be -= not +=
            time.sleep(0.01)
            # opacity keeps growing, never reaches 0!

    def fade_animation_fixed(self, duration: float) -> None:
        """Fixed version"""
        opacity = 1.0
        step = 0.05

        while opacity > 0:
            print(f"Opacity: {opacity}")
            opacity -= step  # FIXED: Now it decreases
            time.sleep(0.01)`,
          description: "Python timer showing infinite loop bug",
        },
        {
          fileName: "tests/test_infinite_loop.py",
          content: `import unittest
import signal
from utils.timer import TimerController

class TimeoutError(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutError("Function timed out - likely infinite loop")

class TestInfiniteLoops(unittest.TestCase):
    def setUp(self):
        self.timer = TimerController()

    def test_countdown_buggy_would_hang(self):
        """This test demonstrates the bug (safely with timeout)"""
        # Set a 2-second timeout
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(2)

        try:
            # This would hang forever
            self.timer.countdown_buggy(5)
            self.fail("Should have timed out")
        except TimeoutError:
            # Expected - the function hung
            pass
        finally:
            signal.alarm(0)  # Cancel the alarm

    def test_countdown_fixed_works(self):
        """Fixed version works correctly"""
        result = self.timer.countdown_fixed(5)
        self.assertEqual(result, [5, 4, 3, 2, 1, 0])

    def test_demonstrates_bug_logic(self):
        """Shows why the bug creates an infinite loop"""
        count = 5

        # Buggy logic: count++ when condition is count >= 0
        # 5 >= 0? Yes -> increment to 6
        # 6 >= 0? Yes -> increment to 7
        # 7 >= 0? Yes -> increment to 8
        # ... this never stops!

        iterations = 0
        while count >= 0 and iterations < 10:
            count += 1  # Bug: incrementing
            iterations += 1

        # After 10 iterations, count is much larger, not 0
        self.assertEqual(count, 15)  # Started at 5, added 10
        self.assertGreater(count, 0)  # Still above 0, would continue forever`,
          description: "Tests demonstrating infinite loop bugs in Python",
        },
      ],
      java: [
        {
          fileName: "ui/CountdownTimer.java",
          content: `// Countdown timer with infinite loop bug
package ui;

public class CountdownTimer {
    private int timeLeft;
    private boolean isRunning;

    public CountdownTimer(int startTime) {
        this.timeLeft = startTime;
        this.isRunning = false;
    }

    // BUG: Infinite loop in countdown logic
    public void countdown(int n) {
        int count = n;
        while (count >= 0) {
            System.out.println(count);
            count++; // BUG: Should be count-- to decrement!
        }
        // This function never returns - program hangs!
    }

    public void startTimer() {
        isRunning = true;
        // WARNING: This will hang the program!
        countdown(timeLeft);
        timeLeft = 0;
        isRunning = false;
    }

    public int getTimeLeft() {
        return timeLeft;
    }

    public boolean isRunning() {
        return isRunning;
    }

    public static void main(String[] args) {
        CountdownTimer timer = new CountdownTimer(5);
        System.out.println("Starting countdown from " + timer.getTimeLeft());
        // This will hang forever
        timer.startTimer();
        System.out.println("Done!"); // Never reached
    }
}`,
          description: "Timer component with infinite loop bug that hangs the program",
        },
        {
          fileName: "animation/ParticleSystem.java",
          content: `// Particle animation system with infinite loop bugs
package animation;

import java.util.ArrayList;
import java.util.List;

public class ParticleSystem {
    private List<Particle> particles;

    public static class Particle {
        public double x, y;
        public double vx, vy;

        public Particle(double x, double y, double vx, double vy) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
        }
    }

    public ParticleSystem() {
        this.particles = new ArrayList<>();
    }

    // BUG: Infinite loop in particle update
    public void updateParticles(double canvasHeight) {
        int i = 0;
        while (i < particles.size()) {
            Particle particle = particles.get(i);

            // Update particle position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // BUG: Forgot to increment i!
            // i++; // This line is missing

            // Remove particles that are off screen
            if (particle.y > canvasHeight) {
                particles.remove(i);
                // BUG: After remove, we should NOT increment i
                // but we forgot to increment i at all!
            }
        }
        // This method hangs because i never changes
    }

    // Another infinite loop bug
    public void fadeOutAnimation(double duration) {
        double opacity = 1.0;
        double step = 0.05;

        // BUG: Condition will never be false
        while (opacity > 0) {
            System.out.println("Opacity: " + opacity);
            opacity += step; // BUG: Should be -= not +=
            // opacity keeps increasing, never reaches 0
            try {
                Thread.sleep(10);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    // Correct version for comparison
    public void updateParticlesFixed(double canvasHeight) {
        int i = 0;
        while (i < particles.size()) {
            Particle particle = particles.get(i);

            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.y > canvasHeight) {
                particles.remove(i);
                // Don't increment i when we remove an element
            } else {
                i++; // Increment when we keep the element
            }
        }
    }

    public void addParticle(Particle particle) {
        particles.add(particle);
    }

    public List<Particle> getParticles() {
        return particles;
    }
}`,
          description: "Animation controller with multiple infinite loop bugs",
        },
        {
          fileName: "utils/LoopDebugger.java",
          content: `// Utilities to detect and debug infinite loops
package utils;

import java.util.ArrayList;
import java.util.List;
import java.util.function.BooleanSupplier;
import java.util.concurrent.*;

public class LoopDebugger {

    /**
     * Wraps a while loop with iteration limit to prevent infinite loops
     */
    public static int safeWhile(BooleanSupplier condition, Runnable body, int maxIterations) {
        int iterations = 0;

        while (condition.getAsBoolean() && iterations < maxIterations) {
            body.run();
            iterations++;

            if (iterations >= maxIterations) {
                throw new RuntimeException(
                    "Possible infinite loop detected: exceeded " + maxIterations + " iterations"
                );
            }
        }

        return iterations;
    }

    public static int safeWhile(BooleanSupplier condition, Runnable body) {
        return safeWhile(condition, body, 10000);
    }

    /**
     * Wraps a function with a timeout to prevent hanging
     */
    public static <T> T withTimeout(Callable<T> fn, long timeoutMs) throws TimeoutException {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        Future<T> future = executor.submit(fn);

        try {
            return future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new TimeoutException(
                "Function timed out after " + timeoutMs + "ms - possible infinite loop"
            );
        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException(e);
        } finally {
            executor.shutdownNow();
        }
    }

    /**
     * Example: Safe countdown implementation
     */
    public static List<Integer> safeCountdown(int n) {
        List<Integer> results = new ArrayList<>();
        int count = n;
        int iterations = 0;
        final int MAX_ITERATIONS = 1000;

        while (count >= 0) {
            if (iterations++ > MAX_ITERATIONS) {
                throw new RuntimeException("Infinite loop detected in countdown");
            }

            results.add(count);
            count--; // Correct decrement
        }

        return results;
    }

    /**
     * Detects common infinite loop patterns in code
     */
    public static List<String> detectInfiniteLoopPattern(String code) {
        List<String> warnings = new ArrayList<>();

        // Pattern 1: while loop with wrong increment direction
        if (code.matches(".*while.*>=.*\\{[^}]*\\+\\+.*")) {
            warnings.add("Potential infinite loop: incrementing when condition checks >=");
        }

        // Pattern 2: while loop with wrong decrement direction
        if (code.matches(".*while.*<=.*\\{[^}]*--.*")) {
            warnings.add("Potential infinite loop: decrementing when condition checks <=");
        }

        return warnings;
    }

    // Example usage
    public static void main(String[] args) {
        String buggyCode = """
            public void countdown(int n) {
                int count = n;
                while (count >= 0) {
                    System.out.println(count);
                    count++; // BUG!
                }
            }
            """;

        System.out.println("Loop warnings: " + detectInfiniteLoopPattern(buggyCode));

        // Test safe countdown
        List<Integer> result = safeCountdown(5);
        System.out.println("Safe countdown result: " + result);
    }
}`,
          description: "Debugging utilities to detect and prevent infinite loops",
        },
      ],
    },
  },
]
