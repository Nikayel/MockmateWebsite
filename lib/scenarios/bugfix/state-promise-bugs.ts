import type { BugFixScenario } from "../types"

export const statePromiseBugsScenarios: BugFixScenario[] = [
  {
    id: "bugfix-state-mutation",
    title: "Fix State Mutation in React",
    type: "bugfix",
    difficulty: "medium",
    companies: ["Meta", "Amazon"],
    description: "Fix direct state mutation causing component not to re-render",
    tags: ["react", "state", "mutation", "immutability"],
    estimatedTime: 15,
    problemStatement: `This React component tries to add items to a todo list, but the UI doesn't update. Fix the state mutation issue.`,
    buggyCode: {
      javascript: `function TodoList() {
  const [todos, setTodos] = useState([]);

  const addTodo = (text) => {
    todos.push({ text, completed: false });
    setTodos(todos);
  };

  return (/*...*/);
}`,
      typescript: `function TodoList() {
  const [todos, setTodos] = useState<Array<{text: string, completed: boolean}>>([]);

  const addTodo = (text: string) => {
    todos.push({ text, completed: false });
    setTodos(todos);
  };

  return (/*...*/);
}`,
      python: `# Python example with observable pattern
class TodoList:
    def __init__(self):
        self.todos = []
        self.observers = []

    def add_todo(self, text):
        # BUG: Direct mutation doesn't notify observers
        self.todos.append({'text': text, 'completed': False})
        self.notify_observers(self.todos)  # Same reference!

    def notify_observers(self, todos):
        # Observers check reference equality, won't update
        for observer in self.observers:
            observer.update(todos)`,
      java: `// TodoListManager.java - State mutation bug with observers
import java.util.*;

public class TodoListManager {
    private List<Todo> todos = new ArrayList<>();
    private List<TodoObserver> observers = new ArrayList<>();

    public void addTodo(String text) {
        // BUG: Direct mutation doesn't trigger observer updates
        todos.add(new Todo(text, false));
        notifyObservers(todos); // Same reference!
    }

    private void notifyObservers(List<Todo> todos) {
        // Observers check reference equality, won't detect change
        for (TodoObserver observer : observers) {
            observer.onTodosChanged(todos);
        }
    }
}`,
    },
    expectedBehavior: "Should create new array instead of mutating, triggering re-render",
    bugDescription: "Direct array mutation prevents React from detecting state changes",
    hints: [
      "React uses shallow comparison to detect state changes",
      "Mutating the array and passing the same reference doesn't trigger re-render",
      "Create a new array using spread operator or concat",
    ],
    testCases: [
      {
        input: 'Add todo "Buy milk"',
        expected: "UI updates to show new todo",
        description: "Adding todo should trigger re-render",
      },
    ],
    codebaseFiles: {
      javascript: [
        {
          fileName: "components/TodoList.jsx",
          content: `import React, { useState } from 'react';
import { TodoItem } from './TodoItem';

export function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn React', completed: false },
    { id: 2, text: 'Build a project', completed: false }
  ]);
  const [inputText, setInputText] = useState('');

  // BUG: Direct array mutation doesn't trigger re-render
  const addTodo = (text) => {
    const newTodo = {
      id: Date.now(),
      text,
      completed: false
    };

    // BUG: This mutates the array in place
    todos.push(newTodo);
    setTodos(todos); // Same reference, React doesn't detect change!

    setInputText('');
  };

  // This has the same bug
  const toggleTodo = (id) => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed; // BUG: Direct mutation
      setTodos(todos); // Same reference, no re-render!
    }
  };

  // This also has the bug
  const deleteTodo = (id) => {
    const index = todos.findIndex(t => t.id === id);
    if (index !== -1) {
      todos.splice(index, 1); // BUG: Mutates array
      setTodos(todos); // Same reference, no re-render!
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      addTodo(inputText.trim());
    }
  };

  return (
    <div className="todo-list">
      <h1>My Todo List</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Add a new todo..."
        />
        <button type="submit">Add</button>
      </form>

      <ul>
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
        ))}
      </ul>

      <div className="stats">
        <p>Total: {todos.length}</p>
        <p>Completed: {todos.filter(t => t.completed).length}</p>
      </div>
    </div>
  );
}`,
          description: "TodoList component with state mutation bugs - UI does not update",
        },
        {
          fileName: "components/TodoItem.jsx",
          content: `import React from 'react';

export function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className={todo.completed ? 'completed' : ''}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <span>{todo.text}</span>
      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </li>
  );
}`,
          description: "TodoItem child component that displays individual todos",
        },
        {
          fileName: "tests/TodoList.test.jsx",
          content: `import { render, screen, fireEvent } from '@testing-library/react';
import { TodoList } from '../components/TodoList';

describe('TodoList State Mutation Bug', () => {
  test('demonstrates bug - new todos do not appear in UI', () => {
    render(<TodoList />);

    // Initial state: 2 todos
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    // Add a new todo
    const input = screen.getByPlaceholderText('Add a new todo...');
    const addButton = screen.getByText('Add');

    fireEvent.change(input, { target: { value: 'Buy milk' } });
    fireEvent.click(addButton);

    // BUG: UI does not update!
    // This assertion FAILS because the component doesn't re-render
    expect(screen.getAllByRole('listitem')).toHaveLength(3); // FAILS!

    // We still see only 2 items because React didn't detect the change
    expect(screen.getAllByRole('listitem')).toHaveLength(2); // Actual behavior

    // The todo was added to the array (in memory) but UI doesn't show it
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
  });

  test('demonstrates toggle bug - checkboxes do not update', () => {
    render(<TodoList />);

    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];

    // Initially unchecked
    expect(firstCheckbox).not.toBeChecked();

    // Click to toggle
    fireEvent.click(firstCheckbox);

    // BUG: Checkbox does not update in UI
    expect(firstCheckbox).toBeChecked(); // FAILS!
    expect(firstCheckbox).not.toBeChecked(); // Still unchecked in UI
  });

  test('demonstrates delete bug - items do not disappear', () => {
    render(<TodoList />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    // Click delete on first item
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    // BUG: Item does not disappear from UI
    expect(screen.getAllByRole('listitem')).toHaveLength(1); // FAILS!
    expect(screen.getAllByRole('listitem')).toHaveLength(2); // Still 2 items
  });

  test('explains why the bug happens', () => {
    // The bug occurs because:
    const originalArray = [{ id: 1, text: 'Item 1' }];

    // Mutating the array
    originalArray.push({ id: 2, text: 'Item 2' });

    // The reference is still the same
    const sameArray = originalArray;
    expect(originalArray === sameArray).toBe(true);

    // React uses Object.is() for comparison (similar to ===)
    // Since the reference didn't change, React thinks nothing changed
    // So it doesn't re-render

    // Correct approach: create new array
    const newArray = [...originalArray, { id: 3, text: 'Item 3' }];
    expect(originalArray === newArray).toBe(false); // Different reference!
  });
});`,
          description: "Tests using React Testing Library showing mutation bugs",
        },
        {
          fileName: "examples/stateMutationExamples.jsx",
          content: `import React, { useState } from 'react';

// Example 1: WRONG - Direct mutation
export function TodoListBuggy() {
  const [todos, setTodos] = useState([]);

  const addTodo = (text) => {
    todos.push({ text, completed: false }); // WRONG: Mutates array
    setTodos(todos); // Same reference, no re-render
  };

  // UI won't update!
  return (/*...*/);
}

// Example 2: CORRECT - Create new array
export function TodoListFixed() {
  const [todos, setTodos] = useState([]);

  const addTodo = (text) => {
    // Method 1: Spread operator
    setTodos([...todos, { text, completed: false }]); // ✓ New array

    // Method 2: concat
    // setTodos(todos.concat({ text, completed: false })); // ✓ New array

    // Method 3: Array.from with modification
    // setTodos(Array.from(todos).concat({ text, completed: false })); // ✓
  };

  // UI updates correctly!
  return (/*...*/);
}

// Example 3: Toggle with mutation (WRONG)
export function toggleTodoBuggy(todos, setTodos, id) {
  const todo = todos.find(t => t.id === id);
  todo.completed = !todo.completed; // WRONG: Mutates object
  setTodos(todos); // No re-render
}

// Example 4: Toggle immutably (CORRECT)
export function toggleTodoFixed(todos, setTodos, id) {
  setTodos(todos.map(todo =>
    todo.id === id
      ? { ...todo, completed: !todo.completed } // New object
      : todo
  ));
}

// Example 5: Delete with mutation (WRONG)
export function deleteTodoBuggy(todos, setTodos, id) {
  const index = todos.findIndex(t => t.id === id);
  todos.splice(index, 1); // WRONG: Mutates array
  setTodos(todos); // No re-render
}

// Example 6: Delete immutably (CORRECT)
export function deleteTodoFixed(todos, setTodos, id) {
  setTodos(todos.filter(todo => todo.id !== id)); // New array
}

// Example 7: Why this matters - React's comparison
function ReactComparison() {
  // React uses Object.is() which is similar to ===

  const arr1 = [1, 2, 3];
  const arr2 = arr1;
  arr2.push(4);

  console.log(arr1 === arr2); // true - same reference!
  // React sees this as "no change" and doesn't re-render

  const arr3 = [1, 2, 3];
  const arr4 = [...arr3, 4];

  console.log(arr3 === arr4); // false - different references!
  // React sees this as "changed" and re-renders
}`,
          description: "Examples showing wrong vs correct state updates in React",
        },
      ],
      typescript: [
        {
          fileName: "components/TodoList.tsx",
          content: `import React, { useState } from 'react';
import { TodoItem } from './TodoItem';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'Learn React', completed: false },
    { id: 2, text: 'Build a project', completed: false }
  ]);
  const [inputText, setInputText] = useState('');

  // BUG: Direct array mutation doesn't trigger re-render
  const addTodo = (text: string) => {
    const newTodo: Todo = {
      id: Date.now(),
      text,
      completed: false
    };

    // BUG: This mutates the array in place
    todos.push(newTodo);
    setTodos(todos); // Same reference, React doesn't detect change!

    setInputText('');
  };

  const toggleTodo = (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed; // BUG: Direct mutation
      setTodos(todos); // Same reference, no re-render!
    }
  };

  const deleteTodo = (id: number) => {
    const index = todos.findIndex(t => t.id === id);
    if (index !== -1) {
      todos.splice(index, 1); // BUG: Mutates array
      setTodos(todos); // Same reference, no re-render!
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      addTodo(inputText.trim());
    }
  };

  return (
    <div className="todo-list">
      <h1>My Todo List</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Add a new todo..."
        />
        <button type="submit">Add</button>
      </form>

      <ul>
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
        ))}
      </ul>

      <div className="stats">
        <p>Total: {todos.length}</p>
        <p>Completed: {todos.filter(t => t.completed).length}</p>
      </div>
    </div>
  );
}`,
          description: "TodoList component with state mutation bugs - UI does not update",
        },
        {
          fileName: "components/TodoItem.tsx",
          content: `import React from 'react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <li className={todo.completed ? 'completed' : ''}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <span>{todo.text}</span>
      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </li>
  );
}`,
          description: "TodoItem child component that displays individual todos",
        },
        {
          fileName: "tests/TodoList.test.tsx",
          content: `import { render, screen, fireEvent } from '@testing-library/react';
import { TodoList } from '../components/TodoList';

describe('TodoList State Mutation Bug', () => {
  test('demonstrates bug - new todos do not appear in UI', () => {
    render(<TodoList />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    const input = screen.getByPlaceholderText('Add a new todo...');
    const addButton = screen.getByText('Add');

    fireEvent.change(input, { target: { value: 'Buy milk' } });
    fireEvent.click(addButton);

    // BUG: UI does not update!
    expect(screen.getAllByRole('listitem')).toHaveLength(3); // FAILS!
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
  });

  test('explains why the bug happens', () => {
    const originalArray = [{ id: 1, text: 'Item 1' }];
    originalArray.push({ id: 2, text: 'Item 2' });

    const sameArray = originalArray;
    expect(originalArray === sameArray).toBe(true);

    // React doesn't detect the change because reference is the same
    const newArray = [...originalArray, { id: 3, text: 'Item 3' }];
    expect(originalArray === newArray).toBe(false); // Different reference!
  });
});`,
          description: "Tests using React Testing Library showing mutation bugs",
        },
      ],
      python: [
        {
          fileName: "models/todo_list.py",
          content: `from typing import List, Dict, Callable

class TodoList:
    """TodoList with observer pattern showing state mutation bug"""

    def __init__(self):
        self.todos: List[Dict] = [
            {'id': 1, 'text': 'Learn Python', 'completed': False},
            {'id': 2, 'text': 'Build a project', 'completed': False}
        ]
        self.observers: List[Callable] = []
        self._last_notified_reference = None

    def add_observer(self, observer: Callable):
        self.observers.append(observer)

    def add_todo(self, text: str) -> None:
        """BUG: Direct mutation doesn't trigger observer updates"""
        import time
        new_todo = {
            'id': int(time.time() * 1000),
            'text': text,
            'completed': False
        }

        # BUG: This mutates the list in place
        self.todos.append(new_todo)
        self.notify_observers(self.todos)  # Same reference!

    def toggle_todo(self, todo_id: int) -> None:
        """BUG: Direct mutation of todo object"""
        todo = next((t for t in self.todos if t['id'] == todo_id), None)
        if todo:
            todo['completed'] = not todo['completed']  # BUG: Direct mutation
            self.notify_observers(self.todos)  # Same reference!

    def delete_todo(self, todo_id: int) -> None:
        """BUG: Direct mutation using remove"""
        todo = next((t for t in self.todos if t['id'] == todo_id), None)
        if todo:
            self.todos.remove(todo)  # BUG: Mutates list
            self.notify_observers(self.todos)  # Same reference!

    def notify_observers(self, todos: List[Dict]) -> None:
        """Observers check reference equality, won't detect change"""
        # Check if reference changed
        if self._last_notified_reference is todos:
            # Same reference - observers might not update
            print("WARNING: Same reference - observers may not update!")

        self._last_notified_reference = todos

        for observer in self.observers:
            observer(todos)`,
          description: "TodoList with observer pattern showing state mutation bugs",
        },
        {
          fileName: "ui/todo_display.py",
          content: `from models.todo_list import TodoList

class TodoDisplay:
    """UI component that observes TodoList"""

    def __init__(self, todo_list: TodoList):
        self.todo_list = todo_list
        self.last_todos_reference = None
        self.render_count = 0

        # Subscribe to changes
        todo_list.add_observer(self.on_todos_changed)

    def on_todos_changed(self, todos):
        """BUG: Won't detect changes if reference is the same"""
        # Check if reference changed
        if self.last_todos_reference is todos:
            print(f"Display NOT updated - same reference (todos: {len(todos)})")
            return  # No re-render because reference didn't change!

        print(f"Display updated - new reference (todos: {len(todos)})")
        self.last_todos_reference = todos
        self.render_count += 1

    def demonstrate_bug(self):
        """Shows the state mutation bug in action"""
        print(f"\\nInitial render count: {self.render_count}")
        print(f"Initial todos: {len(self.todo_list.todos)}")

        # Try to add a todo
        self.todo_list.add_todo("Buy milk")
        print(f"After adding todo - render count: {self.render_count}")
        print(f"Actual todos in list: {len(self.todo_list.todos)}")

        # The list was updated, but display wasn't re-rendered!
        # This demonstrates the React state mutation bug in Python

    def demonstrate_fix(self):
        """Shows the correct way to notify changes"""
        print("\\n--- Using Fixed Version ---")

        # Create a new list reference
        self.todo_list.todos = [*self.todo_list.todos]
        self.todo_list.notify_observers(self.todo_list.todos)

        print(f"After fix - render count: {self.render_count}")`,
          description: "UI component that observes todo list and demonstrates update bug",
        },
        {
          fileName: "tests/test_state_mutation.py",
          content: `import unittest
from models.todo_list import TodoList
from ui.todo_display import TodoDisplay

class TestStateMutationBug(unittest.TestCase):
    def setUp(self):
        self.todo_list = TodoList()

    def test_mutation_same_reference(self):
        """Demonstrates that mutation keeps the same reference"""
        original_ref = self.todo_list.todos

        # Mutate the list
        self.todo_list.todos.append({'id': 3, 'text': 'Test', 'completed': False})

        # Reference is the same!
        self.assertIs(self.todo_list.todos, original_ref)
        self.assertEqual(len(self.todo_list.todos), 3)

    def test_new_list_different_reference(self):
        """Shows that creating new list changes reference"""
        original_ref = self.todo_list.todos

        # Create new list
        self.todo_list.todos = [*self.todo_list.todos, {'id': 3, 'text': 'Test', 'completed': False}]

        # Reference is different!
        self.assertIsNot(self.todo_list.todos, original_ref)
        self.assertEqual(len(self.todo_list.todos), 3)

    def test_display_not_updated_on_mutation(self):
        """Demonstrates the bug - display doesn't update"""
        display = TodoDisplay(self.todo_list)

        initial_renders = display.render_count

        # Add todo (which mutates in place)
        self.todo_list.add_todo("Buy milk")

        # Display was NOT updated because reference didn't change
        self.assertEqual(display.render_count, initial_renders)

        # But the todo was actually added to the list!
        self.assertEqual(len(self.todo_list.todos), 3)

if __name__ == '__main__':
    unittest.main()`,
          description: "Tests demonstrating state mutation bugs in Python",
        },
      ],
      java: [
        {
          fileName: "models/TodoListManager.java",
          content: `// TodoList manager with observer pattern showing state mutation bug
package models;

import java.util.*;

public class TodoListManager {
    public static class Todo {
        public long id;
        public String text;
        public boolean completed;

        public Todo(long id, String text, boolean completed) {
            this.id = id;
            this.text = text;
            this.completed = completed;
        }
    }

    public interface TodoObserver {
        void onTodosChanged(List<Todo> todos);
    }

    private List<Todo> todos;
    private List<TodoObserver> observers;
    private List<Todo> lastNotifiedReference;

    public TodoListManager() {
        this.todos = new ArrayList<>();
        this.observers = new ArrayList<>();

        // Initial todos
        todos.add(new Todo(1, "Learn Java", false));
        todos.add(new Todo(2, "Build a project", false));
    }

    public void addObserver(TodoObserver observer) {
        observers.add(observer);
    }

    // BUG: Direct mutation doesn't trigger observer updates
    public void addTodo(String text) {
        Todo newTodo = new Todo(System.currentTimeMillis(), text, false);

        // BUG: This mutates the list in place
        todos.add(newTodo);
        notifyObservers(todos);  // Same reference!
    }

    // BUG: Direct mutation of todo object
    public void toggleTodo(long todoId) {
        Todo todo = todos.stream()
            .filter(t -> t.id == todoId)
            .findFirst()
            .orElse(null);

        if (todo != null) {
            todo.completed = !todo.completed;  // BUG: Direct mutation
            notifyObservers(todos);  // Same reference, no update!
        }
    }

    // BUG: Direct mutation using remove
    public void deleteTodo(long todoId) {
        todos.removeIf(t -> t.id == todoId);  // BUG: Mutates list
        notifyObservers(todos);  // Same reference!
    }

    private void notifyObservers(List<Todo> todos) {
        // Check if reference changed
        if (lastNotifiedReference == todos) {
            System.out.println("WARNING: Same reference - observers may not update!");
        }

        lastNotifiedReference = todos;

        for (TodoObserver observer : observers) {
            observer.onTodosChanged(todos);
        }
    }

    public List<Todo> getTodos() {
        return todos;
    }
}`,
          description: "TodoList manager with observer pattern showing state mutation bugs",
        },
        {
          fileName: "ui/TodoDisplay.java",
          content: `// UI component that observes TodoList
package ui;

import models.TodoListManager;
import models.TodoListManager.Todo;
import models.TodoListManager.TodoObserver;
import java.util.List;

public class TodoDisplay implements TodoObserver {
    private TodoListManager todoList;
    private List<Todo> lastTodosReference;
    private int renderCount;

    public TodoDisplay(TodoListManager todoList) {
        this.todoList = todoList;
        this.lastTodosReference = null;
        this.renderCount = 0;

        // Subscribe to changes
        todoList.addObserver(this);
    }

    @Override
    public void onTodosChanged(List<Todo> todos) {
        // BUG: Won't detect changes if reference is the same
        // Check if reference changed using identity comparison
        if (lastTodosReference == todos) {
            System.out.println("Display NOT updated - same reference (todos: " + todos.size() + ")");
            return;  // No re-render because reference didn't change!
        }

        System.out.println("Display updated - new reference (todos: " + todos.size() + ")");
        lastTodosReference = todos;
        renderCount++;
    }

    public void demonstrateBug() {
        System.out.println("\\nInitial render count: " + renderCount);
        System.out.println("Initial todos: " + todoList.getTodos().size());

        // Try to add a todo
        todoList.addTodo("Buy milk");
        System.out.println("After adding todo - render count: " + renderCount);
        System.out.println("Actual todos in list: " + todoList.getTodos().size());

        // The list was updated, but display wasn't re-rendered!
        // This demonstrates the React state mutation bug in Java
    }

    public void demonstrateFix() {
        System.out.println("\\n--- Using Fixed Version ---");

        // Create a new list reference
        List<Todo> newList = new ArrayList<>(todoList.getTodos());
        // This would trigger update because it's a new reference
        onTodosChanged(newList);

        System.out.println("After fix - render count: " + renderCount);
    }

    public int getRenderCount() {
        return renderCount;
    }
}`,
          description: "UI component that observes todo list and demonstrates update bug",
        },
        {
          fileName: "tests/StateMutationTest.java",
          content: `// Tests demonstrating state mutation bugs
package tests;

import models.TodoListManager;
import models.TodoListManager.Todo;
import ui.TodoDisplay;
import java.util.*;

public class StateMutationTest {

    public static void testMutationSameReference() {
        System.out.println("\\n=== Test: Mutation Same Reference ===");

        TodoListManager todoList = new TodoListManager();
        List<Todo> originalRef = todoList.getTodos();

        // Mutate the list
        todoList.getTodos().add(new Todo(3, "Test", false));

        // Reference is the same!
        boolean sameReference = (todoList.getTodos() == originalRef);
        System.out.println("Same reference after mutation: " + sameReference);
        System.out.println("Todo count: " + todoList.getTodos().size());

        assert sameReference : "Reference should be the same after mutation";
        assert todoList.getTodos().size() == 3 : "Should have 3 todos";
    }

    public static void testNewListDifferentReference() {
        System.out.println("\\n=== Test: New List Different Reference ===");

        TodoListManager todoList = new TodoListManager();
        List<Todo> originalRef = todoList.getTodos();

        // Create new list (this would be the fix)
        List<Todo> newList = new ArrayList<>(todoList.getTodos());
        newList.add(new Todo(3, "Test", false));

        // Reference is different!
        boolean differentReference = (newList != originalRef);
        System.out.println("Different reference with new list: " + differentReference);
        System.out.println("New list todo count: " + newList.size());

        assert differentReference : "Reference should be different";
        assert newList.size() == 3 : "Should have 3 todos";
    }

    public static void testDisplayNotUpdatedOnMutation() {
        System.out.println("\\n=== Test: Display Not Updated on Mutation ===");

        TodoListManager todoList = new TodoListManager();
        TodoDisplay display = new TodoDisplay(todoList);

        int initialRenders = display.getRenderCount();

        // Add todo (which mutates in place)
        todoList.addTodo("Buy milk");

        // Display was NOT updated because reference didn't change
        System.out.println("Initial renders: " + initialRenders);
        System.out.println("Current renders: " + display.getRenderCount());
        System.out.println("Actual todo count: " + todoList.getTodos().size());

        assert display.getRenderCount() == initialRenders :
            "Render count should not increase due to mutation";

        // But the todo was actually added to the list!
        assert todoList.getTodos().size() == 3 : "Should have 3 todos";
    }

    public static void main(String[] args) {
        testMutationSameReference();
        testNewListDifferentReference();
        testDisplayNotUpdatedOnMutation();

        System.out.println("\\n=== All tests completed ===");
    }
}`,
          description: "Tests demonstrating state mutation bugs in Java",
        },
      ],
    },
  },
  {
    id: "bugfix-promise-error-handling",
    title: "Fix Unhandled Promise Rejection",
    type: "bugfix",
    difficulty: "medium",
    companies: ["Google", "Amazon"],
    description: "Add proper error handling to prevent unhandled promise rejections",
    tags: ["promises", "error-handling", "async"],
    estimatedTime: 15,
    problemStatement: `This function makes an API call but doesn't handle errors, causing unhandled promise rejections. Fix it.`,
    buggyCode: {
      javascript: `async function loadUserData(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);
  const data = await response.json();
  return data;
}`,
      typescript: `async function loadUserData(userId: string) {
  const response = await fetch(\`/api/users/\${userId}\`);
  const data = await response.json();
  return data;
}`,
      python: `async def loadUserData(userId):
    response = await fetch(f'/api/users/{userId}')
    data = await response.json()
    return data`,
      java: `// UserDataLoader.java - Missing error handling
import java.net.http.*;
import com.google.gson.*;

public class UserDataLoader {
    private static final HttpClient client = HttpClient.newHttpClient();
    private static final Gson gson = new Gson();

    public static User loadUserData(String userId) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("/api/users/" + userId))
            .build();

        // BUG: No error handling for failed requests
        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        // BUG: Doesn't check status code before parsing
        return gson.fromJson(response.body(), User.class);
    }
}`,
    },
    expectedBehavior: "Should handle network errors and invalid responses gracefully",
    bugDescription: "Missing try-catch and response validation",
    hints: [
      "Wrap async code in try-catch",
      "Check response.ok before parsing JSON",
      "Provide meaningful error messages",
    ],
    testCases: [
      {
        input: "Valid userId",
        expected: "Returns user data",
        description: "Successful API response handling",
      },
      {
        input: "Invalid userId (404 response)",
        expected: "Throws/returns error without crashing",
        description: "Error handling for invalid user",
      },
    ],
    codebaseFiles: {
      javascript: [
        {
          fileName: "components/UserProfile.jsx",
          content: `import React, { useState, useEffect } from 'react';
import { loadUserData } from '../api/apiClient';

export function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // BUG: No error handling for promise rejection
    const fetchUser = async () => {
      setLoading(true);
      const data = await loadUserData(userId); // Can throw!
      setUser(data);
      setLoading(false);
    };

    fetchUser(); // Unhandled promise rejection if this fails!
  }, [userId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  // BUG: If loadUserData fails, user stays null and app crashes here
  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Bio: {user.bio}</p>
    </div>
  );
}`,
          description: "UserProfile component with no error handling for async data loading",
        },
        {
          fileName: "api/apiClient.js",
          content: `// BUG: No error handling in API calls
export async function loadUserData(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);

  // BUG: Doesn't check if response is ok (200-299)
  // Will fail on 404, 500, etc. when trying to parse JSON
  const data = await response.json();

  return data;
}

export async function updateUserProfile(userId, updates) {
  const response = await fetch(\`/api/users/\${userId}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  // BUG: Same issue - no response validation
  return await response.json();
}

export async function deleteUser(userId) {
  const response = await fetch(\`/api/users/\${userId}\`, {
    method: 'DELETE'
  });

  // BUG: No error handling
  return await response.json();
}

// Example of what happens when these fail:
// loadUserData('invalid-id')
//   -> fetch returns 404
//   -> response.json() tries to parse error HTML as JSON
//   -> Throws "Unexpected token < in JSON"
//   -> Unhandled promise rejection!`,
          description: "API client with no error handling or response validation",
        },
        {
          fileName: "components/ErrorBoundary.jsx",
          content: `import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// NOTE: ErrorBoundary only catches errors in render/lifecycle methods
// It does NOT catch:
// - Errors in event handlers
// - Async errors (setTimeout, promises)
// - Errors in the error boundary itself
//
// So our unhandled promise rejections will NOT be caught!`,
          description: "ErrorBoundary component - but it cannot catch async errors",
        },
        {
          fileName: "tests/promiseErrorHandling.test.jsx",
          content: `import { render, screen, waitFor } from '@testing-library/react';
import { UserProfile } from '../components/UserProfile';
import { loadUserData } from '../api/apiClient';

// Mock the API
jest.mock('../api/apiClient');

describe('Promise Error Handling Bugs', () => {
  test('demonstrates unhandled rejection on 404', async () => {
    // Mock API to simulate 404 error
    loadUserData.mockRejectedValue(new Error('User not found'));

    // Set up listener for unhandled rejections
    const unhandledRejections = [];
    const handler = (event) => {
      unhandledRejections.push(event.reason);
    };
    window.addEventListener('unhandledrejection', handler);

    // Render component
    render(<UserProfile userId="invalid-id" />);

    // Wait a bit for the promise to reject
    await waitFor(() => {}, { timeout: 100 });

    // BUG: Unhandled promise rejection occurred!
    expect(unhandledRejections.length).toBeGreaterThan(0);
    expect(unhandledRejections[0].message).toBe('User not found');

    window.removeEventListener('unhandledrejection', handler);
  });

  test('demonstrates component crash on null data', async () => {
    // Mock successful API call
    loadUserData.mockResolvedValue({
      name: 'John Doe',
      email: 'john@example.com',
      bio: 'Developer'
    });

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Now simulate a failed API call
    loadUserData.mockRejectedValue(new Error('Network error'));

    // Re-render with different userId
    const { rerender } = render(<UserProfile userId="456" />);

    // BUG: Component crashes because user is null
    // This test would throw an error without proper error handling
  });

  test('shows proper error handling approach', async () => {
    // Example of correct error handling:
    const fetchWithErrorHandling = async (userId) => {
      try {
        const data = await loadUserData(userId);
        return { success: true, data };
      } catch (error) {
        console.error('Failed to load user:', error);
        return { success: false, error: error.message };
      }
    };

    loadUserData.mockRejectedValue(new Error('User not found'));

    const result = await fetchWithErrorHandling('invalid');

    expect(result.success).toBe(false);
    expect(result.error).toBe('User not found');
    // No unhandled rejection!
  });

  test('demonstrates response validation bug', async () => {
    // Simulate what the buggy code does with a 404 response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.reject(new Error('Unexpected token < in JSON'))
      })
    );

    try {
      // This is what happens inside loadUserData
      const response = await fetch('/api/users/123');
      const data = await response.json(); // Throws!
      // Never gets here
    } catch (error) {
      expect(error.message).toBe('Unexpected token < in JSON');
    }
  });
});`,
          description: "Tests demonstrating unhandled promise rejections and their consequences",
        },
      ],
      typescript: [
        {
          fileName: "components/UserProfile.tsx",
          content: `import React, { useState, useEffect } from 'react';
import { loadUserData, User } from '../api/apiClient';

interface UserProfileProps {
  userId: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // BUG: No error handling for promise rejection
    const fetchUser = async () => {
      setLoading(true);
      const data = await loadUserData(userId); // Can throw!
      setUser(data);
      setLoading(false);
    };

    fetchUser(); // Unhandled promise rejection if this fails!
  }, [userId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  // BUG: If loadUserData fails, user stays null and app crashes here
  return (
    <div className="user-profile">
      <h1>{user!.name}</h1>
      <p>Email: {user!.email}</p>
      <p>Bio: {user!.bio}</p>
    </div>
  );
}`,
          description: "UserProfile component with no error handling for async data loading",
        },
        {
          fileName: "api/apiClient.ts",
          content: `export interface User {
  id: string;
  name: string;
  email: string;
  bio: string;
}

// BUG: No error handling in API calls
export async function loadUserData(userId: string): Promise<User> {
  const response = await fetch(\`/api/users/\${userId}\`);

  // BUG: Doesn't check if response is ok (200-299)
  // Will fail on 404, 500, etc. when trying to parse JSON
  const data = await response.json();

  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<User> {
  const response = await fetch(\`/api/users/\${userId}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  // BUG: Same issue - no response validation
  return await response.json();
}

// Fixed version with proper error handling:
export async function loadUserDataFixed(userId: string): Promise<User> {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load user data:', error);
    throw new Error(\`Failed to load user: \${error instanceof Error ? error.message : 'Unknown error'}\`);
  }
}`,
          description: "API client with no error handling or response validation",
        },
        {
          fileName: "tests/promiseErrorHandling.test.ts",
          content: `import { loadUserData, User } from '../api/apiClient';

describe('Promise Error Handling Bugs', () => {
  test('demonstrates unhandled rejection', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.reject(new Error('Invalid JSON'))
      } as Response)
    );

    // This will cause an unhandled promise rejection
    try {
      await loadUserData('123');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test('shows proper error handling', async () => {
    const fetchWithErrorHandling = async (userId: string): Promise<{ success: boolean; data?: User; error?: string }> => {
      try {
        const data = await loadUserData(userId);
        return { success: true, data };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    };

    global.fetch = jest.fn(() =>
      Promise.reject(new Error('Network error'))
    );

    const result = await fetchWithErrorHandling('123');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});`,
          description: "Tests demonstrating unhandled promise rejections",
        },
      ],
      python: [
        {
          fileName: "api/api_client.py",
          content: `import aiohttp
import asyncio
from typing import Dict, Any

class APIClient:
    """API client with missing error handling"""

    def __init__(self, base_url: str):
        self.base_url = base_url

    async def load_user_data(self, user_id: str) -> Dict[str, Any]:
        """BUG: No error handling for failed requests"""
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/users/{user_id}") as response:
                # BUG: Doesn't check response status
                # Will fail on 404, 500, etc.
                data = await response.json()
                return data

    async def load_user_data_fixed(self, user_id: str) -> Dict[str, Any]:
        """Fixed version with proper error handling"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/users/{user_id}") as response:
                    # Check status code
                    if response.status != 200:
                        raise ValueError(f"HTTP error! status: {response.status}")

                    data = await response.json()
                    return data
        except aiohttp.ClientError as e:
            raise Exception(f"Failed to load user: {str(e)}")
        except Exception as e:
            raise Exception(f"Unexpected error: {str(e)}")`,
          description: "Python async API client showing missing error handling",
        },
        {
          fileName: "tests/test_promise_errors.py",
          content: `import pytest
import asyncio
from unittest.mock import Mock, patch
from api.api_client import APIClient

class TestPromiseErrorHandling:
    @pytest.mark.asyncio
    async def test_unhandled_error(self):
        """Demonstrates unhandled error in async function"""
        client = APIClient("http://api.example.com")

        # Mock a failed response
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = Mock()
            mock_response.status = 404
            mock_response.json = Mock(side_effect=ValueError("Invalid JSON"))
            mock_get.return_value.__aenter__.return_value = mock_response

            # BUG: This raises an unhandled exception
            with pytest.raises(ValueError):
                await client.load_user_data("invalid-id")

    @pytest.mark.asyncio
    async def test_proper_error_handling(self):
        """Shows proper error handling approach"""
        client = APIClient("http://api.example.com")

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = Mock()
            mock_response.status = 404
            mock_get.return_value.__aenter__.return_value = mock_response

            # Fixed version handles errors properly
            with pytest.raises(Exception) as exc_info:
                await client.load_user_data_fixed("invalid-id")

            assert "HTTP error" in str(exc_info.value)`,
          description: "Python tests showing async error handling",
        },
      ],
      java: [
        {
          fileName: "api/ApiClient.java",
          content: `// API client with missing error handling
package api;

import java.net.http.*;
import java.net.URI;
import java.io.IOException;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import models.User;

public class ApiClient {
    private static final HttpClient client = HttpClient.newHttpClient();
    private static final Gson gson = new Gson();

    // BUG: No error handling in API calls
    public User loadUserData(String userId) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.example.com/users/" + userId))
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        // BUG: Doesn't check if response is ok (200-299)
        // Will fail on 404, 500, etc. when trying to parse JSON
        User data = gson.fromJson(response.body(), User.class);

        return data;
    }

    public User updateUserProfile(String userId, User updates)
            throws IOException, InterruptedException {
        String jsonBody = gson.toJson(updates);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.example.com/users/" + userId))
            .PUT(HttpRequest.BodyPublishers.ofString(jsonBody))
            .header("Content-Type", "application/json")
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        // BUG: No validation of response status
        return gson.fromJson(response.body(), User.class);
    }

    public void deleteUser(String userId) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.example.com/users/" + userId))
            .DELETE()
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        // BUG: Doesn't throw error on failure
        // Caller has no way to know if delete succeeded
    }

    // Example of what happens with the buggy code
    public static void demonstrateBug() {
        ApiClient client = new ApiClient();

        try {
            // This will throw JsonSyntaxException when server returns 404 HTML page
            User user = client.loadUserData("invalid-id");
            System.out.println("Got user: " + user.name);
        } catch (IOException | InterruptedException e) {
            System.out.println("Network error: " + e.getMessage());
        } catch (JsonSyntaxException e) {
            // BUG: Gets here when trying to parse HTML error page as JSON
            System.out.println("JSON parsing failed - probably got error HTML: " + e.getMessage());
        }
    }
}`,
          description: "API client with no error handling for HTTP status codes",
        },
        {
          fileName: "ui/UserProfileView.java",
          content: `// User profile view with poor error handling
package ui;

import api.ApiClient;
import models.User;
import java.util.concurrent.CompletableFuture;

public class UserProfileView {
    private ApiClient apiClient;
    private User currentUser;
    private boolean loading;
    private String errorMessage;

    public UserProfileView() {
        this.apiClient = new ApiClient();
        this.loading = false;
    }

    // BUG: No error handling for promise rejection
    public void loadUser(String userId) {
        loading = true;

        CompletableFuture.supplyAsync(() -> {
            try {
                return apiClient.loadUserData(userId); // Can throw!
            } catch (Exception e) {
                // BUG: Exception is swallowed, not propagated
                System.err.println("Error loading user: " + e.getMessage());
                return null;
            }
        }).thenAccept(user -> {
            currentUser = user;
            loading = false;
            // BUG: If user is null, we don't set an error state
            // UI will try to render null user and crash
        });
        // BUG: Exception in async chain is not handled!
    }

    public void updateProfile(String userId, User updates) {
        CompletableFuture.runAsync(() -> {
            try {
                apiClient.updateUserProfile(userId, updates);
                // BUG: Doesn't check if update succeeded
                // BUG: Doesn't refresh user data after update
            } catch (Exception e) {
                // BUG: Error is logged but not shown to user
                System.err.println("Update failed: " + e.getMessage());
            }
        });
        // No error handling for the CompletableFuture itself!
    }

    // Attempting to render when currentUser might be null
    public String render() {
        if (loading) {
            return "<div>Loading...</div>";
        }

        // BUG: If loadUserData fails, currentUser stays null and this crashes
        return String.format("""
            <div class="user-profile">
                <h1>%s</h1>
                <p>Email: %s</p>
                <p>Bio: %s</p>
            </div>
            """, currentUser.name, currentUser.email, currentUser.bio);
        // NullPointerException when currentUser is null!
    }

    // Fixed version shows proper error handling
    public void loadUserFixed(String userId) {
        loading = true;
        errorMessage = null;

        CompletableFuture.supplyAsync(() -> {
            try {
                return apiClient.loadUserData(userId);
            } catch (Exception e) {
                throw new RuntimeException("Failed to load user: " + e.getMessage(), e);
            }
        }).thenAccept(user -> {
            currentUser = user;
            loading = false;
        }).exceptionally(ex -> {
            // Properly handle errors
            errorMessage = ex.getMessage();
            loading = false;
            currentUser = null;
            return null;
        });
    }

    public String renderFixed() {
        if (loading) {
            return "<div>Loading...</div>";
        }

        if (errorMessage != null) {
            return "<div class='error'>" + errorMessage + "</div>";
        }

        if (currentUser == null) {
            return "<div>No user data</div>";
        }

        return String.format("""
            <div class="user-profile">
                <h1>%s</h1>
                <p>Email: %s</p>
                <p>Bio: %s</p>
            </div>
            """, currentUser.name, currentUser.email, currentUser.bio);
    }
}`,
          description: "User profile view with poor async error handling",
        },
        {
          fileName: "tests/ApiClientTest.java",
          content: `// Tests demonstrating error handling issues
package tests;

import api.ApiClient;
import models.User;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import com.google.gson.JsonSyntaxException;

public class ApiClientTest {

    @Test
    public void testBuggyLoadUserDataWithInvalidId() {
        ApiClient client = new ApiClient();

        // BUG: This throws JsonSyntaxException instead of a meaningful error
        // because the API returns HTML error page, not JSON
        assertThrows(JsonSyntaxException.class, () -> {
            client.loadUserData("invalid-id");
        });

        // The exception message is unhelpful:
        // "Expected BEGIN_OBJECT but was STRING at line 1 column 1"
        // Should instead say "User not found" or similar
    }

    @Test
    public void testBuggyUpdateWithServerError() {
        ApiClient client = new ApiClient();
        User updates = new User("1", "Updated Name", "updated@email.com", "New bio");

        // BUG: When server returns 500, this throws JsonSyntaxException
        // instead of properly indicating server error
        assertThrows(Exception.class, () -> {
            client.updateUserProfile("1", updates);
        });
    }

    @Test
    public void demonstrateProperErrorHandling() {
        // This shows what proper error handling should look like:

        class FixedApiClient {
            private final HttpClient client = HttpClient.newHttpClient();
            private final Gson gson = new Gson();

            public User loadUserData(String userId) throws IOException, InterruptedException {
                HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.example.com/users/" + userId))
                    .build();

                HttpResponse<String> response = client.send(request,
                    HttpResponse.BodyHandlers.ofString());

                // FIXED: Check status code first
                if (response.statusCode() == 404) {
                    throw new IllegalArgumentException("User not found: " + userId);
                } else if (response.statusCode() >= 400) {
                    throw new IOException("HTTP error " + response.statusCode() +
                        ": " + response.body());
                }

                // FIXED: Only parse JSON if we got a success status
                try {
                    return gson.fromJson(response.body(), User.class);
                } catch (JsonSyntaxException e) {
                    throw new IOException("Invalid JSON response", e);
                }
            }
        }

        // Now errors are clear and meaningful
        FixedApiClient fixedClient = new FixedApiClient();
        Exception ex = assertThrows(IllegalArgumentException.class, () -> {
            fixedClient.loadUserData("invalid-id");
        });
        assertTrue(ex.getMessage().contains("User not found"));
    }
}`,
          description: "Tests showing error handling problems and solutions",
        },
      ],
    },
  },
  // ==================== COMPREHENSIVE MULTI-FILE BUG FIX SCENARIOS ====================
]
