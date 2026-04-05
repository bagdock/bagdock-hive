```
  ----++                                ----++                    ---+++     
  ---+++                                ---++                     ---++      
 ----+---     -----     ---------  --------++ ------     -----   ----++----- 
 ---------+ --------++----------++--------+++--------+ --------++---++---++++
 ---+++---++ ++++---++---+++---++---+++---++---+++---++---++---++------++++  
----++ ---++--------++---++----++---++ ---++---++ ---+---++     -------++    
----+----+---+++---++---++----++---++----++---++---+++--++ --------+---++   
---------++--------+++--------+++--------++ -------+++ -------++---++----++  
 +++++++++   +++++++++- +++---++   ++++++++    ++++++    ++++++  ++++  ++++  
                     --------+++                                             
                       +++++++                                               
```

# @bagdock/hive

The official TypeScript SDK for the Bagdock Hive API — embeddable AI-powered storage management with pluggable authentication.

[![npm version](https://img.shields.io/npm/v/@bagdock/hive.svg)](https://www.npmjs.com/package/@bagdock/hive)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Install

```bash
npm install @bagdock/hive
```

```bash
yarn add @bagdock/hive
```

```bash
pnpm add @bagdock/hive
```

```bash
bun add @bagdock/hive
```

## Quick start

```typescript
import { BagdockHive } from '@bagdock/hive'

const hive = new BagdockHive({
  apiKey: 'hk_live_...',
})

// List available units
const units = await hive.units.list({ status: 'available' })

// Start a chat session
const session = await hive.chat.create()
const reply = await hive.chat.send(session.id, { message: 'Do you have 5x10 units?' })
```

## Authentication

The SDK supports pluggable auth providers for end-user identity:

```typescript
// Clerk
const hive = new BagdockHive({
  apiKey: 'hk_live_...',
  auth: { provider: 'clerk', getToken: () => getToken() },
})

// Auth0
const hive = new BagdockHive({
  apiKey: 'hk_live_...',
  auth: { provider: 'auth0', domain: 'my-app.us.auth0.com', clientId: '...' },
})

// Stytch
const hive = new BagdockHive({
  apiKey: 'hk_live_...',
  auth: { provider: 'stytch' },
})

// Custom JWT
const hive = new BagdockHive({
  apiKey: 'hk_live_...',
  auth: { provider: 'custom', getToken: async () => myJwt },
})
```

## Operator scoping

Scope all requests to a specific operator with `forOperator()`:

```typescript
const wise = hive.forOperator('opreg_wisestorage')
const units = await wise.units.list()
const codes = await wise.access.list(unitId)
```

## API reference

### `hive.chat`

| Method | Description |
|--------|-------------|
| `chat.create()` | Start a new chat session |
| `chat.send(sessionId, { message })` | Send a message |
| `chat.history(sessionId)` | Get session history |

### `hive.units`

| Method | Description |
|--------|-------------|
| `units.list(params?)` | List units (filter by status, type) |
| `units.get(unitId)` | Get a single unit |
| `units.book(params)` | Book a unit |

### `hive.access`

| Method | Description |
|--------|-------------|
| `access.list(unitId)` | List access codes for a unit |
| `access.create(params)` | Generate a new access code |
| `access.revoke(codeId)` | Revoke an access code |

### `hive.embedTokens`

| Method | Description |
|--------|-------------|
| `embedTokens.create(params)` | Create a new embed token |
| `embedTokens.validate(token)` | Validate a token |
| `embedTokens.revoke(tokenId)` | Revoke a token |
| `embedTokens.list(params?)` | List tokens |

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | **Required.** Your Bagdock API key |
| `baseUrl` | `string` | `https://api.bagdock.com` | API base URL |
| `maxRetries` | `number` | `3` | Max retries for GET requests |
| `timeoutMs` | `number` | `30000` | Request timeout in milliseconds |
| `auth` | `AuthAdapterConfig` | — | Pluggable auth provider config |

## License

MIT
