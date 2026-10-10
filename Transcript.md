# Codeyoung Booking Project --- Development Prompt & Learning Transcript

**Development environment:** Antigravity IDE\
**Purpose:** Record the kinds of planning, learning,
implementation-review, and troubleshooting prompts used during
development. This transcript is intended to reflect a workflow where the
developer builds and tests the project, uses AI to understand concepts
and investigate difficult problems, and remains responsible for
implementation decisions and verification.

------------------------------------------------------------------------

## 1. Initial project planning in Antigravity IDE

### Prompt 1 --- Plan before implementation

**User prompt**

> I want to build a Codeyoung booking application using a frontend, a
> Python FastAPI backend, and MongoDB. Before changing any files,
> inspect the existing workspace and propose a practical architecture.
> Explain the purpose of each major folder and the request flow from the
> browser to the backend and database. Identify the minimum viable
> booking flow and the key risks. Do not generate the entire application
> in one step.

**Agent response**

The application can be divided into a browser-based frontend, a FastAPI
backend, a service layer for booking rules, Pydantic models for request
validation, and MongoDB for persistent records. Start by mapping the
existing files and agreeing on the API contract. Build one vertical
slice---view availability, submit a booking, store it, and display the
result---before adding secondary features.

### Prompt 2 --- Understand the implementation plan

**User prompt**

> Turn the architecture into small implementation milestones. For each
> milestone, tell me what I should implement, what concept I need to
> understand, how I can test it locally, and what output should prove it
> works. Wait for me to review each milestone before moving to the next
> one.

**Agent response**

A useful sequence is: inspect the frontend; define data models; create
health and availability endpoints; connect MongoDB; implement booking
rules; connect the frontend to the API; add notifications; then test
failure cases and document setup. Each milestone should have a
reproducible test, not just code that appears plausible.

------------------------------------------------------------------------

## 2. Frontend fundamentals

### Prompt 3 --- Trace the frontend behavior

**User prompt**

> Inspect the existing frontend files and explain how the page is
> rendered, where form values are stored, how a parent selects a slot,
> and what happens when the submit action is triggered. Point me to the
> relevant functions and event handlers. Explain the code first; suggest
> a small change only after I understand the current flow.

**Agent response**

The frontend renders the booking interface, collects values from user
inputs, and handles user actions through JavaScript event handlers. When
the parent submits, the frontend builds a request payload and calls a
backend endpoint. The interface should represent loading, success, and
error states. Understanding the existing event handler and payload is
the first step to debugging a failed booking.

### Prompt 4 --- Frontend-to-backend communication

**User prompt**

> I understand that the frontend should call an API, but I want to
> understand the mechanics. Show me one real request in this project:
> the URL, HTTP method, JSON payload, response status, and JSON
> response. Explain what `fetch()`, `response.ok`, and `response.json()`
> do, and how I can inspect the request in browser DevTools.

**Agent response**

The browser sends an HTTP request to a FastAPI endpoint. A `GET` request
can retrieve availability; a `POST` request can submit a booking. The
backend validates the payload and returns a status code and JSON body.
The frontend should check whether the response succeeded, parse the
body, and render a user-facing result. DevTools' Network panel helps
inspect the actual URL, request body, response, and status.

### Prompt 5 --- Diagnose a failed frontend request

**User prompt**

> When a booking request fails, help me classify the error before
> proposing a fix. Explain how to distinguish a wrong API URL, a CORS
> problem, a backend that is not running, a validation error, and a
> database failure. Give me a checklist that starts with browser
> DevTools and ends with the backend logs.

**Agent response**

Check the Network panel and exact request URL first. A
connection-refused error often indicates that the backend is unavailable
or listening on a different port. A CORS message indicates a browser
cross-origin policy issue. A 4xx response usually points to request or
authorization problems; a 5xx response suggests a backend failure.
Correlate the browser error with the server logs rather than changing
unrelated frontend code.

------------------------------------------------------------------------

## 3. Backend and API fundamentals

### Prompt 6 --- Understand a FastAPI endpoint

**User prompt**

> Walk me through one endpoint in `backend/app/main.py` from request
> arrival to response. Explain the role of FastAPI, Pydantic models, the
> service function, exceptions, and HTTP status codes. Please use the
> existing code as the reference and clearly mark any behavior that is
> only a recommendation.

**Agent response**

FastAPI maps an HTTP method and path to a Python function. Pydantic
models validate and structure input data. The route calls the service
layer, then returns a JSON-compatible response. Validation failures
should be reported clearly; unexpected failures should be logged safely
and returned without leaking stack traces or credentials. Business rules
belong in the service layer rather than being duplicated across routes.

### Prompt 7 --- Understand why the code is split into modules

**User prompt**

> Why are the API routes, booking service, models, and database
> configuration in separate modules? Give me an example of how I would
> trace a bug through those layers if the frontend says a booking
> succeeded but the booking cannot be found later.

**Agent response**

Start with the route to confirm the correct service is called and the
response accurately represents the outcome. Inspect the service to see
whether it performs a database write. Check the database helper and
connection configuration, then query the expected collection. A success
response must not be returned before a required persistent write
succeeds.

------------------------------------------------------------------------

## 4. MongoDB persistence and security

### Prompt 9 --- Follow data into and out of MongoDB

**User prompt**

> Explain how this project loads MongoDB configuration, establishes a
> connection, inserts a booking, and fetches saved bookings. Show me
> which file is responsible for each step.

**Agent response**

The database module loads configuration and creates the MongoDB client.
The service layer writes and retrieves documents from collections such
as `bookings` and `emails`. The backend should return data only after
the required operation has succeeded. An in-memory list is lost when the
process restarts and is not shared across multiple application workers,
whereas MongoDB provides persistent storage.

### Prompt 10 --- Secure the database

**User prompt**

> I want to understand how to protect MongoDB Atlas from unauthorized
> access. Explain least-privilege database users, network access rules,
> secret management, input validation, and safe logging. Inspect the
> project for places where credentials could accidentally be committed
> to GitHub.

**Agent response**

Use a dedicated database user with only the permissions the application
requires. Restrict Atlas network access to trusted sources, store
connection strings in environment variables or a secret manager,
validate inputs, and avoid logging connection strings or personal data.
Exclude `.env` and token/credential files from version control. If a
secret has already been exposed, rotate it; `.gitignore` alone does not
remove it from repository history.

### Prompt 11 --- Understand what the API should return

**User prompt**

> Should the frontend query MongoDB directly, or should all database
> reads go through the backend? Explain how the API should limit which
> booking details are returned and why CORS is not a security mechanism
> for database access.

**Agent response**

The browser should call the backend, not MongoDB directly. Database
credentials must remain server-side. The backend should validate the
request, authenticate and authorize access where needed, query the
database, and return only the fields the caller is allowed to see. CORS
controls browser access across origins; it does not replace
authentication or authorization.

------------------------------------------------------------------------

## 5. Mentor scheduling and booking rules

### Prompt 12 --- Understand the assignment algorithm

**User prompt**

> Inspect the mentor scheduling logic and explain how the application
> decides whether a slot is available and which mentor can be assigned.
> Identify the relevant functions and data structures. Give me two
> examples: one where a mentor is eligible and one where a booking must
> be rejected. Do not change the logic until we understand its current
> behavior.

**Agent response**

Trace the eligibility checks in the scheduling service, including the
requested time, working hours, overlapping bookings, and daily capacity.
The service should select only mentors who satisfy all relevant
constraints. Tests should cover both a valid assignment and rejection
due to a conflict or quota. The actual constraints must be read from the
current code rather than assumed from the UI.

### Prompt 13 --- Time zones and scheduling correctness

**User prompt**

> Parents and mentors may be in different time zones. Explain how to
> store a booking time consistently, convert it for each recipient, and
> test daylight-saving transitions. Check whether the existing code uses
> timezone-aware values and identify what still needs verification.

**Agent response**

Use timezone-aware timestamps and a canonical representation, commonly
UTC, for storage and comparison. Convert the timestamp into each
recipient's timezone when displaying the class time. Tests should
include different time zones, day boundaries, and daylight-saving
transitions. A naive timestamp should not be silently interpreted as the
server's local time.

------------------------------------------------------------------------

## 6. Email delivery: SMTP versus Google OAuth

### Prompt 14 --- Choose an email approach

**User prompt**

> I need to send booking confirmations to parents and notifications to
> mentors. Compare Gmail SMTP with an App Password against the Gmail API
> using OAuth 2.0. Explain the setup, security implications, token
> handling, and how to choose an approach for this project. Please
> recommend a method based on the observed errors, not guesswork.

**Agent response --- expected learning outcome**

SMTP uses a mail server connection, commonly TLS on port 587 or SSL on
port 465. A Google App Password is a secret and must be protected. In
this project, the connection could be established, but authentication
repeatedly failed with a connection-disconnected error. That evidence
justified investigating another supported method rather than continuing
to switch ports.

The Gmail API uses OAuth 2.0 and a narrowly scoped permission such as
`gmail.send`. It requires a Google Cloud project, Gmail API enablement,
consent/test-user configuration, secure client credentials, and a token
lifecycle. OAuth authorization success must still be followed by a real
email-delivery test.

### Prompt 15 --- Understand the Python email helper

**User prompt**

> Explain how `send_email(to_email, subject, html_body)` should work in
> the backend. How does Python build the message, call the Gmail API,
> and report errors? Explain how the booking service should call the
> helper without mixing email-provider details into scheduling logic.

**Agent response**

The email helper validates the recipient, creates an email with a
subject and HTML body (ideally with a plain-text alternative), obtains
valid OAuth credentials, encodes the message in the format required by
the Gmail API, and calls the send endpoint. It should return a clear
outcome and log diagnostic details without logging credentials or
tokens. The booking service decides when notifications are needed and
what content to include; the helper handles the delivery mechanism.

### Prompt 16 --- Separate booking success from email success

**User prompt**

> If MongoDB saves a booking but Gmail fails, what should the API tell
> the frontend? How can I record email attempts and avoid misleading
> users into thinking a confirmation was delivered just because a
> booking was created?

**Agent response**

Booking persistence and email delivery are separate outcomes. The system
should not delete a valid booking simply because email delivery failed,
and it should not claim that the email was delivered when only a booking
was saved. Record notification status and failure details safely. A more
reliable implementation can use a persistent outbox or job queue to
retry transient failures and show operators which notifications need
attention.

------------------------------------------------------------------------

## 7. Email automation and reminder design

### Prompt 17 --- Understand notification automation

**User prompt**

> Design a reliable notification workflow for booking confirmation,
> mentor notification, and future reminders. Explain when each message
> is triggered, where its status is stored, how retries work, and why an
> in-memory timer may not be reliable in production.

**Agent response**

After a booking is saved, create notification jobs linked to the
booking. A worker processes pending jobs, sends messages, and records
success or failure. Retry transient failures with limits and avoid
duplicates through stable job identifiers and idempotent processing. A
timer inside a web process can disappear on restart or run more than
once across multiple workers, so production reminders need a persistent
scheduler or job queue.

### Prompt 18 --- Avoid duplicate emails

**User prompt**

> If a browser retries a booking after a timeout or the backend
> restarts, how can the application avoid duplicate bookings and
> notifications? Explain idempotency in practical terms and identify
> what I should test.

**Agent response**

A client may retry a request even though the server completed the
original operation. An idempotency key or unique request identifier can
prevent duplicate booking creation. Notification jobs should have stable
identifiers and recorded states so retries do not blindly resend
completed messages. Test repeated requests, worker restarts, and
failures between saving the booking and sending the email.

------------------------------------------------------------------------

## 8. Meeting links, room IDs, and parent--mentor connections

### Prompt 19 --- Understand the class link

**User prompt**

> The project has class-room and WebSocket signaling routes. Explain how
> a room ID can be used to create a joining URL for a parent and mentor,
> how both users find the same session, and what the backend needs to
> validate. Please distinguish a room/signaling feature from a fully
> working video call.

**Agent response**

A room ID identifies a session, and the frontend can use it in a class
URL. Both participants join the same room and use the room ID when
communicating with the backend. In a WebRTC implementation, signaling
exchanges session descriptions and ICE candidates; WebSocket signaling
does not itself carry the audio/video media.

A production implementation should bind a room to a confirmed booking,
use unpredictable identifiers, authenticate and authorize the parent and
assigned mentor, and expire access when appropriate. A URL alone is not
proof of identity or permission. The presence of signaling routes does
not prove the complete video-call flow works; it needs an end-to-end
test.

### Prompt 20 --- Protect class sessions

**User prompt**

> If someone shares or guesses a class URL, how should I prevent
> unauthorized users from joining? Explain the difference between a room
> ID and authentication, and how WebSocket routes should enforce access
> control.

**Agent response**

A room ID locates the session; authentication establishes who the user
is, and authorization determines whether that user may join. The backend
should validate the user's role and relationship to the booking before
granting access. WebSocket connections need appropriate authentication
and room authorization as well. High-entropy IDs help but do not replace
access control.

------------------------------------------------------------------------

## 9. Antigravity workflow and debugging habits

### Prompt 21 --- Ask for explanations before code changes

**User prompt**

> When I encounter an error, first explain the likely failing layer and
> how to verify the cause. Give me the smallest diagnostic command or
> test. Do not rewrite unrelated files or make multiple speculative
> changes at once. After the evidence is available, propose the smallest
> fix and explain why it should work.

**Agent response**

A systematic workflow is to reproduce the issue, inspect the complete
error, identify the failing layer, isolate it with a small test, make
one change, and rerun the same test. For example, test SMTP connectivity
separately from authentication, then test the email helper, then test
the booking API, and finally verify the parent receives the message.
This reduces accidental regressions and makes the cause of a fix easier
to explain.

### Prompt 22 --- Learn from the actual error message

**User prompt**

> The terminal says `ModuleNotFoundError: No module named 'dotenv'`.
> Explain what this error means, how to check which Python environment
> is running, and how to install the dependency into the correct virtual
> environment without changing the business logic.

**Agent response**

The Python interpreter running the script cannot import the package.
Check whether the project virtual environment is activated and use
`python -m pip` from that same interpreter to install `python-dotenv`.
Verify the import afterward. Installing a package into a different
Python environment may not fix the error.

### Prompt 23 --- Test before declaring a feature complete

**User prompt**

> Give me a testing checklist for the booking flow, MongoDB persistence,
> parent email, and mentor class link. For each test, state what
> observable evidence counts as success.

**Agent response**

Test the health endpoint, valid and invalid booking payloads,
conflicting slots, persistence after restart, email delivery to a
controlled inbox, and access control for class sessions. A success log
alone may not prove the user received an email or that a booking
persisted correctly. Record actual results and mark untested behavior as
pending.
------------------------------------------------------------------------

**End of transcript.**