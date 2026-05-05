import type { BugFixScenario } from "../types"

export const serviceHookBugsScenarios: BugFixScenario[] = [
  {
    id: "bugfix-api-service-error-handling",
    title: "Fix Error Handling in Microservice API",
    type: "bugfix",
    difficulty: "medium",
    companies: ["Google", "Amazon", "Microsoft"],
    description: "Debug error handling issues in a Node.js microservice API",
    tags: ["node.js", "api", "error-handling", "async"],
    estimatedTime: 25,
    problemStatement: `A microservice API has poor error handling causing crashes and inconsistent error responses. Fix the error handling across the service layer, controller, and middleware.`,
    buggyCode: {
      javascript: `// userController.js - Controller with poor error handling
const UserService = require('./services/UserService');

class UserController {
  async getUser(req, res) {
    const { userId } = req.params;

    // BUG: No try-catch, unhandled promise rejection
    const user = await UserService.getUserById(userId);

    if (!user) {
      // BUG: Inconsistent error response format
      res.status(404).send('User not found');
      return;
    }

    res.json(user);
  }

  async createUser(req, res) {
    const userData = req.body;

    // BUG: Validation errors not caught
    const newUser = await UserService.createUser(userData);

    // BUG: Success but no status code set
    res.json(newUser);
  }

  async updateUser(req, res) {
    const { userId } = req.params;
    const updates = req.body;

    try {
      const updatedUser = await UserService.updateUser(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      // BUG: Generic error handling, loses error details
      res.status(500).json({ error: 'Something went wrong' });
    }
  }

  async deleteUser(req, res) {
    const { userId } = req.params;

    await UserService.deleteUser(userId);

    // BUG: No status code, no error handling
    res.send();
  }
}

module.exports = new UserController();`,
      python: `# user_controller.py - Controller with poor error handling
from services.user_service import UserService

class UserController:
    def __init__(self):
        self.service = UserService()

    async def get_user(self, request):
        user_id = request.params.get('userId')

        # BUG: No try-except, unhandled exception
        user = await self.service.get_user_by_id(user_id)

        if not user:
            # BUG: Inconsistent error response format
            return {'error': 'User not found'}, 404

        return user, 200

    async def create_user(self, request):
        user_data = request.json

        # BUG: Validation errors not caught
        new_user = await self.service.create_user(user_data)

        # BUG: Success but no status code set
        return new_user

    async def delete_user(self, request):
        user_id = request.params.get('userId')

        await self.service.delete_user(user_id)

        # BUG: No status code, no error handling
        return {}`,
      java: `// UserController.java - Controller with poor error handling
package controllers;

import services.UserService;
import models.User;
import javax.ws.rs.*;
import javax.ws.rs.core.Response;

@Path("/users")
public class UserController {
    private UserService userService = new UserService();

    @GET
    @Path("/{userId}")
    public Response getUser(@PathParam("userId") String userId) throws Exception {
        // BUG: No try-catch, throws exception to caller
        User user = userService.getUserById(userId);

        if (user == null) {
            // BUG: Inconsistent error response format
            return Response.status(404).entity("User not found").build();
        }

        return Response.ok(user).build();
    }

    @POST
    public Response createUser(User userData) throws Exception {
        // BUG: Validation errors not caught
        User newUser = userService.createUser(userData);

        // BUG: Success but should return 201 Created
        return Response.ok(newUser).build();
    }

    @PUT
    @Path("/{userId}")
    public Response updateUser(@PathParam("userId") String userId, User updates) {
        try {
            User updatedUser = userService.updateUser(userId, updates);
            return Response.ok(updatedUser).build();
        } catch (Exception error) {
            // BUG: Generic error handling, loses error details
            return Response.status(500)
                .entity("{\"error\": \"Something went wrong\"}")
                .build();
        }
    }

    @DELETE
    @Path("/{userId}")
    public Response deleteUser(@PathParam("userId") String userId) throws Exception {
        userService.deleteUser(userId);

        // BUG: No status code (should be 204 No Content)
        return Response.ok().build();
    }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "services/UserService.js",
          content: `// UserService.js - Service layer with various error conditions
const db = require('../database');

class UserService {
  async getUserById(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // BUG: Database errors not wrapped properly
    const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    return user.rows[0];
  }

  async createUser(userData) {
    // BUG: No validation
    if (!userData.email) {
      throw new Error('Email required');
    }

    // BUG: Duplicate email error not handled specially
    const result = await db.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [userData.name, userData.email]
    );

    return result.rows[0];
  }

  async updateUser(userId, updates) {
    const user = await this.getUserById(userId);

    if (!user) {
      // BUG: Throws generic Error instead of specific NotFoundError
      throw new Error('User not found');
    }

    const result = await db.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [updates.name, updates.email, userId]
    );

    return result.rows[0];
  }

  async deleteUser(userId) {
    // BUG: No check if user exists
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    return true;
  }
}

module.exports = new UserService();`,
          description: "Service layer with database operations and validation",
        },
        {
          fileName: "middleware/errorHandler.js",
          content: `// errorHandler.js - Incomplete error handling middleware
function errorHandler(err, req, res, next) {
  console.error(err);

  // BUG: All errors get 500 status
  res.status(500).json({
    error: err.message
  });

  // BUG: Sensitive error details exposed in production
  // BUG: No error type differentiation
  // BUG: No logging to error tracking service
}

module.exports = errorHandler;`,
          description: "Express error handling middleware",
        },
        {
          fileName: "routes/userRoutes.js",
          content: `// userRoutes.js - Route definitions
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');

router.get('/users/:userId', UserController.getUser);
router.post('/users', UserController.createUser);
router.put('/users/:userId', UserController.updateUser);
router.delete('/users/:userId', UserController.deleteUser);

module.exports = router;`,
          description: "Express route definitions",
        },
      ],
      python: [
        {
          fileName: "services/user_service.py",
          content: `# user_service.py - Service layer with various error conditions
from database import db

class UserService:
    async def get_user_by_id(self, user_id):
        if not user_id:
            raise ValueError('User ID is required')

        # BUG: Database errors not wrapped properly
        user = await db.query('SELECT * FROM users WHERE id = $1', [user_id])
        return user[0] if user else None

    async def create_user(self, user_data):
        # BUG: No validation
        if not user_data.get('email'):
            raise ValueError('Email required')

        # BUG: Duplicate email error not handled specially
        result = await db.query(
            'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
            [user_data.get('name'), user_data.get('email')]
        )
        return result[0]

    async def update_user(self, user_id, updates):
        # BUG: No check if user exists
        result = await db.query(
            'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
            [updates.get('name'), updates.get('email'), user_id]
        )
        return result[0] if result else None

    async def delete_user(self, user_id):
        # BUG: No check if user exists, no return value
        await db.query('DELETE FROM users WHERE id = $1', [user_id])`,
          description: "Service layer with poor error handling",
        },
        {
          fileName: "middleware/error_handler.py",
          content: `# error_handler.py - Error handling middleware
def error_handler(app):
    @app.errorhandler(Exception)
    def handle_error(error):
        # BUG: All errors return 500
        # BUG: Exposes full error message (security risk)
        return {
            'error': str(error),
            'type': type(error).__name__
        }, 500

    # BUG: No differentiation between error types
    # BUG: No logging
    # BUG: Stack traces exposed in production`,
          description: "Error handling middleware with security issues",
        },
        {
          fileName: "tests/test_error_handling.py",
          content: `# test_error_handling.py - Tests for error handling
import pytest
from user_controller import UserController

class TestErrorHandling:
    def test_missing_user_returns_404(self):
        """BUG: This test fails - no proper error handling"""
        controller = UserController()

        # Should return 404, but might crash instead
        # response = await controller.get_user({'params': {'userId': 'invalid'}})
        # assert response[1] == 404

    def test_duplicate_email_handling(self):
        """BUG: Doesn't differentiate duplicate key errors"""
        # Should return 409 Conflict
        # Actually returns generic 500

    def test_validation_errors(self):
        """BUG: No consistent validation error format"""
        # Should return 400 Bad Request with details
        # Actually might crash or return inconsistent format`,
          description: "Tests showing error handling issues",
        },
      ],
      java: [
        {
          fileName: "services/UserService.java",
          content: `// UserService.java - Service layer with various error conditions
package services;

import models.User;
import database.Database;
import java.sql.*;
import java.util.List;

public class UserService {
    private Database db = new Database();

    public User getUserById(String userId) throws Exception {
        if (userId == null || userId.isEmpty()) {
            throw new IllegalArgumentException("User ID is required");
        }

        // BUG: Database errors not wrapped properly
        List<User> users = db.query("SELECT * FROM users WHERE id = ?", userId);
        return users.isEmpty() ? null : users.get(0);
    }

    public User createUser(User userData) throws Exception {
        // BUG: No validation
        if (userData.getEmail() == null) {
            throw new IllegalArgumentException("Email required");
        }

        // BUG: Duplicate email error not handled specially
        // SQLException with specific error code should be caught
        List<User> result = db.query(
            "INSERT INTO users (name, email) VALUES (?, ?) RETURNING *",
            userData.getName(), userData.getEmail()
        );
        return result.get(0);
    }

    public User updateUser(String userId, User updates) throws Exception {
        // BUG: No check if user exists
        List<User> result = db.query(
            "UPDATE users SET name = ?, email = ? WHERE id = ? RETURNING *",
            updates.getName(), updates.getEmail(), userId
        );
        return result.isEmpty() ? null : result.get(0);
    }

    public void deleteUser(String userId) throws Exception {
        // BUG: No check if user exists, no indication if anything was deleted
        db.execute("DELETE FROM users WHERE id = ?", userId);
    }
}`,
          description: "Service layer with poor error handling",
        },
        {
          fileName: "middleware/ErrorHandler.java",
          content: `// ErrorHandler.java - Error handling middleware
package middleware;

import javax.ws.rs.core.Response;
import javax.ws.rs.ext.ExceptionMapper;
import javax.ws.rs.ext.Provider;
import java.sql.SQLException;

@Provider
public class ErrorHandler implements ExceptionMapper<Exception> {

    @Override
    public Response toResponse(Exception exception) {
        // BUG: All errors return 500
        // BUG: Exposes full error message (security risk)
        String errorMessage = exception.getMessage();
        String stackTrace = getStackTrace(exception);

        // BUG: Stack traces exposed in production
        return Response.status(500)
            .entity(String.format(
                "{\"error\": \"%s\", \"type\": \"%s\", \"stack\": \"%s\"}",
                errorMessage,
                exception.getClass().getName(),
                stackTrace
            ))
            .build();

        // BUG: No differentiation between error types
        // BUG: No logging
        // SQLException, IllegalArgumentException, etc. all return same status
    }

    private String getStackTrace(Exception e) {
        StringBuilder sb = new StringBuilder();
        for (StackTraceElement element : e.getStackTrace()) {
            sb.append(element.toString()).append("\\n");
        }
        return sb.toString();
    }
}`,
          description: "Error handling middleware with security issues",
        },
        {
          fileName: "tests/ErrorHandlingTest.java",
          content: `// ErrorHandlingTest.java - Tests for error handling
package tests;

import controllers.UserController;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import javax.ws.rs.core.Response;

public class ErrorHandlingTest {

    @Test
    public void testMissingUserReturns404() {
        // BUG: This test fails - no proper error handling
        UserController controller = new UserController();

        try {
            Response response = controller.getUser("invalid-id");
            // Should return 404, but might throw exception instead
            assertEquals(404, response.getStatus());
        } catch (Exception e) {
            fail("Should not throw exception, should return 404");
        }
    }

    @Test
    public void testDuplicateEmailHandling() {
        // BUG: Doesn't differentiate duplicate key errors
        // Should return 409 Conflict
        // Actually returns generic 500
    }

    @Test
    public void testValidationErrors() {
        // BUG: No consistent validation error format
        // Should return 400 Bad Request with details
        // Actually might throw exception or return inconsistent format
    }

    @Test
    public void testErrorResponseFormat() {
        // BUG: Errors expose stack traces
        // Security risk - internal details leaked
    }
}`,
          description: "Tests showing error handling issues",
        },
      ],
    },
    expectedBehavior:
      "All errors should be properly caught, logged, and returned with appropriate status codes and consistent error response format",
    bugDescription:
      "Multiple error handling issues: unhandled promise rejections, inconsistent error responses, missing status codes, poor error differentiation, and security issues",
    hints: [
      "Wrap all async controller methods in try-catch or use async error handling middleware",
      "Create custom error classes (NotFoundError, ValidationError, etc.)",
      "Implement consistent error response format across all endpoints",
      "Add proper HTTP status codes for different error types",
      "Improve errorHandler middleware to differentiate error types",
      "Don't expose sensitive error details in production",
    ],
    testCases: [
      {
        input: "Request non-existent user",
        expected: "404 status with consistent error format",
        description: "User not found error handling",
      },
      {
        input: "Create user with duplicate email",
        expected: "409 Conflict with appropriate error message",
        description: "Duplicate email conflict handling",
      },
      {
        input: "Database connection failure",
        expected: "500 error without exposing internal details",
        description: "Database error handling without exposing internals",
      },
    ],
  },
  {
    id: "bugfix-react-hook-dependency",
    title: "React useEffect Dependency Bug",
    type: "bugfix",
    difficulty: "medium",
    companies: ["Meta", "Airbnb", "Netflix", "Google"],
    description: "Fix missing dependencies in useEffect causing stale closures and infinite loops",
    tags: ["react", "hooks", "closure", "dependencies"],
    estimatedTime: 20,
    problemStatement: `A React component has a useEffect hook with missing dependencies, causing stale closures and unexpected behavior. The component fetches user data but shows outdated information when the user ID changes.`,
    buggyCode: {
      javascript: `import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // BUG: Missing userId in dependency array
  useEffect(() => {
    setLoading(true);
    fetch(\`/api/users/\${userId}\`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, []); // BUG: Empty dependency array

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>No user</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>ID: {user.id}</p>
    </div>
  );
}`,
      typescript: `import { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
}

interface UserProfileProps {
  userId: number;
}

function UserProfile({ userId }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // BUG: Missing userId in dependency array
  useEffect(() => {
    setLoading(true);
    fetch(\`/api/users/\${userId}\`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, []); // BUG: Empty dependency array

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>No user</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>ID: {user.id}</p>
    </div>
  );
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "App.jsx",
          content: `import { useState } from 'react';
import UserProfile from './UserProfile';

function App() {
  const [currentUserId, setCurrentUserId] = useState(1);

  return (
    <div>
      <button onClick={() => setCurrentUserId(1)}>User 1</button>
      <button onClick={() => setCurrentUserId(2)}>User 2</button>
      <button onClick={() => setCurrentUserId(3)}>User 3</button>
      <UserProfile userId={currentUserId} />
    </div>
  );
}`,
          description: "Parent component that changes user ID",
        },
      ],
      typescript: [
        {
          fileName: "App.tsx",
          content: `import { useState } from 'react';
import UserProfile from './UserProfile';

function App() {
  const [currentUserId, setCurrentUserId] = useState(1);

  return (
    <div>
      <button onClick={() => setCurrentUserId(1)}>User 1</button>
      <button onClick={() => setCurrentUserId(2)}>User 2</button>
      <button onClick={() => setCurrentUserId(3)}>User 3</button>
      <UserProfile userId={currentUserId} />
    </div>
  );
}`,
          description: "Parent component that changes user ID",
        },
      ],
    },
    expectedBehavior:
      "When userId prop changes, the component should fetch and display the new user data",
    bugDescription:
      "The useEffect has an empty dependency array, so it only runs once on mount. When userId changes, the effect doesn't re-run, showing stale data.",
    hints: [
      "Add userId to the useEffect dependency array",
      "Consider adding cleanup function to cancel pending requests",
      "Use AbortController to prevent race conditions",
    ],
    testCases: [
      {
        input: "userId changes from 1 to 2",
        expected: "Component fetches and displays user 2 data",
        description: "Effect should re-run on prop change",
      },
      {
        input: "Rapid userId changes",
        expected: "Only the latest user data is displayed (no race conditions)",
        description: "Race condition handling with rapid changes",
      },
    ],
  },
]
