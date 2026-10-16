# Post-interview next practice

Show the next task after **What Worked / To Improve**. The user should understand the
feedback before choosing another task.

The card leads with one actionable practice focus under **Recommended next step**.
The task title and track/difficulty/duration appear underneath as supporting
information, followed by two actions: **Open practice** (primary) and
**Save for later** (secondary). Keep the longer Action Plan collapsed further down
the feedback page so it doesn't compete with the recommendation.
**Why this task?** discloses the recommendation reason, supporting feedback, and
session-limit explanation.

Saving without a reminder replaces the save button with **Saved to dashboard**
and **Add reminder**. Adding a reminder is optional and requires an explicit
**Set reminder** submission. A confirmed schedule displays **Reminder set**, a
local date/time with time zone, and **Edit reminder**. This state also applies
when an existing saved plan loads after navigation or refresh.

The reminder editor prefills the current schedule. **Cancel** closes it without
writing; **Cancel reminder** explicitly removes the schedule while keeping the
task saved. Failed changes keep the previous confirmation and editor available,
with an inline error. Sending reminders and completed tasks offer no scheduling
actions. Show a replacement warning only when a different task is already saved.

Dates omit seconds. Delivery wording says “after” because quiet hours and email
preferences can delay delivery. Keyboard users receive focus in the reminder
field on opening, back on the trigger on cancellation, and on the confirmed
status after a successful save.

This hierarchy follows [Apple's button guidance](https://developer.apple.com/design/human-interface-guidelines/buttons),
[Material's emphasis roles](https://m3.material.io/styles/color/the-color-system),
and [NN/g's progressive disclosure guidance](https://www.nngroup.com/articles/progressive-disclosure/).
Use the existing CodeSparring components, typography, and theme tokens.

Verification: the practice component tests cover saved/reminder states and errors;
`pnpm exec playwright test --config=playwright.recommendations.config.ts` covers
navigation, refresh persistence, explicit writes, keyboard focus, narrow screens,
large text, and both themes using the isolated fixture services.
