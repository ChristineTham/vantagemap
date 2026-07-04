# Phase 0 Acceptance Criteria Templates

Use these templates to standardize epic completion checks across UI, API, and integration work.

## Template A: UI Workflow

Scenario format:

- Given role and starting state
- When user performs workflow action
- Then expected behavior, validation, and audit outcomes are visible

Example

Given a user with Member role and access to Applications inventory
When the user creates a new Application document with required fields
Then the new entity appears in the inventory list with persisted values
And the user can open the detail view and see matching values
And an audit event is stored with actor, timestamp, and target entity ID

## Template B: API Contract

Scenario format:

- Given authenticated caller and required permissions
- When caller invokes endpoint with valid payload
- Then response shape/status and persistence expectations are satisfied

Example

Given a technical user token with create permissions for documents
When a POST request is sent to the document endpoint with valid payload
Then response status is 201
And response includes stable identifier and timestamps
And stored record matches request payload constraints
And unauthorized role receives 403 for the same operation

## Template C: Integration and Eventing

Scenario format:

- Given active subscription and delivery target
- When triggering event occurs
- Then delivery, retries, and dead-letter behavior follow policy

Example

Given an active webhook subscription for document updates
When a document is updated
Then an event is queued and delivered to the endpoint
And if endpoint fails, retries follow configured policy
And after max retries, event is persisted to dead-letter storage with reason

## Template D: Non-Functional Validation

Scenario format:

- Given target workload and test profile
- When benchmark executes
- Then performance/reliability/security threshold is met

Example

Given baseline dataset and 300 concurrent read requests
When search benchmark runs for 10 minutes
Then p95 latency remains below 300 ms
And error rate remains below 1 percent

## Mapping Rules

- Every epic must have at least 3 acceptance criteria scenarios
- At least one scenario must validate permissions
- At least one scenario must validate audit behavior for mutation workflows
- At least one scenario must map to non-functional thresholds where applicable
