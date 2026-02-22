export type FaucetInfo = {
  amount: string;
  symbol: string;
  cooldownSeconds: number;
  chainId?: string;
};

export type FaucetRequestResult = {
  txHash: string;
  nextEligibleAt?: string;
};

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

function getString(obj: unknown, keys: string[]): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

function getNumber(obj: unknown, keys: string[]): number | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function getChainId(obj: unknown): string | undefined {
  const s = getString(obj, ["chainId", "chain_id", "chainID"]);
  if (s) return s;
  const n = getNumber(obj, ["chainId", "chain_id", "chainID"]);
  if (n !== undefined) return `0x${n.toString(16)}`;
  return undefined;
}

async function readJsonOrText(res: Response): Promise<{ json?: JsonValue; text?: string }> {
  const ct = res.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) return { json: (await res.json()) as JsonValue };
  } catch {
    // fall through
  }
  try {
    return { text: await res.text() };
  } catch {
    return {};
  }
}

export async function fetchFaucetInfo(baseUrl: string): Promise<FaucetInfo> {
  const res = await fetch(`${baseUrl}/v1/info`, {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  const { json, text } = await readJsonOrText(res);
  if (!res.ok) {
    const message =
      getString(json, ["error", "message", "detail"]) ??
      text ??
      `Failed to fetch faucet info (${res.status})`;
    throw new Error(message);
  }

  const amount =
    getString(json, ["amount", "faucetAmount", "dripAmount", "value"]) ?? "0";
  const symbol = getString(json, ["symbol", "ticker"]) ?? "KAT";
  const cooldownSeconds = getNumber(json, ["cooldownSeconds", "cooldown", "cooldown_seconds"]) ?? 0;
  const chainId = getChainId(json);

  return { amount, symbol, cooldownSeconds, chainId };
}

export async function requestFaucetFunds(params: {
  baseUrl: string;
  address: string;
  turnstileToken: string;
}): Promise<FaucetRequestResult> {
  const res = await fetch(`${params.baseUrl}/v1/request`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      address: params.address,
      turnstileToken: params.turnstileToken,
      cfTurnstileResponse: params.turnstileToken,
    }),
  });

  const { json, text } = await readJsonOrText(res);
  if (!res.ok) {
    const message =
      getString(json, ["error", "message", "detail"]) ??
      text ??
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  const txHash =
    getString(json, ["txHash", "transactionHash", "hash"]) ??
    "";
  if (!txHash) {
    throw new Error("Faucet did not return a tx hash.");
  }

  const nextEligibleAt =
    getString(json, ["nextEligibleAt", "next_eligible_at", "nextEligibleTime"]) ??
    undefined;

  return { txHash, nextEligibleAt };
}

