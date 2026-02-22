## Catalyst Faucet Web

Clean, modern web UI for requesting **testnet KAT** on **Catalyst testnet** (Ethereum-style addresses).

- **Single page flow**: address input + validation → Turnstile → request → status panel
- **Backend-driven**: displays faucet amount + cooldown from `GET /v1/info`
- **Clear results**: success shows tx hash link + next eligible time (when provided)
- **Testnet-only guard**: chainId is checked against an allowlist when `/v1/info` includes `chainId`

Explorer: `https://explorer.catalystnet.org` (tx links use a configurable template).

### Requirements

- Node.js 20+

### Configuration

Copy the example env file and fill it in:

```bash
cp .env.example .env.local
```

Public env vars (available to the browser):

- **`NEXT_PUBLIC_FAUCET_API_BASE_URL`**: Faucet backend base URL (no trailing slash). Example: `https://faucet-api.catalystnet.org`
- **`NEXT_PUBLIC_TURNSTILE_SITE_KEY`**: Cloudflare Turnstile site key
- **`NEXT_PUBLIC_NETWORK_NAME`**: UI label (default: `Catalyst Testnet`)
- **`NEXT_PUBLIC_EXPLORER_TX_URL_TEMPLATE`**: Tx link template. Default: `https://explorer.catalystnet.org/tx/<txHash>`
- **`NEXT_PUBLIC_ALLOWED_CHAIN_IDS`**: Comma-separated allowlist (hex or decimal). Default: `0xbf8457c`

### Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

### Docker

Build:

```bash
docker build -t catalyst-faucet-web .
```

Run:

```bash
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_FAUCET_API_BASE_URL="http://host.docker.internal:8080" \
  -e NEXT_PUBLIC_TURNSTILE_SITE_KEY="your_site_key" \
  -e NEXT_PUBLIC_NETWORK_NAME="Catalyst Testnet" \
  -e NEXT_PUBLIC_EXPLORER_TX_URL_TEMPLATE="https://explorer.catalystnet.org/tx/<txHash>" \
  -e NEXT_PUBLIC_ALLOWED_CHAIN_IDS="0xbf8457c" \
  catalyst-faucet-web
```

### Backend API expectations (MVP)

- `GET /v1/info` returns JSON including:
  - `amount` (string) and optional `symbol` (defaults to `KAT`)
  - `cooldownSeconds` (number)
  - optional `chainId` (hex string or number) for testnet guard
- `POST /v1/request` accepts `{ address, turnstileToken }` and returns:
  - `txHash` (string)
  - optional `nextEligibleAt` (ISO datetime string)

