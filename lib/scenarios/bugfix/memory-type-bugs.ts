import type { BugFixScenario } from "../types"

export const memoryTypeBugsScenarios: BugFixScenario[] = [
  {
    id: "bugfix-memory-leak",
    title: "Fix Memory Leak in Event Listeners",
    type: "bugfix",
    difficulty: "medium",
    companies: ["Meta", "Google"],
    description: "Fix memory leak caused by unremoved event listeners",
    tags: ["memory-leak", "event-listeners", "cleanup"],
    estimatedTime: 15,
    problemStatement: `This React component adds event listeners but never removes them, causing a memory leak. Fix it.`,
    buggyCode: {
      javascript: `// useWindowSize.js - Hook with memory leak
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth });
    }
    // BUG: Event listener added but never removed
    window.addEventListener('resize', handleResize);
    // Missing cleanup function
  }, []);

  return size;
}`,
      typescript: `// useWindowSize.ts - Hook with memory leak
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth });
    }
    // BUG: Event listener added but never removed
    window.addEventListener('resize', handleResize);
    // Missing cleanup function
  }, []);

  return size;
}`,
      java: `// WindowSizeTracker.java - Class with memory leak
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import javax.swing.JFrame;

public class WindowSizeTracker {
    private int width;
    private JFrame frame;

    public WindowSizeTracker(JFrame frame) {
        this.frame = frame;
        this.width = frame.getWidth();
        attachListener();
    }

    private void attachListener() {
        ComponentAdapter resizeListener = new ComponentAdapter() {
            @Override
            public void componentResized(ComponentEvent e) {
                width = frame.getWidth();
                System.out.println("Window resized: " + width);
            }
        };
        // BUG: Listener added but no cleanup/removal method provided
        frame.addComponentListener(resizeListener);
        // Missing cleanup/dispose method
    }

    public int getWidth() {
        return width;
    }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "components/ResponsiveLayout.jsx",
          content: `// ResponsiveLayout - Component that uses the buggy hook
import React from 'react';
import { useWindowSize } from '../hooks/useWindowSize';

export function ResponsiveLayout() {
  const { width } = useWindowSize();

  return (
    <div className="layout">
      <div className="header">
        <h1>Responsive App</h1>
        <span className="window-size">Window: {width}px</span>
      </div>

      <div className="content">
        {width < 768 ? (
          <MobileView />
        ) : width < 1024 ? (
          <TabletView />
        ) : (
          <DesktopView />
        )}
      </div>
    </div>
  );
}

function MobileView() {
  return <div>Mobile View</div>;
}

function TabletView() {
  return <div>Tablet View</div>;
}

function DesktopView() {
  return <div>Desktop View</div>;
}`,
          description: "Component using the buggy useWindowSize hook",
        },
        {
          fileName: "components/ConditionalWidget.jsx",
          content: `// ConditionalWidget - Mounts/unmounts frequently
import React, { useState } from 'react';
import { useWindowSize } from '../hooks/useWindowSize';

export function ConditionalWidget() {
  const [showWidget, setShowWidget] = useState(true);

  return (
    <div>
      <button onClick={() => setShowWidget(!showWidget)}>
        Toggle Widget
      </button>

      {/* This component mounts and unmounts frequently */}
      {/* Each mount adds a new listener without removing the old one */}
      {showWidget && <WindowSizeDisplay />}
    </div>
  );
}

function WindowSizeDisplay() {
  const { width } = useWindowSize();

  return (
    <div className="widget">
      Current width: {width}px
    </div>
  );
}`,
          description: "Component that mounts/unmounts, demonstrating the leak",
        },
        {
          fileName: "utils/memoryTest.js",
          content: `// Memory leak testing utility
export function testForMemoryLeak() {
  let listenerCount = 0;

  // Override addEventListener to count listeners
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  window.addEventListener = function(...args) {
    listenerCount++;
    console.log(\`Listener added. Total: \${listenerCount}\`);
    return originalAddEventListener.apply(this, args);
  };

  window.removeEventListener = function(...args) {
    listenerCount--;
    console.log(\`Listener removed. Total: \${listenerCount}\`);
    return originalRemoveEventListener.apply(this, args);
  };

  return {
    getListenerCount: () => listenerCount,
    reset: () => {
      window.addEventListener = originalAddEventListener;
      window.removeEventListener = originalRemoveEventListener;
    }
  };
}

// Test scenario
export function runMemoryLeakTest(ComponentToTest, iterations = 10) {
  const test = testForMemoryLeak();

  console.log('Testing for memory leaks...');
  console.log(\`Mounting and unmounting component \${iterations} times\`);

  for (let i = 0; i < iterations; i++) {
    // Simulate mount
    const component = ComponentToTest();
    // Simulate unmount
    component?.cleanup?.();
  }

  const finalCount = test.getListenerCount();
  test.reset();

  if (finalCount > 0) {
    console.error(\`❌ MEMORY LEAK DETECTED: \${finalCount} listeners not removed\`);
  } else {
    console.log('✅ No memory leak detected');
  }

  return finalCount === 0;
}`,
          description: "Utility to detect memory leaks in components",
        },
        {
          fileName: "hooks/useWindowSize.fixed.js",
          content: `// Fixed version with proper cleanup
import { useState, useEffect } from 'react';

export function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }

    window.addEventListener('resize', handleResize);

    // FIXED: Return cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Empty dependency array - only run once

  return size;
}`,
          description: "Fixed version showing proper cleanup",
        },
      ],
      typescript: [
        {
          fileName: "components/ResponsiveLayout.tsx",
          content: `// ResponsiveLayout - Component using the buggy hook
import React from 'react';
import { useWindowSize } from '../hooks/useWindowSize';

interface Size {
  width: number;
  height?: number;
}

export function ResponsiveLayout(): JSX.Element {
  const { width }: Size = useWindowSize();

  const getViewType = (): string => {
    if (width < 768) return 'Mobile';
    if (width < 1024) return 'Tablet';
    return 'Desktop';
  };

  return (
    <div className="layout">
      <div className="header">
        <h1>Responsive App</h1>
        <span className="window-size">
          {width}px - {getViewType()} View
        </span>
      </div>
    </div>
  );
}`,
          description: "TypeScript component using the hook",
        },
        {
          fileName: "hooks/useWindowSize.fixed.ts",
          content: `// Fixed version with proper cleanup and TypeScript
import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    function handleResize(): void {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return (): void => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return size;
}`,
          description: "Fixed TypeScript version with proper types",
        },
      ],
      java: [
        {
          fileName: "components/ResponsivePanel.java",
          content: `// ResponsivePanel - Component that uses the buggy tracker
package components;

import javax.swing.*;
import java.awt.*;

public class ResponsivePanel extends JPanel {
    private WindowSizeTracker sizeTracker;
    private JLabel sizeLabel;
    private JFrame parentFrame;

    public ResponsivePanel(JFrame frame) {
        this.parentFrame = frame;
        this.sizeTracker = new WindowSizeTracker(frame);

        setLayout(new BorderLayout());
        sizeLabel = new JLabel("Window: " + sizeTracker.getWidth() + "px");
        add(sizeLabel, BorderLayout.NORTH);

        // Component that might be added/removed frequently
        // Each time it's recreated, a new listener is added without removing the old one
    }

    public void updateDisplay() {
        sizeLabel.setText("Window: " + sizeTracker.getWidth() + "px");
    }

    // BUG: No cleanup method to remove listeners when panel is disposed
    // This causes memory leak when panel is removed and recreated
}`,
          description: "Component using the buggy WindowSizeTracker",
        },
        {
          fileName: "components/ToggleableWidget.java",
          content: `// ToggleableWidget - Component that gets added/removed frequently
package components;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

public class ToggleableWidget extends JFrame {
    private JButton toggleButton;
    private ResponsivePanel panel;
    private boolean showingPanel = false;

    public ToggleableWidget() {
        setTitle("Memory Leak Demo");
        setSize(600, 400);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

        toggleButton = new JButton("Toggle Widget");
        toggleButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                togglePanel();
            }
        });

        add(toggleButton, BorderLayout.SOUTH);
    }

    private void togglePanel() {
        if (showingPanel && panel != null) {
            // BUG: Removing panel but its listeners remain attached
            remove(panel);
            panel = null;
            showingPanel = false;
        } else {
            // Each time we create a new panel, it adds a new listener
            // Previous listeners are never removed, causing memory leak
            panel = new ResponsivePanel(this);
            add(panel, BorderLayout.CENTER);
            showingPanel = true;
        }
        revalidate();
        repaint();
        System.out.println("Panel toggled. Memory leak growing if listeners not cleaned up.");
    }
}`,
          description: "Widget that toggles panel, demonstrating the leak",
        },
        {
          fileName: "utils/MemoryLeakDetector.java",
          content: `// Memory leak detection utility
package utils;

import javax.swing.*;
import java.awt.event.ComponentListener;
import java.lang.reflect.Field;

public class MemoryLeakDetector {
    public static int countComponentListeners(JFrame frame) {
        ComponentListener[] listeners = frame.getComponentListeners();
        return listeners.length;
    }

    public static void testForMemoryLeak(JFrame frame, int iterations) {
        System.out.println("Testing for memory leaks...");
        System.out.println("Creating and destroying components " + iterations + " times");

        int initialListeners = countComponentListeners(frame);
        System.out.println("Initial listener count: " + initialListeners);

        // Simulate creating and destroying components multiple times
        for (int i = 0; i < iterations; i++) {
            ResponsivePanel panel = new ResponsivePanel(frame);
            // Simulate component being removed
            panel = null;
        }

        // Force garbage collection
        System.gc();
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        int finalListeners = countComponentListeners(frame);
        System.out.println("Final listener count: " + finalListeners);

        int leakedListeners = finalListeners - initialListeners;
        if (leakedListeners > 0) {
            System.err.println("❌ MEMORY LEAK DETECTED: " + leakedListeners + " listeners not removed");
        } else {
            System.out.println("✅ No memory leak detected");
        }
    }
}`,
          description: "Utility to detect memory leaks",
        },
        {
          fileName: "WindowSizeTracker.fixed.java",
          content: `// Fixed version with proper cleanup
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import javax.swing.JFrame;

public class WindowSizeTrackerFixed {
    private int width;
    private JFrame frame;
    private ComponentAdapter resizeListener;

    public WindowSizeTrackerFixed(JFrame frame) {
        this.frame = frame;
        this.width = frame.getWidth();
        attachListener();
    }

    private void attachListener() {
        resizeListener = new ComponentAdapter() {
            @Override
            public void componentResized(ComponentEvent e) {
                width = frame.getWidth();
                System.out.println("Window resized: " + width);
            }
        };
        frame.addComponentListener(resizeListener);
    }

    public int getWidth() {
        return width;
    }

    // FIXED: Added cleanup method to remove listener
    public void dispose() {
        if (frame != null && resizeListener != null) {
            frame.removeComponentListener(resizeListener);
            resizeListener = null;
        }
    }

    // FIXED: Cleanup in finalize as backup (though dispose() should be called explicitly)
    @Override
    protected void finalize() throws Throwable {
        try {
            dispose();
        } finally {
            super.finalize();
        }
    }
}`,
          description: "Fixed version with proper cleanup",
        },
      ],
    },
    expectedBehavior: "Should add AND remove event listener to prevent memory leaks",
    bugDescription: "Event listener is added but never removed on component unmount",
    hints: [
      "useEffect can return a cleanup function",
      "Cleanup function runs when component unmounts",
      "Use removeEventListener in the cleanup",
      "The cleanup function should mirror the setup",
    ],
    testCases: [
      {
        input: { action: "Mount and unmount component 10 times" },
        expected: { listenerCount: 0 },
        description: "No duplicate event listeners, no memory leak",
      },
    ],
  },
  {
    id: "bugfix-type-coercion",
    title: "Fix Type Coercion Bug",
    type: "bugfix",
    difficulty: "easy",
    companies: ["Generic"],
    description: "Fix bug caused by implicit type coercion",
    tags: ["types", "coercion", "comparison"],
    estimatedTime: 10,
    problemStatement: `This function should sum two numbers, but sometimes returns unexpected results. Fix the type issue.`,
    buggyCode: {
      javascript: `// calculator.js - Math utilities with type coercion bug
function addNumbers(a, b) {
  // BUG: No type conversion - string concatenation occurs
  return a + b;
}
// addNumbers("5", 3) returns "53" instead of 8`,
      typescript: `// calculator.ts - Math utilities with type coercion bug
function addNumbers(a: any, b: any) {
  // BUG: Using 'any' allows strings, no conversion
  return a + b;
}
// addNumbers("5", 3) returns "53" instead of 8`,
      python: `# calculator.py - Math utilities with type issue
def add_numbers(a, b):
    # BUG: No type checking or conversion
    return a + b
# add_numbers("5", 3) would raise TypeError in Python`,
      java: `// Calculator.java - Math utilities with type coercion bug
public class Calculator {
    // BUG: Concatenates instead of adding when inputs are strings
    public static String addNumbers(String a, String b) {
        // BUG: No conversion to numbers - string concatenation occurs
        return a + b;
    }
    // addNumbers("5", "3") returns "53" instead of 8
    // Should parse strings to numbers before adding
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "services/PriceCalculator.js",
          content: `// PriceCalculator - Uses addNumbers for calculations
import { addNumbers } from './calculator.js';

export class PriceCalculator {
  constructor() {
    this.items = [];
  }

  addItem(name, price) {
    // Prices might come from form inputs as strings
    this.items.push({ name, price });
  }

  calculateTotal() {
    let total = 0;
    for (const item of this.items) {
      // BUG: If item.price is a string, concatenation occurs
      total = addNumbers(total, item.price);
    }
    return total;
  }

  calculateWithTax(subtotal, taxRate) {
    // taxRate might be "0.08" from an input field
    const tax = addNumbers(subtotal, taxRate);
    return tax;
  }
}`,
          description: "Price calculator affected by type coercion bug",
        },
        {
          fileName: "utils/formHelpers.js",
          content: `// Form helper utilities
export function getFormValues(formId) {
  const form = document.getElementById(formId);
  const formData = new FormData(form);
  const values = {};

  for (const [key, value] of formData.entries()) {
    // WARNING: All form values are strings!
    values[key] = value;
  }

  return values;
}

// Example usage that causes the bug:
export function handleCheckoutForm() {
  const values = getFormValues('checkout-form');

  // values.quantity is "2" (string)
  // values.price is "10.50" (string)
  // When passed to addNumbers, results in "210.50" instead of 12.50

  return {
    quantity: values.quantity,
    price: values.price,
    itemTotal: addNumbers(values.quantity, values.price)
  };
}`,
          description: "Form helpers that return string values",
        },
        {
          fileName: "tests/calculatorTest.js",
          content: `// Test file showing type coercion issues
import { addNumbers } from './calculator.js';

function testAddNumbers() {
  console.log('=== Testing addNumbers ===\\n');

  // Test 1: Numbers (works correctly)
  console.log('Test 1: addNumbers(5, 3)');
  console.log('Expected: 8');
  console.log('Actual:', addNumbers(5, 3));
  console.log('✅ Pass\\n');

  // Test 2: String + Number (BUG)
  console.log('Test 2: addNumbers("5", 3)');
  console.log('Expected: 8');
  console.log('Actual:', addNumbers("5", 3));
  console.log('❌ Fail - Got "53" (concatenation)\\n');

  // Test 3: Two strings (BUG)
  console.log('Test 3: addNumbers("5", "3")');
  console.log('Expected: 8');
  console.log('Actual:', addNumbers("5", "3"));
  console.log('❌ Fail - Got "53" (concatenation)\\n');

  // Test 4: Decimal strings (BUG)
  console.log('Test 4: addNumbers("10.5", "2.3")');
  console.log('Expected: 12.8');
  console.log('Actual:', addNumbers("10.5", "2.3"));
  console.log('❌ Fail - Got "10.52.3"\\n');
}

testAddNumbers();`,
          description: "Test demonstrating the type coercion bug",
        },
      ],
      typescript: [
        {
          fileName: "services/PriceCalculator.ts",
          content: `// PriceCalculator with proper types (but still buggy)
import { addNumbers } from './calculator';

interface Item {
  name: string;
  price: number | string;  // Problem: allows strings
}

export class PriceCalculator {
  private items: Item[] = [];

  addItem(name: string, price: number | string): void {
    this.items.push({ name, price });
  }

  calculateTotal(): number | string {
    let total: any = 0;
    for (const item of this.items) {
      total = addNumbers(total, item.price);
    }
    return total;
  }
}`,
          description: "TypeScript calculator with loose typing",
        },
      ],
      python: [
        {
          fileName: "services/price_calculator.py",
          content: `# PriceCalculator - Uses add_numbers for calculations
from calculator import add_numbers

class PriceCalculator:
    def __init__(self):
        self.items = []

    def add_item(self, name, price):
        """Add item to cart"""
        # Prices might come from web forms as strings
        self.items.append({"name": name, "price": price})

    def calculate_total(self):
        """Calculate total price"""
        total = 0
        for item in self.items:
            # If item['price'] is a string, this will fail
            try:
                total = add_numbers(total, item['price'])
            except TypeError as e:
                print(f"Error: Cannot add {type(total)} and {type(item['price'])}")
                raise
        return total`,
          description: "Price calculator affected by type issues",
        },
      ],
      java: [
        {
          fileName: "services/PriceCalculator.java",
          content: `// PriceCalculator - Uses addNumbers for calculations
package services;

import java.util.ArrayList;
import java.util.List;

public class PriceCalculator {
    private List<Item> items;

    public PriceCalculator() {
        this.items = new ArrayList<>();
    }

    public void addItem(String name, String price) {
        // Prices might come from web forms/JSON as strings
        items.add(new Item(name, price));
    }

    public String calculateTotal() {
        String total = "0";
        for (Item item : items) {
            // BUG: If item.price is a string, concatenation occurs
            total = Calculator.addNumbers(total, item.price);
        }
        return total;
    }

    public String calculateWithTax(String subtotal, String taxRate) {
        // taxRate might be "0.08" from user input
        return Calculator.addNumbers(subtotal, taxRate);
    }

    static class Item {
        String name;
        String price;

        Item(String name, String price) {
            this.name = name;
            this.price = price;
        }
    }
}`,
          description: "Price calculator affected by type coercion bug",
        },
        {
          fileName: "utils/FormHelpers.java",
          content: `// Form helper utilities
package utils;

import java.util.HashMap;
import java.util.Map;

public class FormHelpers {
    public static Map<String, String> getFormValues(Map<String, String> formData) {
        // WARNING: All form values are strings!
        // Even numeric inputs come as strings
        return new HashMap<>(formData);
    }

    // Example usage that causes the bug:
    public static Map<String, Object> handleCheckoutForm(Map<String, String> formData) {
        Map<String, String> values = getFormValues(formData);

        // values.get("quantity") is "2" (string)
        // values.get("price") is "10.50" (string)
        // When passed to addNumbers, results in "210.50" instead of 12.50

        Map<String, Object> result = new HashMap<>();
        result.put("quantity", values.get("quantity"));
        result.put("price", values.get("price"));
        result.put("itemTotal", Calculator.addNumbers(
            values.get("quantity"),
            values.get("price")
        ));

        return result;
    }
}`,
          description: "Form helpers that return string values",
        },
        {
          fileName: "tests/CalculatorTest.java",
          content: `// Test file showing type coercion issues
package tests;

public class CalculatorTest {
    public static void testAddNumbers() {
        System.out.println("=== Testing addNumbers ===\\n");

        // Test 1: Two number strings (BUG)
        System.out.println("Test 1: addNumbers(\\"5\\", \\"3\\")");
        System.out.println("Expected: 8");
        String result1 = Calculator.addNumbers("5", "3");
        System.out.println("Actual: " + result1);
        System.out.println("❌ Fail - Got \\"53\\" (concatenation)\\n");

        // Test 2: Decimal strings (BUG)
        System.out.println("Test 2: addNumbers(\\"10.5\\", \\"2.3\\")");
        System.out.println("Expected: 12.8");
        String result2 = Calculator.addNumbers("10.5", "2.3");
        System.out.println("Actual: " + result2);
        System.out.println("❌ Fail - Got \\"10.52.3\\"\\n");

        // Test 3: Zero and number (BUG)
        System.out.println("Test 3: addNumbers(\\"0\\", \\"100\\")");
        System.out.println("Expected: 100");
        String result3 = Calculator.addNumbers("0", "100");
        System.out.println("Actual: " + result3);
        System.out.println("❌ Fail - Got \\"0100\\"\\n");

        System.out.println("SOLUTION: Convert strings to numbers before adding:");
        System.out.println("double num1 = Double.parseDouble(a);");
        System.out.println("double num2 = Double.parseDouble(b);");
        System.out.println("return String.valueOf(num1 + num2);");
    }

    public static void main(String[] args) {
        testAddNumbers();
    }
}`,
          description: "Test demonstrating the type coercion bug",
        },
      ],
    },
    expectedBehavior: "Should always return numeric sum, converting strings to numbers",
    bugDescription: "String concatenation happens instead of numeric addition",
    hints: [
      "JavaScript + operator behaves differently with strings vs numbers",
      "Convert inputs to numbers explicitly",
      "Use Number(), parseInt(), parseFloat(), or the + unary operator",
      "Consider using TypeScript with strict types",
    ],
    testCases: [
      {
        input: { a: 5, b: 3 },
        expected: 8,
        description: "Numbers: 5 + 3 = 8",
      },
      {
        input: { a: "5", b: 3 },
        expected: 8,
        description: 'String + Number: "5" + 3 = 8',
      },
      {
        input: { a: "5", b: "3" },
        expected: 8,
        description: 'Two strings: "5" + "3" = 8',
      },
      {
        input: { a: "10.5", b: "2.3" },
        expected: 12.8,
        description: 'Decimal strings: "10.5" + "2.3" = 12.8',
      },
    ],
  },
]
