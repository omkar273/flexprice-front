# Kubb v3 Code Generation Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Kubb v3 to generate TypeScript types, axios client functions, and TanStack Query hooks from `openapi/spec.json` into `src/generated/`.

**Architecture:** A dedicated axios instance (`kubbAxios`) is created in `src/api/base.ts` and wired with auth interceptors in `src/api/interceptors.ts`. It deliberately does NOT strip `response.data` — unlike the existing `axiosClient` in `src/core/axios/config.ts` — because Kubb-generated clients extract `.data` from `ResponseConfig` themselves. The custom client in `src/api/kubbClient.ts` is the entry point that Kubb-generated files import at `importPath: '../../api/kubbClient'`.

**Tech Stack:** Kubb v3 (`@kubb/core`, `@kubb/cli`, `@kubb/plugin-oas`, `@kubb/plugin-ts`, `@kubb/plugin-client`, `@kubb/plugin-react-query`), axios, `@tanstack/react-query` (already installed).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `package.json` | Add 6 devDeps + `generate` script |
| Modify | `tsconfig.node.json` | Include `kubb.config.ts` for type-checking |
| Create | `openapi/spec.json` | Placeholder OpenAPI v3 spec (replace with real spec later) |
| Create | `kubb.config.ts` | Kubb configuration — three-plugin pipeline |
| Create | `src/api/base.ts` | `createHttpClient()` — bare axios instance, no response unwrapping |
| Create | `src/api/interceptors.ts` | Auth request interceptor + 401 response handler |
| Create | `src/api/kubbClient.ts` | Custom Kubb client — wires base + interceptors, exported as `client` |
| Generated | `src/generated/types/` | TypeScript interfaces from spec schemas |
| Generated | `src/generated/clients/` | Axios function per operation |
| Generated | `src/generated/hooks/` | TanStack Query hook per operation |

---

## Task 1: Install Kubb devDependencies and add generate script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install all 6 Kubb packages as devDependencies**

```bash
npm install -D @kubb/core @kubb/cli @kubb/plugin-oas @kubb/plugin-ts @kubb/plugin-client @kubb/plugin-react-query
```

Expected: all 6 packages appear in `devDependencies` in `package.json`. No peer dependency errors.

- [ ] **Step 2: Add the generate script**

In `package.json`, inside the `"scripts"` block, add:

```json
"generate": "kubb generate"
```

- [ ] **Step 3: Verify the Kubb CLI is available**

```bash
npx kubb --version
```

Expected: prints a version number like `3.x.x`. If not found, re-run Step 1.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install kubb v3 devdependencies and add generate script"
```

---

## Task 2: Update tsconfig.node.json

**Files:**
- Modify: `tsconfig.node.json`

`kubb.config.ts` lives at the root alongside `vite.config.ts`. Adding it here lets TypeScript and the IDE type-check it. Kubb uses its own bundler to execute the config at codegen time — this is purely for IDE support.

- [ ] **Step 1: Add kubb.config.ts to the include array**

In `tsconfig.node.json`, change:

```json
"include": ["vite.config.ts"]
```

to:

```json
"include": ["vite.config.ts", "kubb.config.ts"]
```

- [ ] **Step 2: Commit**

```bash
git add tsconfig.node.json
git commit -m "chore: include kubb.config.ts in tsconfig.node for type-checking"
```

---

## Task 3: Create src/api/base.ts

**Files:**
- Create: `src/api/base.ts`

This creates a bare axios instance with the same `baseURL` and `timeout` as the existing `axiosClient` in `src/core/axios/config.ts`, but with **no response interceptor**. The existing `axiosClient` has a response interceptor that returns `response.data` directly — the kubb instance must not do this, because Kubb-generated clients call `.data` on the `ResponseConfig` themselves.

- [ ] **Step 1: Create src/api/base.ts**

```ts
import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { config } from '@/config/config'

export function createHttpClient(): AxiosInstance {
	return axios.create({
		baseURL: config.api.baseUrl,
		timeout: 600000,
		headers: {
			'Content-Type': 'application/json',
		},
	})
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/base.ts
git commit -m "feat(kubb): add createHttpClient factory for kubb axios instance"
```

---

## Task 4: Create src/api/interceptors.ts

**Files:**
- Create: `src/api/interceptors.ts`

Duplicates the auth/env-ID logic from `src/core/axios/config.ts` with two intentional differences:

1. **Response interceptor returns the full `AxiosResponse`** — not `response.data`. Kubb clients extract `.data` themselves.
2. **No customer-portal `X-Session-Token` mode** — Kubb-generated clients are not used in the customer portal flow (which uses a different session mechanism).
3. **No `getApiErrorMessage` normalization** — raw `AxiosError` surfaces to TanStack Query's `error` state.

- [ ] **Step 1: Create src/api/interceptors.ts**

```ts
import type { AxiosInstance } from 'axios'
import AuthService from '@/core/auth/AuthService'
import EnvironmentApi from '@/api/EnvironmentApi'

export function attachAuthInterceptor(instance: AxiosInstance): void {
	instance.interceptors.request.use(
		async (reqConfig) => {
			const token = await AuthService.getAcessToken()
			const activeEnvId = EnvironmentApi.getActiveEnvironmentId()
			if (activeEnvId) {
				reqConfig.headers['X-Environment-ID'] = activeEnvId
			}
			if (token) {
				reqConfig.headers.Authorization = `Bearer ${token}`
			}
			return reqConfig
		},
		(error) => Promise.reject(error),
	)
}

export function attachUnauthorizedHandler(instance: AxiosInstance): void {
	instance.interceptors.response.use(
		(response) => response,
		async (error) => {
			if (error.response?.status === 401) {
				await AuthService.logout()
			}
			return Promise.reject(error)
		},
	)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/interceptors.ts
git commit -m "feat(kubb): add auth interceptors for kubb axios instance"
```

---

## Task 5: Create src/api/kubbClient.ts

**Files:**
- Create: `src/api/kubbClient.ts`

This is the file Kubb-generated client files will import. It must:
- Export `client` as a named export (how generated files import it)
- Export `default` as a fallback
- Match the type signatures from `@kubb/plugin-client/clients/axios` exactly

One improvement over the spec sketch: the `contentType` field from `RequestConfig` is forwarded to the headers, enabling Kubb-generated multipart/form-data requests to work correctly.

- [ ] **Step 1: Create src/api/kubbClient.ts**

```ts
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

import { createHttpClient } from './base'
import { attachAuthInterceptor, attachUnauthorizedHandler } from './interceptors'

// Types must match @kubb/plugin-client/clients/axios exactly so that
// generated client files and generated hook files are structurally compatible.
type HeaderValue = string | number | boolean | null | undefined | object
type HeadersInit = Array<[string, HeaderValue]> | Record<string, HeaderValue>

export type RequestConfig<TData = unknown> = {
	baseURL?: string
	url?: string
	method?: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE' | 'OPTIONS' | 'HEAD'
	params?: unknown
	data?: TData | FormData
	responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream'
	signal?: AbortSignal
	validateStatus?: (status: number) => boolean
	headers?: HeadersInit
	paramsSerializer?: AxiosRequestConfig['paramsSerializer']
	contentType?: string
}

export type ResponseConfig<TData = unknown> = {
	data: TData
	status: number
	statusText: string
	headers: AxiosResponse['headers']
}

export type ResponseErrorConfig<TError = unknown> = AxiosError<TError>

export type Client = <TResponseData, _TError = unknown, TRequestData = unknown>(
	config: RequestConfig<TRequestData>,
	request?: unknown,
) => Promise<ResponseConfig<TResponseData>>

export const kubbAxios = createHttpClient()
attachAuthInterceptor(kubbAxios)
attachUnauthorizedHandler(kubbAxios)

const kubbClient: Client = async (config) => {
	const response = await kubbAxios.request({
		baseURL: config.baseURL,
		url: config.url,
		method: config.method,
		params: config.params,
		data: config.data as unknown,
		responseType: config.responseType,
		signal: config.signal,
		validateStatus: config.validateStatus,
		headers: {
			...(config.contentType ? { 'Content-Type': config.contentType } : {}),
			...(config.headers as Record<string, string>),
		},
		paramsSerializer: config.paramsSerializer,
	})
	return response
}

export default kubbClient
export { kubbClient as client }
```

- [ ] **Step 2: Verify the three new src/api files compile cleanly**

```bash
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "src/api/(base|interceptors|kubbClient)" | head -20
```

Expected: no output (no errors for those files). If you see "Cannot find module './base'" or similar, double-check that `base.ts` and `interceptors.ts` exist.

- [ ] **Step 3: Commit**

```bash
git add src/api/kubbClient.ts
git commit -m "feat(kubb): add kubb axios client with auth interceptors"
```

---

## Task 6: Create openapi/spec.json placeholder

**Files:**
- Create: `openapi/spec.json`

A minimal valid OpenAPI v3 JSON spec with one endpoint. This lets the full Kubb pipeline be verified end-to-end before the real backend spec is dropped in. Replace this file with the real spec when it is available, then re-run `npm run generate`.

- [ ] **Step 1: Create the openapi/ directory and placeholder spec**

```bash
mkdir -p openapi
```

Create `openapi/spec.json`:

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Flexprice API",
    "version": "1.0.0"
  },
  "paths": {
    "/customers": {
      "get": {
        "operationId": "getCustomers",
        "tags": ["customers"],
        "summary": "List customers",
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CustomerList"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "CustomerList": {
        "type": "object",
        "properties": {
          "items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Customer"
            }
          }
        }
      },
      "Customer": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" }
        },
        "required": ["id", "name"]
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add openapi/spec.json
git commit -m "chore: add placeholder openapi v3 spec for kubb pipeline verification"
```

---

## Task 7: Create kubb.config.ts

**Files:**
- Create: `kubb.config.ts`

Three plugins in order: `pluginOas` (required base), `pluginTs` (types), `pluginClient` (axios functions), `pluginReactQuery` (hooks). Each writes to its own subdirectory under `src/generated/`.

The `importPath: '../../api/kubbClient'` is the critical link: generated client files live at `src/generated/clients/*.ts`, so `../../api/kubbClient` resolves to `src/api/kubbClient`. This means every generated API call flows through `kubbAxios` with auth and env-ID headers automatically.

`output.clean: true` wipes `src/generated/` before each run so stale files don't accumulate when the spec changes.

- [ ] **Step 1: Create kubb.config.ts at the project root**

```ts
import { defineConfig } from '@kubb/core'
import { pluginOas } from '@kubb/plugin-oas'
import { pluginTs } from '@kubb/plugin-ts'
import { pluginClient } from '@kubb/plugin-client'
import { pluginReactQuery } from '@kubb/plugin-react-query'

export default defineConfig({
	input: {
		path: './openapi/spec.json',
	},
	output: {
		path: './src/generated',
		clean: true,
	},
	plugins: [
		pluginOas(),
		pluginTs({
			output: { path: 'types' },
		}),
		pluginClient({
			output: { path: 'clients' },
			importPath: '../../api/kubbClient',
		}),
		pluginReactQuery({
			output: { path: 'hooks' },
			framework: 'react',
		}),
	],
})
```

- [ ] **Step 2: Verify TypeScript accepts kubb.config.ts**

```bash
npx tsc --noEmit -p tsconfig.node.json 2>&1 | head -20
```

Expected: zero errors. If you see "Cannot find module '@kubb/plugin-oas'" etc., verify Task 1 packages are installed (`ls node_modules/@kubb/`).

- [ ] **Step 3: Commit**

```bash
git add kubb.config.ts
git commit -m "feat(kubb): add kubb.config.ts — three-plugin codegen pipeline"
```

---

## Task 8: Run generate, verify output, commit

**Files:**
- Generated: `src/generated/types/`, `src/generated/clients/`, `src/generated/hooks/`

- [ ] **Step 1: Run the generate script**

```bash
npm run generate
```

Expected: Kubb prints a file-by-file summary and exits 0. Something like:
```
✓  types/Customer.ts
✓  types/CustomerList.ts
✓  clients/getCustomers.ts
✓  hooks/useGetCustomersQuery.ts
```

If the command exits non-zero, check:
- `openapi/spec.json` is valid JSON: `node -e "JSON.parse(require('fs').readFileSync('openapi/spec.json','utf8'))" && echo valid`
- All packages installed: `ls node_modules/@kubb/`
- `kubb.config.ts` has no TypeScript errors (Task 7, Step 2)

- [ ] **Step 2: Verify directory structure**

```bash
find src/generated -type f | sort
```

Expected with the placeholder spec (exact filenames vary by Kubb version):
```
src/generated/clients/getCustomers.ts
src/generated/hooks/useGetCustomersQuery.ts
src/generated/types/Customer.ts
src/generated/types/CustomerList.ts
```

- [ ] **Step 3: Spot-check generated client imports your kubbClient**

```bash
head -5 src/generated/clients/getCustomers.ts
```

Expected: the first few lines include an import like:
```ts
import client from '../../api/kubbClient'
```

If it imports from somewhere else, the `importPath` in `kubb.config.ts` is wrong — re-check the relative path from `src/generated/clients/` to `src/api/kubbClient`.

- [ ] **Step 4: Spot-check generated hook uses TanStack Query**

```bash
head -10 src/generated/hooks/useGetCustomers*.ts
```

Expected: imports from `@tanstack/react-query` and from the generated client in `../clients/`.

- [ ] **Step 5: Verify the full build still passes**

```bash
npm run build 2>&1 | tail -20
```

Expected: build exits 0. If TypeScript errors appear in generated files, the most common cause is a type mismatch between `kubbClient.ts` and what `@kubb/plugin-client` expects — verify that `RequestConfig`, `ResponseConfig`, and the `Client` type in `src/api/kubbClient.ts` match `@kubb/plugin-client/clients/axios` exactly.

- [ ] **Step 6: Commit generated files**

```bash
git add src/generated/
git commit -m "chore: add kubb-generated types, clients, and hooks from placeholder spec"
```

---

## After Implementation: Replacing the Placeholder Spec

When the real backend OpenAPI v3 spec is available:

1. Replace `openapi/spec.json` with the real spec
2. Run `npm run generate`
3. Commit: `git add openapi/spec.json src/generated/ && git commit -m "chore: update to real openapi spec and regenerate"`

The `output.clean: true` in `kubb.config.ts` ensures stale files from the placeholder spec are removed automatically.
