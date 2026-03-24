# Subscription Inheritance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement parent→child subscription inheritance in the frontend, aligned with backend PR #1415 — covering API layer, form UI, reusable dialog, edit page table, and cancel guards.

**Architecture:** Option B — new reusable `AddInheritedCustomersDialog` + `InheritedCustomersTable` molecules consumed by both `SubscriptionForm` (create flow) and `CustomerSubscriptionEditPage` (edit flow). A `SUBSCRIPTION_TYPE` enum drives all conditional rendering and cancel guards — no raw string comparisons anywhere.

**Tech Stack:** React 18, TypeScript, TanStack Query, Tailwind CSS, Vitest + Testing Library, `FlexpriceTable`, `CustomerApi.searchCustomers`

**Spec:** `docs/superpowers/specs/2026-03-25-subscription-inheritance-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/models/Subscription.ts` | Modify | Add `SUBSCRIPTION_TYPE` enum + `subscription_type` field on `Subscription` |
| `src/types/dto/Subscription.ts` | Modify | Add `SubscriptionInheritanceConfig`, `ExecuteSubscriptionInheritanceRequest`; update `CreateSubscriptionRequest`; add `subscription_types` to `ListSubscriptionsPayload` + `SubscriptionFilter` |
| `src/types/dto/index.ts` | Modify | Re-export new types from the barrel |
| `src/api/SubscriptionApi.ts` | Modify | Add `executeInheritance` method |
| `src/pages/customer/customers/CreateCustomerSubscriptionPage.tsx` | Modify | Add `inheritedCustomers: Customer[]` to `SubscriptionFormState`; update payload builder |
| `src/components/molecules/AddInheritedCustomersDialog/AddInheritedCustomersDialog.tsx` | **Create** | Reusable multi-select async customer search dialog |
| `src/components/molecules/InheritedCustomersTable/InheritedCustomersTable.tsx` | **Create** | Table of inherited subscriptions for a parent subscription |
| `src/components/molecules/index.ts` | Modify | Export both new components |
| `src/components/organisms/Subscription/SubscriptionForm.tsx` | Modify | Add "Inherited Customers" section (create mode only) |
| `src/pages/customer/customers/CustomerSubscriptionEditPage.tsx` | Modify | Add `InheritedCustomersTable` + `AddInheritedCustomersDialog` for parent subscriptions |
| `src/components/organisms/Subscription/SubscriptionActionButton.tsx` | Modify | Cancel guard for `SUBSCRIPTION_TYPE.INHERITED` |
| `src/components/molecules/SubscriptionTable/SubscriptionTable.tsx` | Modify | Cancel guard for `SUBSCRIPTION_TYPE.INHERITED` |
| `src/pages/customer/subscriptions/Subscriptions.tsx` | Modify | Cancel guard for `SUBSCRIPTION_TYPE.INHERITED` |

---

## Task 1: SUBSCRIPTION_TYPE enum + Subscription model

**Files:**
- Modify: `src/models/Subscription.ts`

- [ ] **Step 1: Add the enum and field**

Open `src/models/Subscription.ts`. Add the enum near the top (after existing enums):

```ts
export enum SUBSCRIPTION_TYPE {
  STANDALONE = 'standalone',
  PARENT = 'parent',
  INHERITED = 'inherited',
}
```

Then add to the `Subscription` interface:
```ts
readonly subscription_type?: SUBSCRIPTION_TYPE;
```

`SubscriptionResponse extends Subscription` — do **NOT** add the field there again.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors (compare count to pre-feature baseline).

- [ ] **Step 3: Commit**

```bash
git add src/models/Subscription.ts
git commit -m "feat(subscription): add SUBSCRIPTION_TYPE enum and subscription_type field"
```

---

## Task 2: DTO updates

**Files:**
- Modify: `src/types/dto/Subscription.ts`
- Modify: `src/types/dto/index.ts`

- [ ] **Step 1: Add `SubscriptionInheritanceConfig` and `ExecuteSubscriptionInheritanceRequest`**

Find the `// ENHANCED SUBSCRIPTION REQUEST/RESPONSE TYPES` section (~line 231). Add **before** `CreateSubscriptionRequest`:

```ts
export interface SubscriptionInheritanceConfig {
  /** Internal customer IDs to create inherited child subscriptions for */
  customer_ids_to_inherit_subscription?: string[];
  /**
   * Parent subscription ID — intentionally NOT set by the frontend;
   * the backend sets this internally when creating inherited children.
   */
  parent_subscription_id?: string;
  /**
   * Internal customer ID to use for invoicing.
   * External ID variant intentionally omitted — frontend always has internal IDs.
   */
  invoicing_customer_id?: string;
}

export interface ExecuteSubscriptionInheritanceRequest {
  customer_ids_to_inherit_subscription?: string[];
}
```

- [ ] **Step 2: Update `CreateSubscriptionRequest` — remove 3 flat fields, add `inheritance`**

Inside `CreateSubscriptionRequest`, **delete** these three fields:
- `invoicing_customer_id?: string;` (~line 246)
- `invoicing_customer_external_id?: string;` (~line 252)
- `parent_subscription_id?: string | null;` (~line 326)

**Add** the following field (near the top of the interface, after `invoice_billing`):
```ts
/**
 * Inheritance configuration. Omit entirely when creating a standalone subscription.
 * If customer_ids_to_inherit_subscription is non-empty, the subscription becomes type=parent.
 */
inheritance?: SubscriptionInheritanceConfig;
```

- [ ] **Step 3: Add `subscription_types` to `ListSubscriptionsPayload`**

In `ListSubscriptionsPayload` (~line 38), add after `invoicing_customer_ids`:
```ts
/** Filter by subscription types (standalone, parent, inherited) */
subscription_types?: SUBSCRIPTION_TYPE[];
```

Add `SUBSCRIPTION_TYPE` to the imports at the top of the file:
```ts
import { SUBSCRIPTION_TYPE } from '@/models/Subscription';
```

- [ ] **Step 4: Add `subscription_types` to `SubscriptionFilter`**

Find `SubscriptionFilter` (~line 627). Add the same field:
```ts
subscription_types?: SUBSCRIPTION_TYPE[];
```

- [ ] **Step 5: Update the barrel export `src/types/dto/index.ts`**

Open `src/types/dto/index.ts`. Find the block that exports from `./Subscription` (selective named exports). Add to that block:
```ts
export type { SubscriptionInheritanceConfig, ExecuteSubscriptionInheritanceRequest } from './Subscription';
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: intentional type errors now appear in `CreateCustomerSubscriptionPage.tsx` where `invoicing_customer_id` was previously a flat field on the request. These will be fixed in Task 4.

- [ ] **Step 7: Commit**

```bash
git add src/types/dto/Subscription.ts src/types/dto/index.ts
git commit -m "feat(subscription): add inheritance DTOs and update CreateSubscriptionRequest"
```

---

## Task 3: API client — `executeInheritance`

**Files:**
- Modify: `src/api/SubscriptionApi.ts`

- [ ] **Step 1: Add import**

At the top of `src/api/SubscriptionApi.ts`, add to the import from `@/types/dto/Subscription`:
```ts
ExecuteSubscriptionInheritanceRequest,
```

- [ ] **Step 2: Add the method**

Inside the `SubscriptionApi` class, add a new section after the existing `executeSubscriptionChange` method:

```ts
// =============================================================================
// INHERITANCE METHODS
// =============================================================================

/**
 * Add child customers to an existing parent subscription
 * POST /subscriptions/:id/inheritance/execute
 */
public static async executeInheritance(
  id: string,
  payload: ExecuteSubscriptionInheritanceRequest,
): Promise<SubscriptionResponse> {
  return await AxiosClient.post<SubscriptionResponse>(
    `${this.baseUrl}/${id}/inheritance/execute`,
    payload,
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles cleanly for this file**

```bash
npx tsc --noEmit 2>&1 | grep "SubscriptionApi" | head -10
```

Expected: no errors in `SubscriptionApi.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/api/SubscriptionApi.ts
git commit -m "feat(subscription): add executeInheritance API method"
```

---

## Task 4: SubscriptionFormState + payload builder

**Files:**
- Modify: `src/pages/customer/customers/CreateCustomerSubscriptionPage.tsx`

- [ ] **Step 1: Add `inheritedCustomers` to `SubscriptionFormState`**

Find the `SubscriptionFormState` type definition (~line 63). Add the new field:
```ts
/** Full Customer objects selected to inherit this subscription (create flow only) */
inheritedCustomers: Customer[];
```

`Customer` is already imported from `@/models` (used by `invoicingCustomer`).

- [ ] **Step 2: Add `inheritedCustomers: []` to the default state**

Find the `useState<SubscriptionFormState>` initializer and add:
```ts
inheritedCustomers: [],
```

- [ ] **Step 3: Fix the payload builder — replace flat fields with nested `inheritance`**

First, grep to confirm all three removed DTO fields' usages in this file:
```bash
grep -n "invoicing_customer_id\|invoicing_customer_external_id\|parent_subscription_id" src/pages/customer/customers/CreateCustomerSubscriptionPage.tsx
```

In `handleSubscriptionSubmit` (~line 596), find and **remove**:
```ts
invoicing_customer_id: sanitized.invoicingCustomerId || undefined,
```

If the grep above also finds `invoicing_customer_external_id` or `parent_subscription_id` used in the payload object, remove those too.

Then add the `inheritance` field to the payload object (place it after `customer_id`):

```ts
// Build inheritance config — only include if there's something to put in it
...((() => {
  const hasInheritedCustomers = subscriptionState.inheritedCustomers.length > 0;
  const hasInvoicingOverride = !!sanitized.invoicingCustomerId;
  if (!hasInheritedCustomers && !hasInvoicingOverride) return {};
  const inheritanceConfig: SubscriptionInheritanceConfig = {
    ...(hasInheritedCustomers && {
      customer_ids_to_inherit_subscription: subscriptionState.inheritedCustomers.map((c) => c.id),
    }),
    ...(hasInvoicingOverride && { invoicing_customer_id: sanitized.invoicingCustomerId }),
  };
  return { inheritance: inheritanceConfig };
})()),
```

Add the import for `SubscriptionInheritanceConfig` at the top:
```ts
import { ..., SubscriptionInheritanceConfig } from '@/types/dto/Subscription';
```

- [ ] **Step 4: Verify TypeScript compiles with no errors in this file**

```bash
npx tsc --noEmit 2>&1 | grep "CreateCustomerSubscriptionPage" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/customer/customers/CreateCustomerSubscriptionPage.tsx
git commit -m "feat(subscription): add inheritedCustomers to form state and update payload builder"
```

---

## Task 5: `AddInheritedCustomersDialog` component

**Files:**
- Create: `src/components/molecules/AddInheritedCustomersDialog/AddInheritedCustomersDialog.tsx`

> **Modal pattern note:** The `Modal` atom (`src/components/atoms/Modal/Modal.tsx`) accepts only `isOpen`, `onOpenChange`, `children`, `className`, and `showOverlay`. There is no `title` or `footer` prop — these must be rendered inside `children`. Follow the same pattern used in `SubscriptionActionButton.tsx` (~line 291–300).

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p src/components/molecules/AddInheritedCustomersDialog
```

Create `src/components/molecules/AddInheritedCustomersDialog/AddInheritedCustomersDialog.tsx`:

```tsx
import { useState, useCallback, useRef } from 'react';
import { Customer } from '@/models';
import { Modal, Button, FormHeader } from '@/components/atoms';
import CustomerApi from '@/api/CustomerApi';
import { X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddInheritedCustomersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (customers: Customer[]) => void;
  /** Customer IDs already added — excluded from search results */
  excludeIds?: string[];
  /** Shows loading spinner on confirm button while API call is in-flight */
  isLoading?: boolean;
}

const AddInheritedCustomersDialog: React.FC<AddInheritedCustomersDialogProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  excludeIds = [],
  isLoading = false,
}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!value.trim()) {
        setSearchResults([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const response = await CustomerApi.searchCustomers(value.trim(), 20);
          const filtered = (response.items ?? []).filter(
            (c) =>
              !excludeIds.includes(c.id) &&
              !selectedCustomers.some((s) => s.id === c.id),
          );
          setSearchResults(filtered);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [excludeIds, selectedCustomers],
  );

  const handleSelect = useCallback((customer: Customer) => {
    setSelectedCustomers((prev) =>
      prev.some((c) => c.id === customer.id) ? prev : [...prev, customer],
    );
    setQuery('');
    setSearchResults([]);
  }, []);

  const handleRemove = useCallback((customerId: string) => {
    setSelectedCustomers((prev) => prev.filter((c) => c.id !== customerId));
  }, []);

  const handleClose = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    setSelectedCustomers([]);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleConfirm = useCallback(() => {
    if (selectedCustomers.length === 0 || isLoading) return;
    onConfirm(selectedCustomers);
  }, [selectedCustomers, isLoading, onConfirm]);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) handleClose(); }}
      className='card bg-white w-[560px] max-w-[90vw]'
    >
      <div className='space-y-4'>
        <FormHeader title='Add Customers to Inherit Subscription' variant='sub-header' />

        {/* Search input */}
        <div className='space-y-2'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
            <input
              className='w-full pl-9 pr-3 py-2 border border-gray-300 rounded-[6px] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
              placeholder='Search by name, email, or ID...'
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
            />
          </div>

          {/* Search results dropdown */}
          {(searchResults.length > 0 || (isSearching && query)) && (
            <div className='border border-gray-200 rounded-[6px] bg-white shadow-sm max-h-48 overflow-y-auto'>
              {isSearching && (
                <div className='px-3 py-2 text-sm text-gray-400'>Searching...</div>
              )}
              {!isSearching &&
                searchResults.map((customer) => (
                  <button
                    key={customer.id}
                    type='button'
                    className='w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors'
                    onClick={() => handleSelect(customer)}
                  >
                    <p className='text-sm font-medium text-gray-900'>{customer.name}</p>
                    <p className='text-xs text-gray-500'>{customer.external_id}</p>
                  </button>
                ))}
              {!isSearching && searchResults.length === 0 && query && (
                <div className='px-3 py-2 text-sm text-gray-400'>No customers found</div>
              )}
            </div>
          )}
        </div>

        {/* Selected customers chips */}
        {selectedCustomers.length > 0 && (
          <div className='space-y-2'>
            <p className='text-sm font-medium text-gray-700'>Selected customers</p>
            <div className='flex flex-wrap gap-2'>
              {selectedCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm',
                    'bg-gray-100 text-gray-800 border border-gray-200',
                  )}
                >
                  <span>{customer.name || customer.external_id}</span>
                  <button
                    type='button'
                    onClick={() => handleRemove(customer.id)}
                    className='text-gray-400 hover:text-gray-600 transition-colors'
                    aria-label={`Remove ${customer.name}`}
                  >
                    <X className='h-3.5 w-3.5' />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className='flex justify-end gap-2 pt-2'>
          <Button variant='outline' onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedCustomers.length === 0 || isLoading}
            loading={isLoading}
          >
            {selectedCustomers.length > 0 ? `Add (${selectedCustomers.length})` : 'Add'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddInheritedCustomersDialog;
```

- [ ] **Step 2: Check if `Button` has a `loading` prop**

```bash
grep -n "loading\|isPending\|isLoading" src/components/atoms/Button/Button.tsx | head -10
```

If `loading` is not a valid prop, replace with a conditional spinner or just use `disabled` only.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "AddInheritedCustomersDialog" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/molecules/AddInheritedCustomersDialog/
git commit -m "feat(subscription): add AddInheritedCustomersDialog reusable component"
```

---

## Task 6: `InheritedCustomersTable` component

**Files:**
- Create: `src/components/molecules/InheritedCustomersTable/InheritedCustomersTable.tsx`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p src/components/molecules/InheritedCustomersTable
```

Create `src/components/molecules/InheritedCustomersTable/InheritedCustomersTable.tsx`:

```tsx
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { AddButton, FormHeader } from '@/components/atoms';
import FlexpriceTable, { ColumnData } from '@/components/molecules/Table';
import SubscriptionApi from '@/api/SubscriptionApi';
import { SUBSCRIPTION_TYPE, SUBSCRIPTION_STATUS } from '@/models/Subscription';
import { SubscriptionResponse } from '@/types/dto/Subscription';
import { RouteNames } from '@/core/routes/Routes';
import { format } from 'date-fns';

interface InheritedCustomersTableProps {
  parentSubscriptionId: string;
  onAddCustomers: () => void;
  /** Called after fetch with customer IDs of all loaded inherited subscriptions */
  onCustomerIdsLoaded?: (ids: string[]) => void;
}

const InheritedCustomersTable: React.FC<InheritedCustomersTableProps> = ({
  parentSubscriptionId,
  onAddCustomers,
  onCustomerIdsLoaded,
}) => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    // IMPORTANT: this query key must match refetchQueries(['inheritedSubscriptions', ...])
    // in CustomerSubscriptionEditPage's executeInheritance onSuccess handler
    queryKey: ['inheritedSubscriptions', parentSubscriptionId],
    queryFn: () =>
      SubscriptionApi.searchSubscriptions({
        parent_subscription_ids: [parentSubscriptionId],
        subscription_types: [SUBSCRIPTION_TYPE.INHERITED],
        subscription_status: [SUBSCRIPTION_STATUS.ACTIVE],
      }),
    enabled: !!parentSubscriptionId,
  });

  // Lift loaded customer IDs to parent so it can pass them as excludeIds to the dialog
  useEffect(() => {
    if (data?.items && onCustomerIdsLoaded) {
      const ids = data.items
        .map((sub) => sub.customer_id)
        .filter((id): id is string => !!id);
      onCustomerIdsLoaded(ids);
    }
  }, [data, onCustomerIdsLoaded]);

  const columns: ColumnData<SubscriptionResponse>[] = [
    {
      title: 'Customer',
      render: (row) => (
        <div>
          <button
            type='button'
            className='text-sm font-medium text-primary hover:underline text-left'
            onClick={(e) => {
              e.stopPropagation();
              navigate(`${RouteNames.customers}/${row.customer_id}`);
            }}
          >
            {row.customer?.name || row.customer_id}
          </button>
          {row.customer?.external_id && (
            <p className='text-xs text-gray-500'>{row.customer.external_id}</p>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      render: (row) => (
        <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize'>
          {row.subscription_status}
        </span>
      ),
    },
    {
      title: 'Start Date',
      render: (row) => (
        <span className='text-sm text-gray-700'>
          {row.start_date ? format(new Date(row.start_date), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      title: 'Plan',
      render: (row) => (
        <button
          type='button'
          className='text-sm font-medium text-primary hover:underline text-left'
          onClick={(e) => {
            e.stopPropagation();
            navigate(`${RouteNames.customers}/${row.customer_id}/subscription/${row.id}`);
          }}
        >
          {row.plan?.name || row.plan_id}
        </button>
      ),
    },
  ];

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <FormHeader title='Inherited Customers' variant='sub-header' />
        <AddButton onClick={onAddCustomers} label='Add Customers' />
      </div>
      <FlexpriceTable
        columns={columns}
        data={data?.items ?? []}
        showEmptyRow
      />
      {isLoading && (
        <p className='text-sm text-gray-400 text-center py-4'>Loading...</p>
      )}
      {!isLoading && (data?.items ?? []).length === 0 && (
        <p className='text-sm text-gray-400 text-center py-4'>No inherited customers yet</p>
      )}
    </div>
  );
};

export default InheritedCustomersTable;
```

- [ ] **Step 2: Verify the `FlexpriceTable` import path**

```bash
ls src/components/molecules/Table/
```

If `index.ts` exists, `@/components/molecules/Table` resolves. If not, adjust to `@/components/molecules/Table/Table`.

- [ ] **Step 3: Verify `ColumnData` with `render` is the correct variant**

```bash
grep -n "render\|RenderColumn\|FieldNameColumn\|ColumnData" src/components/molecules/Table/Table.tsx | head -20
```

Ensure the `render` property is valid on `ColumnData<T>`. If the interface uses a different discriminant, adjust.

- [ ] **Step 4: Check `RouteNames.customers` path format**

```bash
grep -n "customers\|subscription" src/core/routes/Routes.tsx | head -20
```

Ensure the navigation paths `${RouteNames.customers}/${id}` and `${RouteNames.customers}/${customerId}/subscription/${subId}` match existing route patterns.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "InheritedCustomersTable" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/molecules/InheritedCustomersTable/
git commit -m "feat(subscription): add InheritedCustomersTable component"
```

---

## Task 7: Export new components from molecules barrel

**Files:**
- Modify: `src/components/molecules/index.ts`

- [ ] **Step 1: Add exports**

Open `src/components/molecules/index.ts` and add in the Subscription Management section:

```ts
export { default as AddInheritedCustomersDialog } from './AddInheritedCustomersDialog/AddInheritedCustomersDialog';
export { default as InheritedCustomersTable } from './InheritedCustomersTable/InheritedCustomersTable';
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "molecules/index" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/molecules/index.ts
git commit -m "feat(subscription): export AddInheritedCustomersDialog and InheritedCustomersTable"
```

---

## Task 8: SubscriptionForm — Inheritance section

**Files:**
- Modify: `src/components/organisms/Subscription/SubscriptionForm.tsx`

- [ ] **Step 1: Add imports**

At the top of `SubscriptionForm.tsx`, add to imports:
```ts
import { AddInheritedCustomersDialog } from '@/components/molecules';
import { Customer } from '@/models';
```

Add `X` and `AddButton` if not already imported:
```ts
// lucide-react — add X if not present
import { X } from 'lucide-react';
// atoms — add AddButton if not present
import { AddButton } from '@/components/atoms';
```

- [ ] **Step 2: Add dialog open state**

Inside the `SubscriptionForm` component body, add:
```ts
const [isAddInheritanceDialogOpen, setIsAddInheritanceDialogOpen] = useState(false);
```

- [ ] **Step 3: Add the Inheritance section to the JSX**

Find the `{/* Advanced Configuration */}` block (~line 831). Insert the Inheritance section **immediately before** it:

```tsx
{/* Inherited Customers Section — create mode only */}
{state.selectedPlan && !isLoadingPlanDetails && !isDisabled && (
  <div className='space-y-4 mt-4 pt-3 border-t border-gray-200'>
    <div className='flex items-center justify-between'>
      <FormHeader className='mb-0' title='Inherited Customers' variant='sub-header' />
      <AddButton
        onClick={() => setIsAddInheritanceDialogOpen(true)}
        label='Add Customers'
      />
    </div>

    {state.inheritedCustomers.length > 0 && (
      <div className='rounded-[6px] border border-gray-300 overflow-hidden'>
        <table className='w-full text-sm'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='text-left px-4 py-2 font-medium text-gray-600'>Customer</th>
              <th className='text-left px-4 py-2 font-medium text-gray-600'>External ID</th>
              <th className='w-10' />
            </tr>
          </thead>
          <tbody>
            {state.inheritedCustomers.map((customer) => (
              <tr key={customer.id} className='border-t border-gray-200'>
                <td className='px-4 py-2 text-gray-900'>{customer.name}</td>
                <td className='px-4 py-2 text-gray-500'>{customer.external_id}</td>
                <td className='px-4 py-2'>
                  <button
                    type='button'
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        inheritedCustomers: prev.inheritedCustomers.filter(
                          (c) => c.id !== customer.id,
                        ),
                      }))
                    }
                    className='text-gray-400 hover:text-red-500 transition-colors'
                    aria-label={`Remove ${customer.name}`}
                  >
                    <X className='h-4 w-4' />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    <AddInheritedCustomersDialog
      isOpen={isAddInheritanceDialogOpen}
      onOpenChange={setIsAddInheritanceDialogOpen}
      excludeIds={state.inheritedCustomers.map((c) => c.id)}
      onConfirm={(customers) => {
        setState((prev) => {
          const existingIds = new Set(prev.inheritedCustomers.map((c) => c.id));
          const newCustomers = customers.filter((c) => !existingIds.has(c.id));
          return {
            ...prev,
            inheritedCustomers: [...prev.inheritedCustomers, ...newCustomers],
          };
        });
        setIsAddInheritanceDialogOpen(false);
      }}
    />
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "SubscriptionForm" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/organisms/Subscription/SubscriptionForm.tsx
git commit -m "feat(subscription): add inherited customers section to SubscriptionForm"
```

---

## Task 9: CustomerSubscriptionEditPage — parent subscription panel

**Files:**
- Modify: `src/pages/customer/customers/CustomerSubscriptionEditPage.tsx`

- [ ] **Step 1: Add imports and state**

Add to imports at the top:
```ts
import { InheritedCustomersTable, AddInheritedCustomersDialog } from '@/components/molecules';
import { SUBSCRIPTION_TYPE } from '@/models/Subscription';
import { ExecuteSubscriptionInheritanceRequest } from '@/types/dto/Subscription';
import { Customer } from '@/models';
```

Add state inside the component:
```ts
const [isAddCustomersDialogOpen, setIsAddCustomersDialogOpen] = useState(false);
const [inheritedCustomerIds, setInheritedCustomerIds] = useState<string[]>([]);
```

- [ ] **Step 2: Add `executeInheritance` mutation**

Add after the existing `deleteCreditGrant` mutation:
```ts
const { mutate: executeInheritance, isPending: isExecutingInheritance } = useMutation({
  mutationFn: (payload: ExecuteSubscriptionInheritanceRequest) =>
    SubscriptionApi.executeInheritance(subscriptionId!, payload),
  onSuccess: () => {
    toast.success('Customers added successfully');
    refetchQueries(['inheritedSubscriptions', subscriptionId!]);
    setIsAddCustomersDialogOpen(false);
  },
  onError: (error: { error?: { message?: string } }) => {
    toast.error(error?.error?.message || 'Failed to add customers');
  },
});
```

- [ ] **Step 3: Add `handleAddInheritedCustomers` callback**

```ts
const handleAddInheritedCustomers = useCallback(
  (customers: Customer[]) => {
    executeInheritance({
      customer_ids_to_inherit_subscription: customers.map((c) => c.id),
    });
  },
  [executeInheritance],
);
```

- [ ] **Step 4: Insert panel in JSX**

Find `{subscriptionId && <SubscriptionEntitlementsSection subscriptionId={subscriptionId} />}` (~line 312).

The current render order is:
1. `SubscriptionEditDetailsHeader`
2. `SubscriptionEditChargesSection`
3. `SubscriptionEditCreditGrantsSection`
4. ← **Insert here**
5. `SubscriptionEntitlementsSection`
6. `SubscriptionAddonsSection`

Insert **before** `SubscriptionEntitlementsSection`:

```tsx
{/* Inherited customers panel — only shown for parent subscriptions */}
{subscriptionDetails.subscription_type === SUBSCRIPTION_TYPE.PARENT && subscriptionId && (
  <>
    <InheritedCustomersTable
      parentSubscriptionId={subscriptionId}
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

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "CustomerSubscriptionEditPage" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/customer/customers/CustomerSubscriptionEditPage.tsx
git commit -m "feat(subscription): add inherited customers panel to CustomerSubscriptionEditPage"
```

---

## Task 10: Cancel guards

**Files:**
- Modify: `src/components/organisms/Subscription/SubscriptionActionButton.tsx`
- Modify: `src/components/molecules/SubscriptionTable/SubscriptionTable.tsx`
- Modify: `src/pages/customer/subscriptions/Subscriptions.tsx`

### 10a. `SubscriptionActionButton.tsx`

> **Note:** This component uses `menuOptions: DropdownMenuOption[]`. `DropdownMenuOption` supports `disabled?: boolean` but has **no `tooltip` prop** — the disabled state is indicated visually via `opacity-50`. No tooltip will appear.

- [ ] **Step 1: Add import**

```ts
import { SUBSCRIPTION_TYPE } from '@/models/Subscription';
```

- [ ] **Step 2: Add `isInherited` constant**

After the existing `isCancelled` constant (~line 148):
```ts
const isInherited = subscription.subscription_type === SUBSCRIPTION_TYPE.INHERITED;
```

- [ ] **Step 3: Update the Cancel Subscription menu option**

Find the `menuOptions` array (~line 151). Locate the Cancel Subscription entry (~line 194):
```ts
{
  label: 'Cancel Subscription',
  onSelect: () => setState((prev) => ({ ...prev, isCancelModalOpen: true })),
  disabled: isCancelled,
}
```

Update `disabled` to also cover inherited subscriptions:
```ts
{
  label: 'Cancel Subscription',
  onSelect: () => setState((prev) => ({ ...prev, isCancelModalOpen: true })),
  disabled: isCancelled || isInherited,
}
```

### 10b. `SubscriptionTable.tsx`

- [ ] **Step 4: Add import**

```ts
import { SUBSCRIPTION_TYPE } from '@/models/Subscription';
```

- [ ] **Step 5: Update `customActions` cancel `enabled`**

Find the `customActions` array (~line 80):
```ts
enabled: row.subscription_status !== SUBSCRIPTION_STATUS.CANCELLED,
```

Update to:
```ts
enabled:
  row.subscription_status !== SUBSCRIPTION_STATUS.CANCELLED &&
  row.subscription_type !== SUBSCRIPTION_TYPE.INHERITED,
```

### 10c. `Subscriptions.tsx`

- [ ] **Step 6: Add import**

```ts
import { SUBSCRIPTION_TYPE } from '@/models/Subscription';
```

- [ ] **Step 7: Update `customActions` cancel `enabled`**

Find the equivalent `customActions` block (~line 192):
```ts
enabled: row.subscription_status !== SUBSCRIPTION_STATUS.CANCELLED,
```

Update to:
```ts
enabled:
  row.subscription_status !== SUBSCRIPTION_STATUS.CANCELLED &&
  row.subscription_type !== SUBSCRIPTION_TYPE.INHERITED,
```

- [ ] **Step 8: Verify all three files compile**

```bash
npx tsc --noEmit 2>&1 | grep -E "SubscriptionActionButton|SubscriptionTable\.tsx|Subscriptions\.tsx" | head -15
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/organisms/Subscription/SubscriptionActionButton.tsx \
        src/components/molecules/SubscriptionTable/SubscriptionTable.tsx \
        src/pages/customer/subscriptions/Subscriptions.tsx
git commit -m "feat(subscription): disable cancel action for inherited subscriptions"
```

---

## Task 11: Full build verification

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors introduced by this feature.

- [ ] **Step 2: Run Vitest**

```bash
npx vitest run 2>&1 | tail -20
```

Expected: all tests pass (or same failures as before this feature).

- [ ] **Step 3: Run linter on changed files**

```bash
npx eslint \
  src/models/Subscription.ts \
  src/types/dto/Subscription.ts \
  src/types/dto/index.ts \
  src/api/SubscriptionApi.ts \
  src/components/molecules/AddInheritedCustomersDialog/ \
  src/components/molecules/InheritedCustomersTable/ \
  src/components/organisms/Subscription/SubscriptionForm.tsx \
  src/pages/customer/customers/CreateCustomerSubscriptionPage.tsx \
  src/pages/customer/customers/CustomerSubscriptionEditPage.tsx \
  --max-warnings 0 2>&1 | tail -20
```

Fix any lint errors before proceeding.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(subscription): subscription inheritance feature complete

- Add SUBSCRIPTION_TYPE enum (standalone/parent/inherited)
- Update CreateSubscriptionRequest to use nested inheritance config
- Add executeInheritance API method (POST /subscriptions/:id/inheritance/execute)
- Add AddInheritedCustomersDialog reusable multi-select dialog
- Add InheritedCustomersTable with onCustomerIdsLoaded callback
- Add inheritance section to SubscriptionForm (create mode only)
- Add inherited customers panel to CustomerSubscriptionEditPage
- Disable cancel for inherited subscriptions in all 3 locations

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Manual Testing Checklist

After implementation, verify manually in the running app:

**Create flow:**
- [ ] Navigate to Create Subscription — "Inherited Customers" section appears after plan selection
- [ ] "Inherited Customers" section is **not** visible on the Edit page (isDisabled=true)
- [ ] Click "Add Customers" — dialog opens
- [ ] Search for a customer — results appear after typing (debounced 300ms)
- [ ] Select multiple customers — chips appear below search
- [ ] Remove a chip — customer is deselected
- [ ] Confirm — customers appear in the table; dialog closes
- [ ] Submit subscription — network payload includes `inheritance.customer_ids_to_inherit_subscription`
- [ ] If invoicing customer also set — payload includes `inheritance.invoicing_customer_id`

**Edit flow (parent subscription):**
- [ ] Navigate to Edit page of a parent subscription — "Inherited Customers" table appears between credit grants and entitlements
- [ ] Table shows active inherited subscriptions (customer name links to customer, plan links to subscription)
- [ ] Click "Add Customers" — dialog opens with already-inherited customers excluded from search
- [ ] Add new customers — table refreshes after API call; dialog closes
- [ ] API error — dialog stays open, toast error shown

**Cancel guard:**
- [ ] Inherited subscription in `SubscriptionTable` — Cancel action has `enabled: false` (greyed out)
- [ ] Inherited subscription in Subscriptions list page — same
- [ ] Inherited subscription in `SubscriptionActionButton` — Cancel Subscription option is disabled (`opacity-50`)
- [ ] Parent or standalone subscription — Cancel works as before
