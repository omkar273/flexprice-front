# Kubb Code Generation Setup

**Date:** 2026-06-10  
**Branch:** feat/kubb-setup  
**Status:** Approved

## Overview

Set up Kubb v3 to generate TypeScript types, axios client functions, and TanStack Query hooks from an OpenAPI v3 JSON spec. Generated output lives alongside the existing hand-written `src/api/` files. New features use generated code; existing files are migrated gradually.

## Decisions

| Question | Decision |
|---|---|
| Spec source | `openapi/spec.json` checked into repo |
| Spec format | OpenAPI v3 JSON |
| What to generate | Types + Clients + Hooks (all three layers) |
| Migration strategy | Greenfield alongside — existing `src/api/` untouched |
| Output structure | Layer-first: `src/generated/{types,clients,hooks}/` |
| Generated files in git | Committed (developer responsibility to regenerate after spec changes) |
| Generation trigger | Manual: `npm run generate` |
| Auth for new axios instance | Duplicated from existing `src/core/axios/config.ts` into new `src/api/base.ts` + `src/api/interceptors.ts` |

## Dependencies

All installed as `devDependencies`. In Kubb v3, generated files import types from the user-written `kubbClient.ts` — not from Kubb packages directly — so no Kubb package is needed at runtime.

```
@kubb/core                # devDependency — core config/plugin infrastructure
@kubb/cli                 # devDependency — provides the `kubb` CLI
@kubb/plugin-oas          # devDependency — OpenAPI parsing
@kubb/plugin-ts           # devDependency — TypeScript type generation
@kubb/plugin-client       # devDependency — axios client function generation
@kubb/plugin-react-query  # devDependency — TanStack Query hook generation
```

## New Files

### `openapi/spec.json`
The OpenAPI v3 source spec. Committed to the repo. Update this file when the backend API changes, then run `npm run generate`.

### `kubb.config.ts` (project root)
Main Kubb configuration:

```ts
import { defineConfig } from '@kubb/core'
import { pluginOas } from '@kubb/plugin-oas'
import { pluginTs } from '@kubb/plugin-ts'
import { pluginClient } from '@kubb/plugin-client'
import { pluginReactQuery } from '@kubb/plugin-react-query'

export default defineConfig({
  input: { path: './openapi/spec.json' },
  output: { path: './src/generated', clean: true },
  plugins: [
    pluginOas(),
    pluginTs({ output: { path: 'types' } }),
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

The `importPath` tells generated client files where to find the custom axios wrapper so all requests flow through auth/env-ID interceptors automatically.

### `src/api/base.ts`
Creates a fresh axios instance for Kubb-generated clients. Does **not** strip `response.data` in the response interceptor — Kubb clients extract `.data` themselves from the `ResponseConfig` shape.

```ts
import axios from 'axios'
import { config } from '@/config/config'

export function createHttpClient() {
  return axios.create({
    baseURL: config.api.baseUrl,
    timeout: 600000,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

### `src/api/interceptors.ts`
Duplicates auth logic from `src/core/axios/config.ts`. Key difference: response interceptor returns the **full `AxiosResponse`**, not `response.data`.

```ts
import type { AxiosInstance } from 'axios'
import AuthService from '@/core/auth/AuthService'
import EnvironmentApi from '@/api/EnvironmentApi'

export function attachAuthInterceptor(instance: AxiosInstance): void {
  instance.interceptors.request.use(async (reqConfig) => {
    const token = await AuthService.getAcessToken()
    const activeEnvId = EnvironmentApi.getActiveEnvironmentId()
    if (activeEnvId) reqConfig.headers['X-Environment-ID'] = activeEnvId
    if (token) reqConfig.headers.Authorization = `Bearer ${token}`
    return reqConfig
  }, (error) => Promise.reject(error))
}

export function attachUnauthorizedHandler(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    (response) => response,  // full response — NOT response.data
    async (error) => {
      if (error.response?.status === 401) {
        await AuthService.logout()
      }
      return Promise.reject(error)
    },
  )
}
```

### `src/api/kubbClient.ts`
Already written. Wires `kubbAxios` through `createHttpClient`, `attachAuthInterceptor`, and `attachUnauthorizedHandler`. Exports the `client` alias required by `@kubb/plugin-client`.

## Generated Output Structure

```
src/generated/
  types/         # TypeScript interfaces — one file per schema/operation
  clients/       # axios function per operation, e.g. getCustomers.ts
  hooks/         # TanStack Query hooks per operation, e.g. useGetCustomers.ts
```

`output.clean: true` in the config means `src/generated/` is wiped before each generation run, preventing stale files from accumulating.

## tsconfig Update

`kubb.config.ts` sits at the project root alongside `vite.config.ts`. Add it to `tsconfig.node.json`'s `include` array so TypeScript type-checks it:

```json
"include": ["vite.config.ts", "kubb.config.ts"]
```

Kubb uses its own bundler to execute the config at codegen time, so this is purely for IDE/type-checking support.

## npm Script

Add to `package.json`:
```json
"generate": "kubb generate"
```

Run after updating the spec:
```bash
npm run generate
```

## Critical Invariant

The existing `axiosClient` in `src/core/axios/config.ts` strips the response body in its response interceptor (`return response.data`). The new `kubbAxios` must **not** do this — generated client functions call `.data` on the `ResponseConfig` shape themselves. The two axios instances are intentionally separate and must not be confused.

## Out of Scope

- Customer portal `X-Session-Token` mode is not duplicated into `src/api/interceptors.ts` — Kubb-generated clients are not used in the customer portal flow.
- No pre-build hook — generation is manual.
- No migration of existing `src/api/` files — gradual replacement is a separate concern.
- Error normalization (the `getApiErrorMessage` logic from the old config) is not duplicated — Kubb clients surface raw `AxiosError` to TanStack Query's `error` state.
