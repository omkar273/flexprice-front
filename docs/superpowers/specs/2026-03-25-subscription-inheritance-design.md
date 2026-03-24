# Subscription Inheritance — Frontend Design Spec

**Date:** 2026-03-25
**Backend PR:** https://github.com/flexprice/flexprice/pull/1415
**Reference (old) PR:** https://github.com/flexprice/flexprice-front/pull/818/changes
**Approach:** Option B — New reusable dialog + dedicated section component

---

## Overview

Implement customer inheritance (parent → child subscriptions) in the frontend, fully aligned with the backend PR #1415 API contract. A **parent** subscription owns all line items and aggregates usage from **inherited** (child) skeleton subscriptions. Each child customer gets their own `inherited` subscription that points back to the parent via `parent_subscription_id`.

---

## Subscription Type Enum

Add to `src/models/Subscription.ts`:

```ts
export enum SUBSCRIPTION_TYPE {
  STANDALONE = 'standalone',   // default — regular subscription, no hierarchy
  PARENT     = 'parent',       // owns line items; aggregates child usage
  INHERITED  = 'inherited',    // skeleton subscription for a child customer; no line items
}
```

**Rule:** All type checks throughout the codebase must use this enum. No raw string comparisons. If `subscription_type` is `undefined` (legacy records), treat as `STANDALONE`.

---

## Section 1 — API Layer

### 1a. Model changes (`src/models/Subscription.ts`)
- Add `SUBSCRIPTION_TYPE` enum (above).
- Add `subscription_type?: SUBSCRIPTION_TYPE` to the `Subscription` interface.

### 1b. DTO changes (`src/types/dto/Subscription.ts`)

**New interface:**
```ts
export interface SubscriptionInheritanceConfig {
  customer_ids_to_inherit_subscription?: string[];
  external_customer_ids_to_inherit_subscription?: string[];
  parent_subscription_id?: string;
  invoicing_customer_id?: string;
  invoicing_customer_external_id?: string;
}
```

**New DTO:**
```ts
export interface ExecuteSubscriptionInheritanceRequest {
  customer_ids_to_inherit_subscription?: string[];
}
```

**`CreateSubscriptionRequest` changes:**
- Remove flat fields: `parent_subscription_id`, `invoicing_customer_id`, `invoicing_customer_external_id`
- Add: `inheritance?: SubscriptionInheritanceConfig`
- If `inheritedCustomers` is empty and no invoicing override is needed, omit `inheritance` entirely (backend defaults to standalone).

**`SubscriptionResponse` changes:**
- Add `subscription_type?: SUBSCRIPTION_TYPE`

**`ListSubscriptionsPayload` changes:**
- Add `subscription_types?: SUBSCRIPTION_TYPE[]`

### 1c. API client (`src/api/SubscriptionApi.ts`)

Add one method:
```ts
public static async executeInheritance(
  id: string,
  payload: ExecuteSubscriptionInheritanceRequest,
): Promise<SubscriptionResponse> {
  return await AxiosClient.post(`${this.baseUrl}/${id}/inheritance/execute`, payload);
}
```

---

## Section 2 — State Layer

**File:** `src/pages/customer/customers/CreateCustomerSubscriptionPage.tsx`

Add to `SubscriptionFormState`:
```ts
inheritedCustomers: Customer[];  // full objects for table display; default []
```

**Payload mapping on submit:**
```ts
inheritance: {
  ...(inheritedCustomers.length > 0 && {
    customer_ids_to_inherit_subscription: inheritedCustomers.map(c => c.id),
  }),
  ...(invoicingCustomer && { invoicing_customer_id: invoicingCustomer.id }),
}
```
The flat `invoicingCustomer` UI state field on `SubscriptionFormState` stays unchanged; only the outgoing payload shape changes.

---

## Section 3 — New Components

### 3a. `AddInheritedCustomersDialog`

**Location:** `src/components/molecules/AddInheritedCustomersDialog/AddInheritedCustomersDialog.tsx`

**Props:**
```ts
interface AddInheritedCustomersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (customers: Customer[]) => void;
  excludeIds?: string[];   // already-added customer IDs — excluded from search
  isLoading?: boolean;     // submit spinner while API call is in-flight
}
```

**Internals:**
- Local `selectedCustomers: Customer[]` state, reset on close.
- Async customer search input using `CustomerApi.searchCustomers` with 300ms debounce. Search results exclude `excludeIds`.
- Do **not** modify `CustomerSearchSelect` (it's single-select only). Instead, wrap the search in a local async input + results dropdown, allowing multiple selections.
- Selected customers shown as removable chips/tags below the search input.
- Confirm button disabled when `selectedCustomers.length === 0` or `isLoading`.
- On confirm: calls `onConfirm(selectedCustomers)` then `onOpenChange(false)`.

**Reuse:** Used by both `SubscriptionForm` (create flow) and `CustomerSubscriptionEditPage` (post-creation add flow).

---

### 3b. `InheritedCustomersTable`

**Location:** `src/components/molecules/InheritedCustomersTable/InheritedCustomersTable.tsx`

**Props:**
```ts
interface InheritedCustomersTableProps {
  parentSubscriptionId: string;
  onAddCustomers: () => void;  // triggers dialog open in parent
}
```

**Data fetch:**
```ts
SubscriptionApi.searchSubscriptions({
  parent_subscription_ids: [parentSubscriptionId],
  subscription_types: [SUBSCRIPTION_TYPE.INHERITED],
  subscription_status: [SUBSCRIPTION_STATUS.ACTIVE],
})
```

**Columns (using `FlexpriceTable`):**

| Column | Value | Behavior |
|--------|-------|----------|
| Customer | `customer.name` + `customer.external_id` | Click → `/customers/:customer_id` |
| Status | Status badge chip | — |
| Start Date | Formatted date | Sortable |
| Plan | `plan.name` | Click → `/customers/:customer_id/subscription/:id` |

- Built-in pagination, sorting, filtering via `FlexpriceTable`.
- Section header: "Inherited Customers" (`FormHeader`) + "Add Customers" button.
- Empty state: "No inherited customers yet".

**Export:** Both components exported from `src/components/molecules/index.ts`.

---

## Section 4 — SubscriptionForm + Edit Page

### 4a. `SubscriptionForm.tsx` — Inheritance Section

**Placement:** After Entitlements section, before Billing Configuration section.

**Visibility condition:**
```ts
state.selectedPlan && !isLoadingPlanDetails && !isDisabled
```

**UI:**
- `FormHeader` title: "Inherited Customers"
- Inline table of `state.inheritedCustomers` — columns: Customer Name/External ID + Remove button
- "Add Customers" button → opens `AddInheritedCustomersDialog`
- Dialog `onConfirm`: dedupe incoming customers against existing list by `id`, append new entries to `state.inheritedCustomers`
- Remove: filter customer out of `state.inheritedCustomers`

**No `isDisabled` prop changes needed** — the section is hidden entirely in edit mode so the existing prop conveys sufficient state.

---

### 4b. `CustomerSubscriptionEditPage.tsx`

**Inherited customers panel** (shown when `subscription_type === SUBSCRIPTION_TYPE.PARENT`):
```tsx
{subscriptionDetails.subscription_type === SUBSCRIPTION_TYPE.PARENT && (
  <>
    <InheritedCustomersTable
      parentSubscriptionId={subscriptionId!}
      onAddCustomers={() => setIsAddCustomersDialogOpen(true)}
    />
    <AddInheritedCustomersDialog
      isOpen={isAddCustomersDialogOpen}
      onOpenChange={setIsAddCustomersDialogOpen}
      onConfirm={handleAddInheritedCustomers}
      excludeIds={/* derived from InheritedCustomersTable fetch */}
      isLoading={isExecutingInheritance}
    />
  </>
)}
```

**`handleAddInheritedCustomers`:**
```ts
const handleAddInheritedCustomers = useCallback((customers: Customer[]) => {
  executeInheritance({
    id: subscriptionId!,
    payload: { customer_ids_to_inherit_subscription: customers.map(c => c.id) },
  });
}, [executeInheritance, subscriptionId]);
```

**`executeInheritance` mutation:**
- `onSuccess`: `toast.success('Customers added successfully')`, refetch inherited table query, close dialog
- `onError`: `toast.error(message)`, dialog stays open

**Placement in page:** After `SubscriptionEditCreditGrantsSection`, before entitlements.

---

## Section 5 — Cancel Guard

**Three files to update:**
1. `src/components/organisms/Subscription/SubscriptionActionButton.tsx`
2. `src/components/molecules/SubscriptionTable/SubscriptionTable.tsx`
3. `src/pages/customer/subscriptions/Subscriptions.tsx`

**Pattern (same in all three):**
```ts
const isInherited = subscription.subscription_type === SUBSCRIPTION_TYPE.INHERITED;

// Cancel menu item / button:
{
  label: 'Cancel',
  disabled: isInherited,
  tooltip: isInherited ? 'Inherited subscriptions cannot be cancelled directly' : undefined,
  onClick: () => !isInherited && openCancelModal(),
}
```

Use existing `Tooltip` component from atoms for the tooltip display.

---

## Data Flow Summary

### Create flow
```
User selects customers in SubscriptionForm
→ stored in state.inheritedCustomers (full Customer objects)
→ on submit: mapped to inheritance.customer_ids_to_inherit_subscription
→ POST /subscriptions → returns parent subscription
```

### Edit / Add Children flow
```
User clicks "Add Customers" on Edit page
→ AddInheritedCustomersDialog opens (excludeIds = existing inherited customer IDs)
→ User selects new customers → confirms
→ POST /subscriptions/:id/inheritance/execute
→ on success: refetch InheritedCustomersTable, toast.success
→ on error: toast.error, dialog stays open
```

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| `subscription_type` is undefined (legacy records) | Treat as `STANDALONE` — no cancel guard, no parent panel |
| User tries to submit empty customer list | Confirm button disabled client-side |
| Already-inherited customers appear in search | Excluded via `excludeIds`; backend also skips silently as safety net |
| API error on executeInheritance | `toast.error` with backend message; dialog stays open |
| Large customer lists | Search debounced 300ms; paginated results |

---

## File Change Summary

| File | Change |
|------|--------|
| `src/models/Subscription.ts` | Add `SUBSCRIPTION_TYPE` enum + `subscription_type` field on `Subscription` |
| `src/types/dto/Subscription.ts` | Add `SubscriptionInheritanceConfig`, `ExecuteSubscriptionInheritanceRequest`; update `CreateSubscriptionRequest`, `SubscriptionResponse`, `ListSubscriptionsPayload` |
| `src/api/SubscriptionApi.ts` | Add `executeInheritance` method |
| `src/pages/customer/customers/CreateCustomerSubscriptionPage.tsx` | Add `inheritedCustomers` to `SubscriptionFormState`; update payload builder |
| `src/components/molecules/AddInheritedCustomersDialog/AddInheritedCustomersDialog.tsx` | **New** — reusable multi-select customer dialog |
| `src/components/molecules/InheritedCustomersTable/InheritedCustomersTable.tsx` | **New** — inherited subscriptions table for Edit page |
| `src/components/molecules/index.ts` | Export both new components |
| `src/components/organisms/Subscription/SubscriptionForm.tsx` | Add Inheritance section (create mode only) |
| `src/pages/customer/customers/CustomerSubscriptionEditPage.tsx` | Add `InheritedCustomersTable` + `AddInheritedCustomersDialog` for parent subscriptions |
| `src/components/organisms/Subscription/SubscriptionActionButton.tsx` | Cancel guard for inherited subscriptions |
| `src/components/molecules/SubscriptionTable/SubscriptionTable.tsx` | Cancel guard for inherited subscriptions |
| `src/pages/customer/subscriptions/Subscriptions.tsx` | Cancel guard for inherited subscriptions |
