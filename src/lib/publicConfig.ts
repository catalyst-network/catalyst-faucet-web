const DEFAULT_CHAIN_ID = "0xbf8457c";

function required(value: string | undefined, name: string): string {
  const v = value?.trim();
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

function normalizeChainId(value: string | number): string {
  if (typeof value === "number") return `0x${value.toString(16)}`.toLowerCase();
  const v = value.trim().toLowerCase();
  if (v.startsWith("0x")) return v;
  const asNum = Number(v);
  if (!Number.isFinite(asNum)) return v;
  return `0x${asNum.toString(16)}`.toLowerCase();
}

function parseAllowlist(value: string | undefined): string[] {
  const raw = value ?? DEFAULT_CHAIN_ID;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeChainId);
}

export type PublicConfig = {
  faucetApiBaseUrl: string;
  turnstileSiteKey: string;
  networkName: string;
  explorerTxUrlTemplate: string;
  chainIdAllowlist: string[];
};

export function getPublicConfig(): PublicConfig {
  // IMPORTANT: these must be referenced statically so Next can inline NEXT_PUBLIC_* into the client bundle.
  // Default to same-origin `/api` when running behind the recommended reverse proxy.
  const faucetApiBaseUrl = (optional(process.env.NEXT_PUBLIC_FAUCET_API_BASE_URL) ?? "/api").replace(
    /\/+$/,
    "",
  );

  return {
    faucetApiBaseUrl,
    turnstileSiteKey: required(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, "NEXT_PUBLIC_TURNSTILE_SITE_KEY"),
    networkName: optional(process.env.NEXT_PUBLIC_NETWORK_NAME) ?? "Catalyst Testnet",
    explorerTxUrlTemplate:
      optional(process.env.NEXT_PUBLIC_EXPLORER_TX_URL_TEMPLATE) ??
      "https://explorer.catalystnet.org/tx/<txHash>",
    chainIdAllowlist: parseAllowlist(optional(process.env.NEXT_PUBLIC_ALLOWED_CHAIN_IDS)),
  };
}

export function makeExplorerTxUrl(
  template: string,
  txHash: string,
): string {
  return template
    .replaceAll("<txHash>", txHash)
    .replaceAll("{txHash}", txHash)
    .replaceAll(":txHash", txHash);
}

export function isChainIdAllowed(
  chainIdAllowlist: string[],
  chainId: string | number,
): boolean {
  const normalized = normalizeChainId(chainId);
  return chainIdAllowlist.includes(normalized);
}

