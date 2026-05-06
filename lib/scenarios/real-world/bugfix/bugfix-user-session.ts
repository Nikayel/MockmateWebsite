import type { BugFixScenario } from "../../types"

export const bugfixUserSessionScenario: BugFixScenario = {
  id: "bugfix-user-session",
  title: "User Session Memory Leak",
  type: "bugfix",
  difficulty: "medium",
  companies: ["Meta", "Google", "Netflix", "Slack"],
  description: "Fix a memory leak in the user session management system causing server crashes",
  tags: ["memory-leak", "sessions", "garbage-collection", "performance"],
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
        fileName: "session-manager.test.js",
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
        description: "Tests for SessionManager including memory leak detection",
      },
    ],
    python: [],
  },
  expectedBehavior:
    "Sessions should be properly cleaned up when they expire, including event listeners, timeouts, and all references.",
  bugDescription:
    "When sessions expire, event listeners and timeouts are not removed, causing memory to accumulate over time. The eventListeners array grows indefinitely and listeners remain attached to the global event emitter.",
  hints: [
    "Look at what happens in expireSession vs destroySession",
    "Event listeners are being added but never removed",
    "The eventListeners array keeps growing even after sessions expire",
    "Consider storing the listener reference with the session so it can be removed later",
  ],
  testCases: [
    {
      input: { action: "create", userId: "user1", userData: { name: "Test" } },
      expected: { success: true, sessionCount: 1 },
      description: "Session creation should work",
    },
    {
      input: { action: "expire", sessionCount: 100 },
      expected: { sessions: 0, listeners: 0, timeouts: 0 },
      description: "All resources should be freed after expiry",
    },
  ],
}
