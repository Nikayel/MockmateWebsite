import type { AddFunctionalityScenario } from "../types"

export const eventAggregatorScenario: AddFunctionalityScenario = {
  id: "add-feature-event-aggregator",
  title: "Add Grouping to Event Aggregator",
  type: "add-functionality",
  difficulty: "medium",
  companies: ["Meta", "Slack", "Discord", "Google"],
  description: "Implement event grouping and aggregation for a notification-like system",
  tags: ["aggregation", "data-structures", "events"],
  estimatedTime: 35,
  problemStatement: `You're building an event aggregation system for a social platform. Events should be grouped when similar (e.g., "John and 3 others liked your post").

**Your task:**
1. Study the existing EventAggregator class
2. Implement event grouping based on type and target
3. Add aggregation display logic (e.g., "X and N others...")
4. Support fetching aggregated events with pagination

**Context:** Users receive hundreds of events daily. Grouping improves readability and reduces noise.`,
  featureRequirements: [
    "addEvent(event) - add event and group with similar events",
    "getAggregatedEvents(limit) - return grouped events",
    "Group by type AND targetId within time window (1 hour)",
    'Display format: "actor1 and N others [action] your [target]"',
    "Mark events as read/unread",
  ],
  existingCode: {
    javascript: `// eventAggregator.js - Event aggregation system
// TODO: Implement event grouping and aggregation

class EventAggregator {
  constructor(groupingWindowMs = 3600000) { // 1 hour default
    this.events = [];
    this.groupingWindowMs = groupingWindowMs;
  }

  /**
   * Add a new event
   * Should check for similar events to group with
   * @param {Object} event - { type, actorId, actorName, targetId, targetType, timestamp }
   */
  addEvent(event) {
    const normalizedEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
      read: false,
    };

    // TODO: Check if this event should be grouped with existing events
    // Group criteria: same type, same targetId, within groupingWindowMs
    // If grouped, update the existing group instead of adding new event

    this.events.push(normalizedEvent);
  }

  /**
   * Find a group that this event can be added to
   * @param {Object} event
   * @returns {Object|null} Existing group or null
   */
  findGroupForEvent(event) {
    // TODO: Find existing event/group with same type and targetId
    // within the grouping window
    return null;
  }

  /**
   * Get aggregated events (grouped and formatted)
   * @param {number} limit - Max events to return
   * @returns {Array} Aggregated events with display text
   */
  getAggregatedEvents(limit = 20) {
    // TODO: Implement aggregation
    // 1. Group events by type + targetId (within time window)
    // 2. For each group, create aggregated display
    // 3. Sort by most recent timestamp
    // 4. Return limited results

    return this.events.slice(0, limit).map(e => ({
      ...e,
      displayText: this._formatEvent(e),
      actorCount: 1,
    }));
  }

  /**
   * Format event display text
   * Single actor: "John liked your post"
   * Multiple actors: "John and 3 others liked your post"
   * @param {Object} eventOrGroup
   * @returns {string}
   */
  _formatEvent(eventOrGroup) {
    // TODO: Implement proper formatting for grouped events
    const { actorName, type, targetType } = eventOrGroup;
    const action = this._getActionText(type);
    return \`\${actorName} \${action} your \${targetType}\`;
  }

  /**
   * Get action text for event type
   */
  _getActionText(type) {
    const actions = {
      'like': 'liked',
      'comment': 'commented on',
      'follow': 'followed',
      'mention': 'mentioned you in',
      'share': 'shared',
    };
    return actions[type] || type;
  }

  /**
   * Mark events as read
   * @param {string|string[]} eventIds - ID(s) to mark as read
   */
  markAsRead(eventIds) {
    const ids = Array.isArray(eventIds) ? eventIds : [eventIds];
    for (const event of this.events) {
      if (ids.includes(event.id)) {
        event.read = true;
      }
    }
  }

  /**
   * Get unread count
   * @returns {number}
   */
  getUnreadCount() {
    return this.events.filter(e => !e.read).length;
  }
}

// Test helper function - DO NOT MODIFY
function testEventAggregator(operations) {
  const ea = new EventAggregator(3600000); // 1 hour window
  const results = [];

  for (const op of operations) {
    switch (op.type) {
      case 'add':
        ea.addEvent(op.event);
        results.push({ type: 'add', eventType: op.event.type });
        break;
      case 'get':
        const events = ea.getAggregatedEvents(op.limit || 20);
        results.push({
          type: 'get',
          count: events.length,
          events: events.map(e => ({
            displayText: e.displayText,
            actorCount: e.actorCount || 1,
            targetId: e.targetId,
          }))
        });
        break;
      case 'unread':
        results.push({ type: 'unread', count: ea.getUnreadCount() });
        break;
    }
  }

  return results;
}`,
    python: `# event_aggregator.py - Event aggregation system
# TODO: Implement event grouping and aggregation

import time

class EventAggregator:
    def __init__(self, grouping_window_ms=3600000):  # 1 hour default
        self.events = []
        self.grouping_window_ms = grouping_window_ms

    def add_event(self, event):
        """
        Add a new event
        Should check for similar events to group with
        Args:
            event: { type, actor_id, actor_name, target_id, target_type, timestamp }
        """
        normalized_event = {
            **event,
            'timestamp': event.get('timestamp', int(time.time() * 1000)),
            'read': False,
        }

        # TODO: Check if this event should be grouped with existing events
        # Group criteria: same type, same target_id, within grouping_window_ms
        # If grouped, update the existing group instead of adding new event

        self.events.append(normalized_event)

    def find_group_for_event(self, event):
        """
        Find a group that this event can be added to
        Returns: Existing group or None
        """
        # TODO: Find existing event/group with same type and target_id
        # within the grouping window
        return None

    def get_aggregated_events(self, limit=20):
        """
        Get aggregated events (grouped and formatted)
        Args:
            limit: Max events to return
        Returns: List of aggregated events with display text
        """
        # TODO: Implement aggregation
        # 1. Group events by type + target_id (within time window)
        # 2. For each group, create aggregated display
        # 3. Sort by most recent timestamp
        # 4. Return limited results

        return [{
            **e,
            'display_text': self._format_event(e),
            'actor_count': 1,
        } for e in self.events[:limit]]

    def _format_event(self, event_or_group):
        """
        Format event display text
        Single actor: "John liked your post"
        Multiple actors: "John and 3 others liked your post"
        """
        # TODO: Implement proper formatting for grouped events
        actor_name = event_or_group.get('actor_name', event_or_group.get('actorName'))
        event_type = event_or_group.get('type')
        target_type = event_or_group.get('target_type', event_or_group.get('targetType'))
        action = self._get_action_text(event_type)
        return f"{actor_name} {action} your {target_type}"

    def _get_action_text(self, event_type):
        """Get action text for event type"""
        actions = {
            'like': 'liked',
            'comment': 'commented on',
            'follow': 'followed',
            'mention': 'mentioned you in',
            'share': 'shared',
        }
        return actions.get(event_type, event_type)

    def mark_as_read(self, event_ids):
        """Mark events as read"""
        ids = event_ids if isinstance(event_ids, list) else [event_ids]
        for event in self.events:
            if event.get('id') in ids:
                event['read'] = True

    def get_unread_count(self):
        """Get unread count"""
        return len([e for e in self.events if not e.get('read')])


# Test helper function - DO NOT MODIFY
def test_event_aggregator(operations):
    ea = EventAggregator(3600000)  # 1 hour window
    results = []

    for op in operations:
        if op['type'] == 'add':
            ea.add_event(op['event'])
            results.append({'type': 'add', 'eventType': op['event']['type']})
        elif op['type'] == 'get':
            events = ea.get_aggregated_events(op.get('limit', 20))
            results.append({
                'type': 'get',
                'count': len(events),
                'events': [{
                    'displayText': e.get('display_text', e.get('displayText')),
                    'actorCount': e.get('actor_count', e.get('actorCount', 1)),
                    'targetId': e.get('target_id', e.get('targetId')),
                } for e in events]
            })
        elif op['type'] == 'unread':
            results.append({'type': 'unread', 'count': ea.get_unread_count()})

    return results`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "utils/groupBy.js",
        content: `// Grouping utilities for event aggregation

/**
 * Group array items by a key function
 * @param {Array} items
 * @param {Function} keyFn - Function that returns grouping key
 * @returns {Object} Grouped items { key: [items] }
 */
function groupBy(items, keyFn) {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

/**
 * Create grouping key for events
 * @param {Object} event
 * @returns {string} Grouping key
 */
function createEventGroupKey(event) {
  return \`\${event.type}:\${event.targetId}\`;
}

module.exports = { groupBy, createEventGroupKey };`,
        description: "Grouping utilities - use these to group events by type and target",
      },
      {
        fileName: "data/sampleEvents.js",
        content: `// Sample events showing expected grouping behavior

const sampleEvents = [
  { type: 'like', actorId: 'u1', actorName: 'John', targetId: 'post1', targetType: 'post', timestamp: 1000 },
  { type: 'like', actorId: 'u2', actorName: 'Jane', targetId: 'post1', targetType: 'post', timestamp: 1100 },
  { type: 'like', actorId: 'u3', actorName: 'Bob', targetId: 'post1', targetType: 'post', timestamp: 1200 },
  { type: 'comment', actorId: 'u4', actorName: 'Alice', targetId: 'post1', targetType: 'post', timestamp: 1300 },
];

// Expected aggregated output:
// [
//   { displayText: "John and 2 others liked your post", actorCount: 3, targetId: 'post1' },
//   { displayText: "Alice commented on your post", actorCount: 1, targetId: 'post1' },
// ]

module.exports = { sampleEvents };`,
        description: "Sample events showing expected grouping and formatting",
      },
    ],
    python: [
      {
        fileName: "utils/group_by.py",
        content: `# Grouping utilities for event aggregation
from collections import defaultdict


def group_by(items, key_fn):
    """
    Group array items by a key function
    Args:
        items: List of items
        key_fn: Function that returns grouping key
    Returns: Dict of grouped items { key: [items] }
    """
    groups = defaultdict(list)
    for item in items:
        key = key_fn(item)
        groups[key].append(item)
    return dict(groups)


def create_event_group_key(event):
    """Create grouping key for events"""
    return f"{event['type']}:{event.get('target_id', event.get('targetId'))}"`,
        description: "Grouping utilities - use these to group events by type and target",
      },
    ],
  },
  hints: [
    "Use createEventGroupKey() to generate consistent keys for grouping",
    "When adding event, check if group exists with same key AND recent timestamp",
    "Store actors array in grouped events: { actors: [{id, name}], ... }",
    'Format display: first actor name + "and N others" if multiple actors',
    "Sort aggregated results by most recent timestamp (descending)",
  ],
  testCases: [
    {
      input: {
        operations: [
          {
            type: "add",
            event: {
              type: "like",
              actorId: "u1",
              actorName: "John",
              targetId: "post1",
              targetType: "post",
            },
          },
          { type: "get", limit: 10 },
        ],
      },
      expected: [
        { type: "add", eventType: "like" },
        {
          type: "get",
          count: 1,
          events: [{ displayText: "John liked your post", actorCount: 1, targetId: "post1" }],
        },
      ],
      description: "Single event displays correctly",
    },
    {
      input: {
        operations: [
          {
            type: "add",
            event: {
              type: "like",
              actorId: "u1",
              actorName: "John",
              targetId: "post1",
              targetType: "post",
              timestamp: 1000,
            },
          },
          {
            type: "add",
            event: {
              type: "like",
              actorId: "u2",
              actorName: "Jane",
              targetId: "post1",
              targetType: "post",
              timestamp: 1100,
            },
          },
          {
            type: "add",
            event: {
              type: "like",
              actorId: "u3",
              actorName: "Bob",
              targetId: "post1",
              targetType: "post",
              timestamp: 1200,
            },
          },
          { type: "get", limit: 10 },
        ],
      },
      expected: [
        { type: "add", eventType: "like" },
        { type: "add", eventType: "like" },
        { type: "add", eventType: "like" },
        {
          type: "get",
          count: 1,
          events: [
            {
              displayText: "John and 2 others liked your post",
              actorCount: 3,
              targetId: "post1",
            },
          ],
        },
      ],
      description: "Multiple likes on same post are grouped",
    },
    {
      input: {
        operations: [
          {
            type: "add",
            event: {
              type: "like",
              actorId: "u1",
              actorName: "John",
              targetId: "post1",
              targetType: "post",
            },
          },
          {
            type: "add",
            event: {
              type: "comment",
              actorId: "u2",
              actorName: "Jane",
              targetId: "post1",
              targetType: "post",
            },
          },
          { type: "get", limit: 10 },
        ],
      },
      expected: [
        { type: "add", eventType: "like" },
        { type: "add", eventType: "comment" },
        {
          type: "get",
          count: 2,
          events: [
            { displayText: "Jane commented on your post", actorCount: 1, targetId: "post1" },
            { displayText: "John liked your post", actorCount: 1, targetId: "post1" },
          ],
        },
      ],
      description: "Different event types are not grouped together",
    },
  ],
  acceptanceCriteria: [
    "Events with same type and targetId are grouped",
    'Grouped events show "X and N others" format',
    "Single events show simple format",
    "Events are sorted by most recent",
    "Different event types remain separate",
  ],
}
