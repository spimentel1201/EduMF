# Requirements Document

## Introduction

This document defines the requirements for the **Treasury and Payments Module** of EduMF, a school management system. The module provides a REST API under `/api/treasury` that backs two existing frontend pages:

1. **PaymentsPage** — a dashboard showing KPI cards (total collection, pending charges, defaulters), a paginated table of debt concepts, and quick-access cards for reports and management.
2. **NewChargePage** — a form for creating new debt charges with concept, amount, frequency, scope (general or specific grade/section), and start date.

The backend is a Node.js/TypeScript Express application using Mongoose and MongoDB, following the same architectural patterns already established in the project: Mongoose models, Express controllers, route files, service helpers, `ApiError` middleware, and `{ success: true, data: ... }` / `{ success: false, message: ... }` response envelopes.

All monetary amounts MUST use MongoDB's `Decimal128` type — never JavaScript `Number` — to avoid floating-point precision errors.

---

## Glossary

- **Debt** (Cuenta por cobrar): A charge assigned to a student for a specific concept (e.g., monthly tuition, workshop fee). Tracks amount, due date, and payment status.
- **CashRegister** (Caja Diaria): A daily cash register session opened by an admin, used to record cash income and expenses during a working day.
- **Transaction** (Movimiento de dinero): A financial movement (income or expense) linked to a CashRegister and optionally to a Debt.
- **DebtStatus**: One of `PENDIENTE`, `EN_VALIDACION`, `PAGADO`, `VENCIDO`, `ANULADO`.
- **CashRegisterStatus**: One of `ABIERTA`, `CERRADA`.
- **TransactionType**: One of `INGRESO`, `EGRESO`.
- **PaymentMethod**: One of `EFECTIVO`, `TRANSFERENCIA`, `TARJETA`.
- **TreasuryAPI**: The subset of the REST API that handles treasury and payments operations, served at `/api/treasury`.
- **TreasuryService**: The backend service class that encapsulates all treasury business logic.
- **Admin**: An authenticated user with role `admin`.
- **Parent** (Apoderado): An authenticated user with role `student` (acting as the student's guardian) who can report bank transfer payments.
- **Decimal128**: MongoDB's 128-bit decimal type used for all monetary fields to preserve precision.
- **MongoDB Session**: A MongoDB client session used to execute multiple operations atomically within a transaction.

---

## Requirements

### Requirement 1: Debt Model

**User Story:** As a developer, I want a well-defined Debt data model, so that student charges can be stored and tracked consistently.

#### Acceptance Criteria

1. THE TreasuryAPI SHALL store each Debt with the following fields: `studentId` (ObjectId reference to User, required), `concept` (string, required), `amount` (Decimal128, required), `dueDate` (Date, required), `status` (one of `PENDIENTE`, `EN_VALIDACION`, `PAGADO`, `VENCIDO`, `ANULADO`, default `PENDIENTE`).
2. THE TreasuryAPI SHALL automatically record `createdAt` and `updatedAt` timestamps on every Debt document.
3. THE TreasuryAPI SHALL expose the MongoDB `_id` field as `id` in all JSON responses, omitting `_id` and `__v`.
4. THE TreasuryAPI SHALL store the `amount` field as Decimal128 and serialize it as a numeric string in JSON responses to preserve precision.

---

### Requirement 2: CashRegister Model

**User Story:** As a developer, I want a well-defined CashRegister data model, so that daily cash sessions can be opened, tracked, and closed consistently.

#### Acceptance Criteria

1. THE TreasuryAPI SHALL store each CashRegister with the following fields: `openedByUserId` (ObjectId reference to User, required), `closedByUserId` (ObjectId reference to User, optional), `openedAt` (Date, required), `closedAt` (Date, optional), `initialBalance` (Decimal128, required), `expectedBalance` (Decimal128, required), `realBalance` (Decimal128, optional), `status` (one of `ABIERTA`, `CERRADA`, default `ABIERTA`).
2. THE TreasuryAPI SHALL automatically record `createdAt` and `updatedAt` timestamps on every CashRegister document.
3. THE TreasuryAPI SHALL store all balance fields as Decimal128 and serialize them as numeric strings in JSON responses.

---

### Requirement 3: Transaction Model

**User Story:** As a developer, I want a well-defined Transaction data model, so that every financial movement is recorded with full traceability.

#### Acceptance Criteria

1. THE TreasuryAPI SHALL store each Transaction with the following fields: `cashRegisterId` (ObjectId reference to CashRegister, optional), `debtId` (ObjectId reference to Debt, optional), `type` (one of `INGRESO`, `EGRESO`, required), `paymentMethod` (one of `EFECTIVO`, `TRANSFERENCIA`, `TARJETA`, required), `amount` (Decimal128, required), `voucherUrl` (string, optional), `registeredByUserId` (ObjectId reference to User, required).
2. THE TreasuryAPI SHALL automatically record `createdAt` and `updatedAt` timestamps on every Transaction document.
3. THE TreasuryAPI SHALL store the `amount` field as Decimal128 and serialize it as a numeric string in JSON responses.

---

### Requirement 4: Create Debt

**User Story:** As an admin, I want to create new debt charges for students, so that I can track what each student owes.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/treasury/debts` with a valid body, THE TreasuryAPI SHALL create a new Debt document and return it with HTTP 201.
2. THE TreasuryAPI SHALL accept the following fields in the request body: `studentId` (string), `concept` (string), `amount` (string or number), `dueDate` (ISO date string).
3. IF any required field (`studentId`, `concept`, `amount`, `dueDate`) is missing or invalid, THEN THE TreasuryAPI SHALL return HTTP 400 with a descriptive validation error.
4. THE TreasuryAPI SHALL convert the `amount` field to Decimal128 before persisting the Debt document.
5. WHEN a POST request is sent to `/api/treasury/debts`, THE TreasuryAPI SHALL require the authenticated user to have the `admin` role and return HTTP 403 if the role is insufficient.

---

### Requirement 5: List and Retrieve Debts

**User Story:** As an admin, I want to list and filter debts, so that I can monitor outstanding charges and payment statuses.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/treasury/debts`, THE TreasuryAPI SHALL return a paginated list of Debt documents.
2. WHEN a GET request to `/api/treasury/debts` includes a `status` query parameter, THE TreasuryAPI SHALL return only Debts matching that status value.
3. WHEN a GET request to `/api/treasury/debts` includes a `studentId` query parameter, THE TreasuryAPI SHALL return only Debts belonging to that student.
4. WHEN a GET request to `/api/treasury/debts` includes a `search` query parameter, THE TreasuryAPI SHALL return only Debts whose `concept` field contains the search string (case-insensitive).
5. WHEN a GET request is sent to `/api/treasury/debts/:id`, THE TreasuryAPI SHALL return the matching Debt document or HTTP 404 if not found.
6. THE TreasuryAPI SHALL use a default `limit` of 10 and a default `page` of 1 WHEN those parameters are absent.

---

### Requirement 6: Report Bank Transfer Payment

**User Story:** As a parent, I want to report that I have made a bank transfer payment for a debt, so that an admin can validate and approve it.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/treasury/debts/:id/report-transfer` with a valid `voucherUrl`, THE TreasuryAPI SHALL update the Debt status to `EN_VALIDACION` and persist the `voucherUrl` on the associated Transaction.
2. THE TreasuryAPI SHALL only allow this operation WHEN the Debt status is `PENDIENTE` or `VENCIDO`; IF the status is any other value, THEN THE TreasuryAPI SHALL return HTTP 409 with a descriptive error.
3. IF the Debt referenced by `:id` does not exist, THEN THE TreasuryAPI SHALL return HTTP 404.
4. THE TreasuryAPI SHALL make this operation idempotent: WHEN the Debt is already `EN_VALIDACION` with the same `voucherUrl`, THE TreasuryAPI SHALL return HTTP 200 without creating duplicate records.
5. WHEN a POST request is sent to `/api/treasury/debts/:id/report-transfer`, THE TreasuryAPI SHALL require a valid Bearer JWT token and return HTTP 401 if absent.

---

### Requirement 7: Approve Bank Transfer Payment

**User Story:** As an admin, I want to approve a reported bank transfer payment, so that the debt is marked as paid and a transaction record is created atomically.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/treasury/validations/:id/approve`, THE TreasuryAPI SHALL change the Debt status from `EN_VALIDACION` to `PAGADO` and create a Transaction of type `INGRESO` with `paymentMethod` `TRANSFERENCIA` linked to that Debt.
2. THE TreasuryAPI SHALL execute the status change and Transaction creation within a single MongoDB session so that both operations succeed or both are rolled back.
3. IF the Debt status is not `EN_VALIDACION`, THEN THE TreasuryAPI SHALL return HTTP 409 with a descriptive error without modifying any data.
4. IF the Transaction creation fails within the session, THEN THE TreasuryAPI SHALL abort the session so the Debt status is NOT changed to `PAGADO`.
5. IF the Debt referenced by `:id` does not exist, THEN THE TreasuryAPI SHALL return HTTP 404.
6. WHEN a POST request is sent to `/api/treasury/validations/:id/approve`, THE TreasuryAPI SHALL require the authenticated user to have the `admin` role and return HTTP 403 if the role is insufficient.

---

### Requirement 8: Open Cash Register

**User Story:** As an admin, I want to open a daily cash register session, so that I can record cash income and expenses for the day.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/treasury/cash-registers/open` with a valid `initialBalance`, THE TreasuryAPI SHALL create a new CashRegister document with status `ABIERTA` and return it with HTTP 201.
2. THE TreasuryAPI SHALL set `openedByUserId` to the authenticated user's ID and `openedAt` to the current timestamp.
3. THE TreasuryAPI SHALL set `initialBalance` and `expectedBalance` both to the provided `initialBalance` value at creation time.
4. IF a CashRegister with status `ABIERTA` already exists for the same `openedByUserId`, THEN THE TreasuryAPI SHALL return HTTP 409 with a descriptive error.
5. IF the `initialBalance` field is missing or not a valid numeric value, THEN THE TreasuryAPI SHALL return HTTP 400.
6. WHEN a POST request is sent to `/api/treasury/cash-registers/open`, THE TreasuryAPI SHALL require the authenticated user to have the `admin` role and return HTTP 403 if the role is insufficient.

---

### Requirement 9: Register Cash Income

**User Story:** As an admin, I want to register a cash payment against a debt within an open cash register, so that the debt is marked as paid and the cash register balance is updated.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/treasury/cash-registers/:id/income` with valid `debtId` and `amount`, THE TreasuryAPI SHALL change the Debt status to `PAGADO` and create a Transaction of type `INGRESO` with `paymentMethod` `EFECTIVO` linked to both the CashRegister and the Debt.
2. THE TreasuryAPI SHALL execute the Debt status change and Transaction creation within a single MongoDB session.
3. IF the CashRegister referenced by `:id` does not exist or has status `CERRADA`, THEN THE TreasuryAPI SHALL return HTTP 409 with a descriptive error.
4. IF the Debt referenced by `debtId` does not exist, THEN THE TreasuryAPI SHALL return HTTP 404.
5. IF the `amount` field is missing or not a valid numeric value, THEN THE TreasuryAPI SHALL return HTTP 400.
6. WHEN a POST request is sent to `/api/treasury/cash-registers/:id/income`, THE TreasuryAPI SHALL require the authenticated user to have the `admin` role and return HTTP 403 if the role is insufficient.

---

### Requirement 10: Close Cash Register

**User Story:** As an admin, I want to close a cash register session with the real counted balance, so that the expected and actual balances can be compared for reconciliation.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/treasury/cash-registers/:id/close` with a valid `realBalance`, THE TreasuryAPI SHALL compute `expectedBalance` as `initialBalance + sum(INGRESO transactions) - sum(EGRESO transactions)` for that CashRegister, then set `realBalance`, `closedAt`, `closedByUserId`, and change status to `CERRADA`.
2. THE TreasuryAPI SHALL only allow closing a CashRegister WHEN its status is `ABIERTA`; IF the status is `CERRADA`, THEN THE TreasuryAPI SHALL return HTTP 409 with a descriptive error.
3. IF the CashRegister referenced by `:id` does not exist, THEN THE TreasuryAPI SHALL return HTTP 404.
4. IF the `realBalance` field is missing or not a valid numeric value, THEN THE TreasuryAPI SHALL return HTTP 400.
5. THE TreasuryAPI SHALL compute `expectedBalance` using Decimal128 arithmetic to avoid floating-point precision errors.
6. WHEN a POST request is sent to `/api/treasury/cash-registers/:id/close`, THE TreasuryAPI SHALL require the authenticated user to have the `admin` role and return HTTP 403 if the role is insufficient.

---

### Requirement 11: List and Retrieve Cash Registers

**User Story:** As an admin, I want to list cash registers and view the details of a specific one, so that I can monitor daily cash sessions and their transactions.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/treasury/cash-registers`, THE TreasuryAPI SHALL return a paginated list of CashRegister documents sorted by `openedAt` descending.
2. WHEN a GET request is sent to `/api/treasury/cash-registers/:id`, THE TreasuryAPI SHALL return the matching CashRegister document populated with its associated Transactions, or HTTP 404 if not found.
3. WHEN a GET request is sent to `/api/treasury/transactions` with a `cashRegisterId` query parameter, THE TreasuryAPI SHALL return all Transactions linked to that CashRegister.
4. WHEN a GET request is sent to `/api/treasury/cash-registers`, THE TreasuryAPI SHALL require the authenticated user to have the `admin` role and return HTTP 403 if the role is insufficient.

---

### Requirement 12: Monetary Precision

**User Story:** As a developer, I want all monetary values to use Decimal128 throughout the system, so that financial calculations are free from floating-point precision errors.

#### Acceptance Criteria

1. THE TreasuryAPI SHALL store all monetary fields (`amount`, `initialBalance`, `expectedBalance`, `realBalance`) as MongoDB Decimal128 — never as JavaScript Number.
2. WHEN the API receives a monetary value in a request body as a string or number, THE TreasuryAPI SHALL convert it to Decimal128 before any persistence or arithmetic operation.
3. WHEN the API returns a monetary value in a response body, THE TreasuryAPI SHALL serialize it as a numeric string (e.g., `"150.00"`) to preserve precision across JSON serialization.
4. THE TreasuryAPI SHALL perform all balance arithmetic (e.g., `expectedBalance` computation) using Decimal128 values, not JavaScript Number.

---

### Requirement 13: Custom Error Classes

**User Story:** As a developer, I want domain-specific error classes for treasury operations, so that error handling is expressive and consistent with the existing ApiError pattern.

#### Acceptance Criteria

1. THE TreasuryAPI SHALL provide a `DebtNotFoundError` class that extends `ApiError` with HTTP status 404 and a descriptive message identifying the missing debt.
2. THE TreasuryAPI SHALL provide an `InvalidPaymentStateError` class that extends `ApiError` with HTTP status 409 and a message describing the invalid state transition.
3. WHEN a `DebtNotFoundError` or `InvalidPaymentStateError` is thrown in any treasury route handler, THE TreasuryAPI SHALL pass it to the Express `next` function so the global error handler processes it and returns the correct HTTP status.

---

### Requirement 14: Authentication and Authorization

**User Story:** As a system administrator, I want all treasury endpoints to require authentication, so that only authorized users can access financial data.

#### Acceptance Criteria

1. THE TreasuryAPI SHALL require a valid Bearer JWT token on all routes.
2. IF a request to any treasury route does not include a valid Bearer JWT token, THEN THE TreasuryAPI SHALL return HTTP 401.
3. THE TreasuryAPI SHALL restrict debt creation, payment approval, cash register management, and transaction listing to users with the `admin` role, returning HTTP 403 for insufficient roles.
4. THE TreasuryAPI SHALL allow users with any authenticated role to call `POST /api/treasury/debts/:id/report-transfer` (reporting a bank transfer is a parent-facing action).

---

### Requirement 15: Frontend Integration — Treasury Service

**User Story:** As a frontend developer, I want a typed API service module for treasury operations, so that PaymentsPage and NewChargePage can replace their mock data with real API calls.

#### Acceptance Criteria

1. THE TreasuryAPI SHALL accept and return Debt data in a shape compatible with the table rows displayed in `PaymentsPage.tsx`: `id`, `concept`, `studentId`, `amount` (numeric string), `dueDate` (ISO string), `status`.
2. THE TreasuryAPI SHALL accept the debt creation payload from `NewChargePage.tsx`: `concept` (string), `amount` (string), `dueDate` (ISO string), `studentId` (string).
3. THE TreasuryAPI SHALL be consumed by a typed frontend service at `src/services/treasuryService.ts` that uses the existing `api` Axios instance from `src/services/api.ts`.
4. THE TreasuryAPI SHALL return paginated debt list responses with `total`, `page`, `limit`, and `totalPages` fields so the pagination controls in `PaymentsPage.tsx` can be driven by real data.

---

### Requirement 16: Error Handling and Response Consistency

**User Story:** As a developer, I want all treasury endpoints to follow the same error response format as the rest of the API, so that the frontend can handle errors uniformly.

#### Acceptance Criteria

1. THE TreasuryAPI SHALL use the existing `ApiError` middleware class for all error responses.
2. THE TreasuryAPI SHALL return all error responses in the format `{ success: false, message: "<message>" }`.
3. THE TreasuryAPI SHALL return all success responses in the format `{ success: true, data: <payload> }`.
4. WHEN an unhandled exception occurs in any treasury route handler, THE TreasuryAPI SHALL pass the error to the Express `next` function so the global error handler processes it.
5. WHEN a MongoDB session is aborted due to a transaction failure, THE TreasuryAPI SHALL return HTTP 500 with a descriptive error message.
