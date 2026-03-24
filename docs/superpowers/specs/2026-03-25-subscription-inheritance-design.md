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
- **Note:** `SubscriptionResponse extends Subscription`, so `subscription_type` is automatically available on `SubscriptionResponse` — do NOT add it again on `SubscriptionResponse` to avoid a conflicting duplicate declaration.

### 1b. DTO changes (`src/types/dto/Subscription.ts`)

**New interface:**
```ts
export interface SubscriptionInheritanceConfig {
  customer_ids_to_inherit_subscription?: string[];
  // external_customer_ids_to_inherit_subscription is intentionally NOT sent from the frontend;
  // the frontend always has access to internal customer IDs via the Customer object.
  parent_subscription_id?: string;
  // parent_subscription_id is intentionally NOT set by the frontend;
  // it is set internally by the backend when creating inherited child subscriptions.
  invoicing_customer_id?: string;
  // invoicing_customer_external_id is intentionally NOT sent from the frontend;
  // the frontend always has access to internal customer IDs.
}
```

**New DTO:**
```ts
export interface ExecuteSubscriptionInheritanceRequest {
  customer_ids_to_inherit_subscription?: string[];
}
```

**`CreateSubscriptionRequest` breaking changes:**
- **Remove** the following flat fields entirely (replaced by nested `inheritance`):
  - `parent_subscription_id?: string | null`
  - `invoicing_customer_id?: string`
  - `invoicing_customer_external_id?: string`
- **Add:** `inheritance?: SubscriptionInheritanceConfig`
- The payload builder in `CreateCustomerSubscriptionPage.tsx` must be updated to write `invoicingCustomer.id` into `inheritance.invoicing_customer_id` instead of the top-level field.
- If `inheritedCustomers` is empty and no invoicing override is needed, omit `inheritance` entirely (backend defaults to standalone).

**`ListSubscriptionsPayload` changes:**
- Add `subscription_types?: SUBSCRIPTION_TYPE[]`

**`SubscriptionFilter` changes (`SubscriptionFilter` interface, which mirrors `ListSubscriptionsPayload`):**
- Also add `subscription_types?: SUBSCRIPTION_TYPE[]` — both interfaces must stay in sync since they are used interchangeably across list and search endpoints.

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

**Payload mapping on submit — full `inheritance` object:**
```ts
// Only include inheritance object if there's something to put in it
const inheritancePayload: SubscriptionInheritanceConfig | undefined =
  inheritedCustomers.length > 0 || invoicingCustomer
    ? {
        ...(inheritedCustomers.length > 0 && {
          customer_ids_to_inherit_subscription: inheritedCustomers.map(c => c.id),
        }),
        ...(invoicingCustomer && { invoicing_customer_id: invoicingCustomer.id }),
      }
    : undefined;

// In CreateSubscriptionRequest:
{
  ...(inheritancePayload && { inheritance: inheritancePayload }),
  // NOTE: top-level invoicing_customer_id, invoicing_customer_external_id,
  // and parent_subscription_id fields are REMOVED from CreateSubscriptionRequest.
}
```

The flat `invoicingCustomer` UI state field on `SubscriptionFormState` stays unchanged — it holds a full `Customer` object for UI display. Only the outgoing API payload shape changes.

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
  excludeIds?: string[];   // already-added customer IDs — excluded from search results
  isLoading?: boolean;     // submit spinner while API call is in-flight
}
```

**Internals:**
- Local `selectedCustomers: Customer[]` state, reset on close.
- Async customer search input using `CustomerApi.searchCustomers` with 300ms debounce. Search results exclude `excludeIds`.
- Do **not** modify `CustomerSearchSelect` (it's single-select only). Instead, implement a local async search input + results dropdown that supports multiple selections.
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
  onAddCustomers: () => void;            // triggers dialog open in parent
  onCustomerIdsLoaded?: (ids: string[]) => void;  // callback to lift loaded customer IDs to parent
}
```

**`onCustomerIdsLoaded` usage:** After the subscription list is fetched, call `onCustomerIdsLoaded` with the customer IDs of all loaded inherited subscriptions. `CustomerSubscriptionEditPage` uses this to populate its `excludeIds` state, which is then passed to `AddInheritedCustomersDialog`. This avoids duplicating the query in the parent page and keeps `InheritedCustomersTable` as the single source of truth for that data.

**Query key:** The `useQuery` call inside `InheritedCustomersTable` **must** use `['inheritedSubscriptions', parentSubscriptionId]` as its query key. The `executeInheritance` mutation's `onSuccess` handler in `CustomerSubscriptionEditPage` calls `refetchQueries(['inheritedSubscriptions', subscriptionId])` to trigger a table refresh — if any other key is used, the refetch will silently do nothing.

**Data fetch:**
```ts
useQuery({
  queryKey: ['inheritedSubscriptions', parentSubscriptionId],
  queryFn: () => SubscriptionApi.searchSubscriptions({
    parent_subscription_ids: [parentSubscriptionId],
    subscription_types: [SUBSCRIPTION_TYPE.INHERITED],
    subscription_status: [SUBSCRIPTION_STATUS.ACTIVE],
  }),
})
```

> **Note on active-only filter:** Only active inherited subscriptions are shown. If a child subscription was previously cancelled, it will not appear. This is intentional — the table represents currently active inheritance relationships. Future requirements may add a toggle to show cancelled children.

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
- Dialog `excludeIds`: `state.inheritedCustomers.map(c => c.id)` — prevents re-selecting already-added customers
- Dialog `onConfirm`: dedupe incoming customers against existing list by `id`, append new entries to `state.inheritedCustomers`
- Remove: filter customer out of `state.inheritedCustomers`

**No `isDisabled` prop changes needed** — the section is hidden entirely in edit mode so the existing prop conveys sufficient state.

---

### 4b. `CustomerSubscriptionEditPage.tsx`

**Inherited customers panel** — shown when `subscriptionDetails.subscription_type === SUBSCRIPTION_TYPE.PARENT`.

**`excludeIds` derivation:** `CustomerSubscriptionEditPage` maintains local state `inheritedCustomerIds: string[]` (default `[]`). `InheritedCustomersTable` calls `onCustomerIdsLoaded` after each successful fetch, which sets this state. This state is then passed as `excludeIds` to `AddInheritedCustomersDialog`.

**Page insertion point:** After `SubscriptionEditCreditGrantsSection` (line ~293 in the current file), before `SubscriptionEntitlementsSection` (line ~312). In the current file order: `SubscriptionEditDetailsHeader` → `SubscriptionEditChargesSection` → `SubscriptionEditCreditGrantsSection` → **[insert here]** → `SubscriptionEntitlementsSection` → `SubscriptionAddonsSection`.

```tsx
{subscriptionDetails.subscription_type === SUBSCRIPTION_TYPE.PARENT && (
  <>
    <InheritedCustomersTable
      parentSubscriptionId={subscriptionId!}
      onAddCustomers={() => setIsAddCustomersDialogOpen(true)}
      onCustomerIdsLoaded={setInheritedCustomerIds}
    />
    <AddInheritedCustomersDialog
      isOpen={isAddCustomersDialogOpen}
      onOpenChange={setIsAddCustomersDialogOpen}
      onConfirm={handleAddInheritedCustomers}
      excludeIds={inheritedCustomerIds}
      isLoading={isExecutingInheritance}
    />
  </>
)}
```

**`handleAddInheritedCustomers`:**
```ts
const handleAddInheritedCustomers = useCallback((customers: Customer[]) => {
  executeInheritance({
    customer_ids_to_inherit_subscription: customers.map(c => c.id),
  });
}, [executeInheritance]);
```

**`executeInheritance` mutation:**
```ts
const { mutate: executeInheritance, isPending: isExecutingInheritance } = useMutation({
  mutationFn: (payload: ExecuteSubscriptionInheritanceRequest) =>
    SubscriptionApi.executeInheritance(subscriptionId!, payload),
  onSuccess: () => {
    toast.success('Customers added successfully');
    refetchQueries(['inheritedSubscriptions', subscriptionId]);
    setIsAddCustomersDialogOpen(false);
  },
  onError: (error: { error?: { message?: string } }) => {
    toast.error(error?.error?.message || 'Failed to add customers');
    // Dialog stays open
  },
});
```

---

## Section 5 — Cancel Guard

**Three files to update:**
1. `src/components/organisms/Subscription/SubscriptionActionButton.tsx`
2. `src/components/molecules/SubscriptionTable/SubscriptionTable.tsx`
3. `src/pages/customer/subscriptions/Subscriptions.tsx`

**Pattern (same logic in all three, but property names differ per component's action menu API):**
```ts
const isInherited = subscription.subscription_type === SUBSCRIPTION_TYPE.INHERITED;
```

- `SubscriptionActionButton.tsx` — uses a `DropdownMenuOption` shape; apply `disabled: isInherited` on the cancel option object and wrap in a `Tooltip` when `isInherited`.
- `SubscriptionTable.tsx` — uses an `enabled` boolean on action items; apply `enabled: !isInherited`. Check the existing action menu API for tooltip support and apply consistently.
- `Subscriptions.tsx` — same pattern as `SubscriptionTable`; check action item API for correct prop name.

Tooltip message for all three: `"Inherited subscriptions cannot be cancelled directly"`. Use the existing `Tooltip` component from atoms.

> **Important:** Do not assume `disabled` vs `enabled` — each component's action menu API uses a different prop. Inspect the existing cancel action item in each file and apply the guard with the correct property.

---

## Data Flow Summary

### Create flow
```
User selects customers in SubscriptionForm
→ stored in state.inheritedCustomers (full Customer objects)
→ on submit: mapped to inheritance.customer_ids_to_inherit_subscription
   (along with invoicing_customer_id if set, inside the same inheritance object)
→ POST /subscriptions → backend creates parent subscription + inherited children
```

### Edit / Add Children flow
```
User visits CustomerSubscriptionEditPage for a PARENT subscription
→ InheritedCustomersTable fetches active inherited subscriptions
→ onCustomerIdsLoaded fires → page sets inheritedCustomerIds state
→ User clicks "Add Customers" → AddInheritedCustomersDialog opens
   (excludeIds = inheritedCustomerIds)
→ User selects new customers → confirms
→ POST /subscriptions/:id/inheritance/execute
→ on success: refetch InheritedCustomersTable, toast.success, close dialog
→ on error: toast.error, dialog stays open
```

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| `subscription_type` is undefined (legacy records) | Treat as `STANDALONE` — no cancel guard, no parent panel shown |
| User tries to submit empty customer list | Confirm button disabled client-side |
| Already-inherited customers appear in search | Excluded via `excludeIds`; backend also skips silently as safety net |
| API error on executeInheritance | `toast.error` with backend message; dialog stays open |
| Large customer lists | Search debounced 300ms; paginated results |
| Cancelled inherited subscription | Not shown in table (active-only filter); intentional for now |

---

## File Change Summary

| File | Change |
|------|--------|
| `src/models/Subscription.ts` | Add `SUBSCRIPTION_TYPE` enum + `subscription_type?: SUBSCRIPTION_TYPE` on `Subscription` interface |
| `src/types/dto/Subscription.ts` | Add `SubscriptionInheritanceConfig`, `ExecuteSubscriptionInheritanceRequest`; update `CreateSubscriptionRequest` (remove 3 flat fields, add `inheritance`); add `subscription_types` to both `ListSubscriptionsPayload` and `SubscriptionFilter` |
| `src/types/dto/index.ts` (barrel) | Re-export `SubscriptionInheritanceConfig` and `ExecuteSubscriptionInheritanceRequest` if the barrel file re-exports from `Subscription.ts` |
| `src/api/SubscriptionApi.ts` | Add `executeInheritance` method |
| `src/pages/customer/customers/CreateCustomerSubscriptionPage.tsx` | Add `inheritedCustomers: Customer[]` to `SubscriptionFormState`; update payload builder to use `inheritance` nested object |
| `src/components/molecules/AddInheritedCustomersDialog/AddInheritedCustomersDialog.tsx` | **New** — reusable multi-select customer dialog |
| `src/components/molecules/InheritedCustomersTable/InheritedCustomersTable.tsx` | **New** — inherited subscriptions table with `onCustomerIdsLoaded` callback |
| `src/components/molecules/index.ts` | Export both new components |
| `src/components/organisms/Subscription/SubscriptionForm.tsx` | Add Inheritance section (create mode only, hidden when `isDisabled`) |
| `src/pages/customer/customers/CustomerSubscriptionEditPage.tsx` | Add `InheritedCustomersTable` + `AddInheritedCustomersDialog` for parent subscriptions; `executeInheritance` mutation |
| `src/components/organisms/Subscription/SubscriptionActionButton.tsx` | Cancel guard for `SUBSCRIPTION_TYPE.INHERITED` |
| `src/components/molecules/SubscriptionTable/SubscriptionTable.tsx` | Cancel guard for `SUBSCRIPTION_TYPE.INHERITED` |
| `src/pages/customer/subscriptions/Subscriptions.tsx` | Cancel guard for `SUBSCRIPTION_TYPE.INHERITED` |
