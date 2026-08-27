# Meridian

You are the third engineer here. Insurers send us claim documents, we pull out what matters,
apply policy, and post the result back to them over a webhook. Money and other people's data
are both on the line, so a handful of things about how this system is shaped are worth
knowing before you touch anything, regardless of what you are working on this week.

## Tenants

Every tenant is a distinct insurance partner, and every claim belongs to exactly one of
them. Tenant identity travels on the request itself; there is no session or auth token in
front of this API yet, so treat whatever identifies the tenant as something a caller states
rather than something the platform has already verified for you. Not everything in this
system carries its own tenant reference. A claim's attachments carry a claim identifier and
no tenant of their own, because the process that creates them only ever sees a claim
identifier, never a tenant.

## Money

An amount is a plain floating point number today: dollars, not cents, with the currency
carried alongside it rather than folded into the value. That is true of the type, the
storage, and the wire format alike, everywhere, right now. There is exactly one function
responsible for rounding a dollar amount; nothing else should reimplement that logic.
Comparing two amounts for equality is a float comparison until you are told otherwise.

## Dates

A loss date is a calendar date with no time of day and no time zone attached: it is the day
an adjuster would write on a form, nothing more precise. Anything that instead records the
instant something happened, like when a claim was created or a webhook was delivered, is a
full timestamp. Do not treat the two as interchangeable, and do not assume anything in this
codebase currently accounts for which time zone a calendar date belongs to.

## Contracts at the boundary

Every request and response in this system is a JSON object, nothing else. Nothing arrives at
a handler already validated: a request body is, at best, of unknown shape, and in places it
is typed looser than that on purpose, so the compiler will never save you from a shape you
did not check yourself. Every response carries a status code and a body; there is no
separate contract for errors versus successes beyond that, which means a caller can only
tell the two apart by looking.

## Persistence

Every piece of code that touches storage goes through one narrow interface: hand it a query
and its parameters, get rows back. Nothing behind that interface is a live database yet.
Whatever stands in for one today matches queries by their exact text rather than parsing
SQL, so a query has to be written once and reused, never assembled slightly differently in
two places that are supposed to mean the same thing. The schema a real database will
eventually run is already written down and is authoritative, even though nothing in this
repository executes it yet. Write every query as if it will run against that schema for
real, because eventually it will.

## Delivery

An outbound webhook is a single signed JSON payload sent through an interface nothing in
production has connected to a real network yet, so nothing here has ever actually left this
process. Delivery is driven by a queue: work gets added to it, and something drains it, one
entry at a time, in the order it arrived. Nothing about that ordering guarantee is
tenant-specific by default.

## Working here

The network and the database sit behind interfaces, each with exactly one narrow job, so
nothing here reaches a real socket or a real Postgres directly. The clock and id generation
do not, yet: they call straight into whatever the runtime provides. When you add a
dependency that a test needs to fake, follow the pattern the network and database already
set: define what you need from it before you decide how it is satisfied, and let whoever is
grading or reviewing your code swap in whatever stands in for it. That habit is the one
thing everything else here is built to reward.
