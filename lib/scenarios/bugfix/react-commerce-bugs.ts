import type { BugFixScenario } from "../types"

export const reactCommerceBugsScenarios: BugFixScenario[] = [
  {
    id: "bugfix-react-state-race-condition",
    title: "Fix Race Condition in React Component",
    type: "bugfix",
    difficulty: "medium",
    companies: ["Meta", "Netflix", "Airbnb"],
    description: "Debug a race condition in a React component with multiple async calls",
    tags: ["react", "async", "race-condition", "hooks"],
    estimatedTime: 25,
    problemStatement: `A user dashboard component is experiencing race conditions when fetching user data and preferences. Sometimes old data overwrites newer data. Debug and fix the issue across multiple files.`,
    buggyCode: {
      javascript: `// UserDashboard.jsx - Main component with race condition
import React, { useState, useEffect } from 'react';
import { fetchUserData } from './api/userApi';
import { UserProfile } from './components/UserProfile';
import { UserPreferences } from './components/UserPreferences';

export function UserDashboard({ userId }) {
  const [userData, setUserData] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // BUG: Race condition - these async calls can complete in any order
    fetchUserData(userId).then(data => {
      setUserData(data);
    });

    fetchUserPreferences(userId).then(prefs => {
      setPreferences(prefs);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <UserProfile user={userData} />
      <UserPreferences preferences={preferences} />
    </div>
  );
}`,
      python: `# user_dashboard.py - Race condition in async data fetching
import asyncio
from api.user_api import fetch_user_data, fetch_user_preferences

class UserDashboard:
    def __init__(self, user_id):
        self.user_id = user_id
        self.user_data = None
        self.preferences = None
        self.loading = True

    async def load_data(self):
        """BUG: Race condition - tasks can complete in any order"""
        self.loading = True

        # BUG: These run concurrently but update state independently
        # If user_id changes during loading, we might show old data
        asyncio.create_task(self._load_user_data(self.user_id))
        asyncio.create_task(self._load_preferences(self.user_id))

    async def _load_user_data(self, user_id):
        data = await fetch_user_data(user_id)
        self.user_data = data  # BUG: Might be for old user_id

    async def _load_preferences(self, user_id):
        prefs = await fetch_user_preferences(user_id)
        self.preferences = prefs  # BUG: Might be for old user_id
        self.loading = False`,
      java: `// UserDashboard.java - Race condition in async data loading
import java.util.concurrent.CompletableFuture;
import api.UserApi;
import models.User;
import models.UserPreferences;

public class UserDashboard {
    private String userId;
    private User userData;
    private UserPreferences preferences;
    private boolean loading;

    public UserDashboard(String userId) {
        this.userId = userId;
        this.loading = true;
    }

    // BUG: Race condition - async calls can complete in any order
    public void loadData() {
        loading = true;

        // BUG: These run independently, can complete in wrong order
        CompletableFuture.supplyAsync(() -> {
            try {
                return UserApi.fetchUserData(userId);
            } catch (Exception e) {
                return null;
            }
        }).thenAccept(data -> {
            this.userData = data; // BUG: Might be for old userId
        });

        CompletableFuture.supplyAsync(() -> {
            try {
                return UserApi.fetchUserPreferences(userId);
            } catch (Exception e) {
                return null;
            }
        }).thenAccept(prefs -> {
            this.preferences = prefs; // BUG: Might be for old userId
            this.loading = false;
        });
    }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "api/userApi.js",
          content: `// API functions for user data
export async function fetchUserData(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);
  // Simulated delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
  return response.json();
}

export async function fetchUserPreferences(userId) {
  const response = await fetch(\`/api/users/\${userId}/preferences\`);
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
  return response.json();
}`,
          description: "API functions with variable latency causing race conditions",
        },
        {
          fileName: "components/UserProfile.jsx",
          content: `// User profile display component
import React from 'react';

export function UserProfile({ user }) {
  if (!user) return null;

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>Email: {user.email}</p>
      <p>Joined: {user.joinedDate}</p>
    </div>
  );
}`,
          description: "Component that displays user profile data",
        },
        {
          fileName: "components/UserPreferences.jsx",
          content: `// User preferences display component
import React from 'react';

export function UserPreferences({ preferences }) {
  if (!preferences) return null;

  return (
    <div className="user-preferences">
      <h3>Preferences</h3>
      <ul>
        <li>Theme: {preferences.theme}</li>
        <li>Notifications: {preferences.notifications ? 'On' : 'Off'}</li>
        <li>Language: {preferences.language}</li>
      </ul>
    </div>
  );
}`,
          description: "Component that displays user preferences",
        },
      ],
      python: [
        {
          fileName: "api/user_api.py",
          content: `# API functions for user data
import asyncio
import random

async def fetch_user_data(user_id):
    """Fetch user data with variable latency"""
    # Simulated delay
    await asyncio.sleep(random.random())
    return {
        'id': user_id,
        'name': f'User {user_id}',
        'email': f'user{user_id}@example.com',
        'joinedDate': '2024-01-01'
    }

async def fetch_user_preferences(user_id):
    """Fetch user preferences with variable latency"""
    await asyncio.sleep(random.random() * 0.5)
    return {
        'theme': 'dark',
        'notifications': True,
        'language': 'en'
    }`,
          description: "API functions with variable latency causing race conditions",
        },
        {
          fileName: "ui/user_dashboard_view.py",
          content: `# User dashboard view component
class UserDashboardView:
    def __init__(self, user_data, preferences):
        self.user_data = user_data
        self.preferences = preferences

    def render(self):
        """Render the dashboard"""
        if not self.user_data:
            return "No user data"

        html = f"""
        <div class="user-profile">
            <h2>{self.user_data.get('name', 'N/A')}</h2>
            <p>Email: {self.user_data.get('email', 'N/A')}</p>
            <p>Joined: {self.user_data.get('joinedDate', 'N/A')}</p>
        </div>
        """

        if self.preferences:
            html += f"""
            <div class="user-preferences">
                <h3>Preferences</h3>
                <ul>
                    <li>Theme: {self.preferences.get('theme', 'N/A')}</li>
                    <li>Notifications: {'On' if self.preferences.get('notifications') else 'Off'}</li>
                    <li>Language: {self.preferences.get('language', 'N/A')}</li>
                </ul>
            </div>
            """

        return html`,
          description: "View component for rendering user dashboard",
        },
        {
          fileName: "tests/test_race_condition.py",
          content: `# Tests demonstrating race condition
import asyncio
import pytest
from api.user_api import fetch_user_data, fetch_user_preferences

@pytest.mark.asyncio
async def test_race_condition_scenario():
    """Demonstrates the race condition bug"""
    user_id = "user1"

    # BUG: These can complete in any order
    task1 = asyncio.create_task(fetch_user_data(user_id))
    task2 = asyncio.create_task(fetch_user_preferences(user_id))

    # If we change user_id here, previous tasks might still update state
    user_id = "user2"

    # The tasks from user1 might complete after we've moved to user2
    result1 = await task1  # Returns data for user1
    result2 = await task2  # Returns data for user1

    # But we're now expecting data for user2!
    # This is the race condition

@pytest.mark.asyncio
async def test_fixed_version():
    """Shows proper handling with cancellation"""
    user_id = "user1"

    # Create tasks
    task1 = asyncio.create_task(fetch_user_data(user_id))
    task2 = asyncio.create_task(fetch_user_preferences(user_id))

    # Simulate user changing
    user_id = "user2"

    # FIXED: Cancel old tasks
    task1.cancel()
    task2.cancel()

    # Start new tasks
    new_task1 = asyncio.create_task(fetch_user_data(user_id))
    new_task2 = asyncio.create_task(fetch_user_preferences(user_id))

    # Now we only get data for user2
    result1 = await new_task1
    result2 = await new_task2

    assert result1['id'] == user_id
    assert result2 is not None`,
          description: "Tests showing race condition and fix",
        },
      ],
      java: [
        {
          fileName: "api/UserApi.java",
          content: `// API functions for user data
package api;

import models.User;
import models.UserPreferences;
import java.util.concurrent.CompletableFuture;
import java.util.Random;

public class UserApi {
    private static final Random random = new Random();

    public static CompletableFuture<User> fetchUserData(String userId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Simulated variable delay
                Thread.sleep((long)(random.nextDouble() * 1000));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            return new User(
                userId,
                "User " + userId,
                "user" + userId + "@example.com",
                "2024-01-01"
            );
        });
    }

    public static CompletableFuture<UserPreferences> fetchUserPreferences(String userId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Simulated variable delay
                Thread.sleep((long)(random.nextDouble() * 500));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            return new UserPreferences("dark", true, "en");
        });
    }
}`,
          description: "API functions with variable latency causing race conditions",
        },
        {
          fileName: "ui/UserDashboardView.java",
          content: `// User dashboard view component
package ui;

import models.User;
import models.UserPreferences;

public class UserDashboardView {
    private User userData;
    private UserPreferences preferences;

    public UserDashboardView(User userData, UserPreferences preferences) {
        this.userData = userData;
        this.preferences = preferences;
    }

    public String render() {
        if (userData == null) {
            return "No user data";
        }

        StringBuilder html = new StringBuilder();
        html.append(String.format("""
            <div class="user-profile">
                <h2>%s</h2>
                <p>Email: %s</p>
                <p>Joined: %s</p>
            </div>
            """, userData.name, userData.email, userData.joinedDate));

        if (preferences != null) {
            html.append(String.format("""
                <div class="user-preferences">
                    <h3>Preferences</h3>
                    <ul>
                        <li>Theme: %s</li>
                        <li>Notifications: %s</li>
                        <li>Language: %s</li>
                    </ul>
                </div>
                """, preferences.theme,
                preferences.notifications ? "On" : "Off",
                preferences.language));
        }

        return html.toString();
    }
}`,
          description: "View component for rendering user dashboard",
        },
        {
          fileName: "tests/RaceConditionTest.java",
          content: `// Tests demonstrating race condition
package tests;

import api.UserApi;
import models.User;
import models.UserPreferences;
import org.junit.jupiter.api.Test;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

public class RaceConditionTest {

    @Test
    public void testRaceConditionScenario() throws Exception {
        // Demonstrates the race condition bug
        AtomicReference<String> currentUserId = new AtomicReference<>("user1");

        // BUG: These can complete in any order
        CompletableFuture<User> userFuture =
            UserApi.fetchUserData(currentUserId.get());
        CompletableFuture<UserPreferences> prefFuture =
            UserApi.fetchUserPreferences(currentUserId.get());

        // Simulate user changing while requests are in flight
        Thread.sleep(100);
        currentUserId.set("user2");

        // The futures from user1 might complete after we've moved to user2
        User user = userFuture.get(); // Returns data for user1
        UserPreferences prefs = prefFuture.get(); // Returns data for user1

        // But we're now expecting data for user2!
        // This is the race condition
        assertNotEquals(currentUserId.get(), user.id);
    }

    @Test
    public void testFixedVersion() throws Exception {
        // Shows proper handling with cancellation
        AtomicReference<String> currentUserId = new AtomicReference<>("user1");

        // Create futures
        CompletableFuture<User> userFuture =
            UserApi.fetchUserData(currentUserId.get());
        CompletableFuture<UserPreferences> prefFuture =
            UserApi.fetchUserPreferences(currentUserId.get());

        // Simulate user changing
        Thread.sleep(100);
        currentUserId.set("user2");

        // FIXED: Cancel old futures
        userFuture.cancel(true);
        prefFuture.cancel(true);

        // Start new futures
        CompletableFuture<User> newUserFuture =
            UserApi.fetchUserData(currentUserId.get());
        CompletableFuture<UserPreferences> newPrefFuture =
            UserApi.fetchUserPreferences(currentUserId.get());

        // Now we only get data for user2
        User user = newUserFuture.get();
        UserPreferences prefs = newPrefFuture.get();

        assertEquals(currentUserId.get(), user.id);
        assertNotNull(prefs);
    }
}`,
          description: "Tests showing race condition and fix",
        },
      ],
    },
    expectedBehavior:
      "Data should load correctly regardless of API response timing, and switching users should cancel previous requests",
    bugDescription:
      "Race condition in async data fetching - old data can overwrite new data when userId changes quickly",
    hints: [
      "Use Promise.all() to wait for all async operations",
      "Implement cleanup in useEffect to handle component unmounting or userId changes",
      "Consider using AbortController to cancel in-flight requests",
      "Store userId in a ref to compare against when data arrives",
    ],
    testCases: [
      {
        input: "Rapidly switch between different userIds",
        expected: "Only data for the current userId is displayed",
        description: "Race condition prevention for rapid user switching",
      },
      {
        input: "Load user with slow API response",
        expected: "Loading state until both API calls complete",
        description: "Slow API response handling",
      },
    ],
  },
  {
    id: "bugfix-ecommerce-cart-memory-leak",
    title: "Fix Memory Leak in Shopping Cart",
    type: "bugfix",
    difficulty: "hard",
    companies: ["Amazon", "Shopify", "Walmart"],
    description: "Find and fix memory leaks in an e-commerce shopping cart system",
    tags: ["memory-leak", "event-listeners", "javascript", "performance"],
    estimatedTime: 30,
    problemStatement: `An e-commerce shopping cart system has memory leaks causing the browser to slow down over time. Users report that after adding/removing items multiple times, the page becomes sluggish. Debug the cart system across multiple files.`,
    buggyCode: {
      javascript: `// ShoppingCart.js - Main cart manager with memory leaks
class ShoppingCart {
  constructor() {
    this.items = [];
    this.listeners = [];
    this.itemElements = new Map();

    // BUG: Event listener never removed
    window.addEventListener('storage', this.syncWithLocalStorage.bind(this));

    // BUG: Interval never cleared
    this.priceUpdateInterval = setInterval(() => {
      this.updatePrices();
    }, 5000);
  }

  addItem(item) {
    this.items.push(item);
    this.renderItem(item);
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  removeItem(itemId) {
    this.items = this.items.filter(item => item.id !== itemId);
    // BUG: Element not removed from Map, causing memory leak
    const element = this.itemElements.get(itemId);
    if (element) {
      element.remove();
    }
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  renderItem(item) {
    const element = document.createElement('div');
    element.className = 'cart-item';
    element.innerHTML = \`
      <span>\${item.name}</span>
      <span>$\${item.price}</span>
      <button data-id="\${item.id}">Remove</button>
    \`;

    // BUG: Event listener added but never cleaned up
    const removeBtn = element.querySelector('button');
    removeBtn.addEventListener('click', () => {
      this.removeItem(item.id);
    });

    this.itemElements.set(item.id, element);
    document.getElementById('cart-items').appendChild(element);
  }

  subscribe(callback) {
    this.listeners.push(callback);
    // BUG: No unsubscribe function returned
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.items));
  }

  syncWithLocalStorage(event) {
    if (event.key === 'cart') {
      this.items = JSON.parse(event.newValue || '[]');
      this.renderAllItems();
    }
  }

  saveToLocalStorage() {
    localStorage.setItem('cart', JSON.stringify(this.items));
  }

  updatePrices() {
    // Fetch latest prices from API
    fetch('/api/prices')
      .then(res => res.json())
      .then(prices => {
        this.items.forEach(item => {
          if (prices[item.id]) {
            item.price = prices[item.id];
          }
        });
        this.renderAllItems();
      });
  }

  renderAllItems() {
    document.getElementById('cart-items').innerHTML = '';
    // BUG: Old elements not properly cleaned from Map
    this.items.forEach(item => this.renderItem(item));
  }
}`,
      python: `# shopping_cart.py - Cart manager with memory leaks
import threading
import json

class ShoppingCart:
    def __init__(self):
        self.items = []
        self.listeners = []
        self.item_elements = {}

        # BUG: Timer never stopped
        self.price_update_timer = threading.Timer(5.0, self._update_prices_loop)
        self.price_update_timer.start()

    def add_item(self, item):
        self.items.append(item)
        self._notify_listeners()

    def remove_item(self, item_id):
        self.items = [item for item in self.items if item['id'] != item_id]
        # BUG: Element not removed from dict, causing memory leak
        self._notify_listeners()

    def subscribe(self, callback):
        self.listeners.append(callback)
        # BUG: No unsubscribe mechanism

    def _notify_listeners(self):
        for listener in self.listeners:
            listener(self.items)

    def _update_prices_loop(self):
        """BUG: Runs forever, never cleaned up"""
        self._update_prices()
        self.price_update_timer = threading.Timer(5.0, self._update_prices_loop)
        self.price_update_timer.start()

    def _update_prices(self):
        # Update prices (simplified)
        pass`,
      java: `// ShoppingCart.java - Cart manager with memory leaks
import java.util.*;
import java.util.concurrent.*;

public class ShoppingCart {
    private List<CartItem> items;
    private List<CartListener> listeners;
    private Map<String, Object> itemElements;
    private ScheduledExecutorService scheduler;
    private ScheduledFuture<?> priceUpdateTask;

    public ShoppingCart() {
        this.items = new ArrayList<>();
        this.listeners = new ArrayList<>();
        this.itemElements = new HashMap<>();

        // BUG: Scheduler never shut down
        this.scheduler = Executors.newScheduledThreadPool(1);
        this.priceUpdateTask = scheduler.scheduleAtFixedRate(
            () -> updatePrices(),
            5, 5, TimeUnit.SECONDS
        );
    }

    public void addItem(CartItem item) {
        items.add(item);
        notifyListeners();
    }

    public void removeItem(String itemId) {
        items.removeIf(item -> item.getId().equals(itemId));
        // BUG: Element not removed from Map, causing memory leak
        notifyListeners();
    }

    public void subscribe(CartListener callback) {
        listeners.add(callback);
        // BUG: No unsubscribe mechanism
    }

    private void notifyListeners() {
        for (CartListener listener : listeners) {
            listener.onCartChanged(new ArrayList<>(items));
        }
    }

    private void updatePrices() {
        // BUG: This runs forever, scheduler never shut down
        // Fetch latest prices (simplified)
    }

    // Missing: cleanup method to stop scheduler and clear listeners
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "CartUI.js",
          content: `// Cart UI component
export class CartUI {
  constructor(cart) {
    this.cart = cart;
    this.updateCartCount();

    // Subscribe to cart changes
    cart.subscribe((items) => {
      this.updateCartCount();
      this.updateTotalPrice(items);
    });
  }

  updateCartCount() {
    const badge = document.getElementById('cart-count');
    if (badge) {
      badge.textContent = this.cart.items.length;
    }
  }

  updateTotalPrice(items) {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const totalElement = document.getElementById('cart-total');
    if (totalElement) {
      totalElement.textContent = \`$\${total.toFixed(2)}\`;
    }
  }
}`,
          description: "UI component that subscribes to cart changes",
        },
        {
          fileName: "ProductPage.js",
          content: `// Product page that creates cart instances
export class ProductPage {
  constructor() {
    this.currentCart = null;
  }

  init() {
    // BUG: Creates new cart instance without cleaning up old one
    this.currentCart = new ShoppingCart();
    new CartUI(this.currentCart);

    this.attachEventListeners();
  }

  attachEventListeners() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const product = this.getProductFromElement(e.target);
        this.currentCart.addItem(product);
      });
    });
  }

  getProductFromElement(element) {
    const card = element.closest('.product-card');
    return {
      id: card.dataset.productId,
      name: card.querySelector('.product-name').textContent,
      price: parseFloat(card.querySelector('.product-price').textContent),
    };
  }

  destroy() {
    // BUG: No cleanup of cart or event listeners
  }
}`,
          description: "Product page that instantiates shopping cart",
        },
      ],
      python: [
        {
          fileName: "cart_ui.py",
          content: `# Cart UI component
class CartUI:
    def __init__(self, cart):
        self.cart = cart
        self.update_cart_count()

        # BUG: Subscribe to cart changes but never unsubscribe
        cart.subscribe(lambda items: self.on_cart_changed(items))

    def update_cart_count(self):
        count = len(self.cart.items)
        print(f"Cart count: {count}")

    def on_cart_changed(self, items):
        """Called when cart changes"""
        self.update_cart_count()
        self.update_total_price(items)

    def update_total_price(self, items):
        total = sum(item.get('price', 0) for item in items)
        print(f"Total: \${total:.2f}")`,
          description: "UI component that subscribes to cart changes without cleanup",
        },
        {
          fileName: "product_page.py",
          content: `# Product page that creates cart instances
from shopping_cart import ShoppingCart
from cart_ui import CartUI

class ProductPage:
    def __init__(self):
        self.current_cart = None

    def init(self):
        # BUG: Creates new cart instance without cleaning up old one
        self.current_cart = ShoppingCart()
        self.cart_ui = CartUI(self.current_cart)

        # Old cart and timer still running in background!

    def navigate_away(self):
        # BUG: No cleanup - timer keeps running
        # listeners keep accumulating
        pass`,
          description: "Page that creates cart instances without proper cleanup",
        },
        {
          fileName: "tests/test_memory_leak.py",
          content: `# Tests to detect memory leaks
import unittest
import gc
import sys
from shopping_cart import ShoppingCart
from cart_ui import CartUI

class TestMemoryLeaks(unittest.TestCase):
    def test_cart_listener_leak(self):
        """Demonstrates listener accumulation"""
        cart = ShoppingCart()
        initial_listeners = len(cart.listeners)

        # Create multiple UIs
        for i in range(10):
            ui = CartUI(cart)
            # BUG: UI is garbage collected but listener remains

        gc.collect()

        # Listeners keep growing!
        self.assertEqual(len(cart.listeners), initial_listeners + 10)
        # This demonstrates the leak - listeners never cleaned up

    def test_timer_leak(self):
        """Shows timer continues running"""
        cart = ShoppingCart()
        # Timer starts in constructor

        # Simulate cart going out of scope
        cart = None
        gc.collect()

        # BUG: Timer still running in background!
        # No way to stop it

if __name__ == '__main__':
    unittest.main()`,
          description: "Tests that demonstrate memory leaks",
        },
      ],
      java: [
        {
          fileName: "ui/CartUI.java",
          content: `// Cart UI component
package ui;

import models.ShoppingCart;
import models.CartItem;
import models.CartListener;
import java.util.List;

public class CartUI {
    private ShoppingCart cart;

    public CartUI(ShoppingCart cart) {
        this.cart = cart;
        updateCartCount();

        // BUG: Subscribe to cart changes but never unsubscribe
        cart.subscribe(new CartListener() {
            @Override
            public void onCartChanged(List<CartItem> items) {
                CartUI.this.onCartChanged(items);
            }
        });
    }

    private void updateCartCount() {
        System.out.println("Cart count: " + cart.getItems().size());
    }

    private void onCartChanged(List<CartItem> items) {
        updateCartCount();
        updateTotalPrice(items);
    }

    private void updateTotalPrice(List<CartItem> items) {
        double total = items.stream()
            .mapToDouble(item -> item.getPrice())
            .sum();
        System.out.printf("Total: $%.2f%n", total);
    }

    // Missing: cleanup/dispose method to unsubscribe
}`,
          description: "UI component that subscribes to cart changes without cleanup",
        },
        {
          fileName: "pages/ProductPage.java",
          content: `// Product page that creates cart instances
package pages;

import models.ShoppingCart;
import ui.CartUI;

public class ProductPage {
    private ShoppingCart currentCart;
    private CartUI cartUI;

    public void init() {
        // BUG: Creates new cart instance without cleaning up old one
        if (currentCart != null) {
            // Old cart's scheduler keeps running!
            // Old listeners accumulate!
        }

        currentCart = new ShoppingCart();
        cartUI = new CartUI(currentCart);

        // Old cart and scheduler still running in background!
    }

    public void navigateAway() {
        // BUG: No cleanup
        // Scheduler keeps running
        // Listeners keep accumulating
        // Memory leak!
    }

    // Missing: cleanup method to stop scheduler and clear listeners
}`,
          description: "Page that creates cart instances without proper cleanup",
        },
        {
          fileName: "tests/MemoryLeakTest.java",
          content: `// Tests to detect memory leaks
package tests;

import models.ShoppingCart;
import models.CartItem;
import ui.CartUI;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class MemoryLeakTest {

    @Test
    public void testCartListenerLeak() {
        // Demonstrates listener accumulation
        ShoppingCart cart = new ShoppingCart();
        int initialListeners = cart.getListenerCount();

        // Create multiple UIs
        for (int i = 0; i < 10; i++) {
            CartUI ui = new CartUI(cart);
            // BUG: UI can be garbage collected but listener remains
        }

        System.gc(); // Suggest garbage collection

        // Listeners keep growing!
        assertEquals(initialListeners + 10, cart.getListenerCount());
        // This demonstrates the leak - listeners never cleaned up
    }

    @Test
    public void testSchedulerLeak() {
        // Shows scheduler continues running
        ShoppingCart cart = new ShoppingCart();
        // Scheduler starts in constructor

        // Get thread count before
        int threadsBefore = Thread.activeCount();

        // Simulate cart going out of scope
        cart = null;
        System.gc();

        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // BUG: Scheduler thread still running!
        // Thread count hasn't decreased
        int threadsAfter = Thread.activeCount();
        assertTrue(threadsAfter >= threadsBefore,
            "Scheduler thread still running after cart disposed");
    }
}`,
          description: "Tests that demonstrate memory leaks",
        },
      ],
    },
    expectedBehavior:
      "Cart should properly clean up event listeners, intervals, and DOM references when items are removed or cart is destroyed",
    bugDescription:
      "Multiple memory leaks: unreleased event listeners, uncanceled intervals, orphaned DOM references in Map, and missing unsubscribe functionality",
    hints: [
      "Add a destroy() method to ShoppingCart that cleans up intervals and event listeners",
      "Return an unsubscribe function from the subscribe() method",
      "Clear itemElements Map entries when removing items",
      "Use AbortController or event listener removal in ProductPage",
      "Consider using WeakMap for element references",
    ],
    testCases: [
      {
        input: "Add and remove 100 items repeatedly",
        expected: "Memory usage stays relatively constant",
        description: "Memory leak prevention with item operations",
      },
      {
        input: "Navigate away from page",
        expected: "All intervals and event listeners are cleaned up",
        description: "Proper cleanup on page navigation",
      },
    ],
  },
]
