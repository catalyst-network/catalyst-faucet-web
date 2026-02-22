"use client";

import { isAddress } from "ethers";
import { useEffect, useMemo, useState } from "react";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { fetchFaucetInfo, requestFaucetFunds, type FaucetInfo } from "@/lib/faucetApi";
import { formatDateTime, formatDuration } from "@/lib/format";
import {
  getPublicConfig,
  isChainIdAllowed,
  makeExplorerTxUrl,
  type PublicConfig,
} from "@/lib/publicConfig";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; txHash: string; nextEligibleAt?: string }
  | { kind: "error"; message: string };

export default function Home() {
  const cfg = useMemo<
    | { config: PublicConfig; error?: undefined }
    | { config?: undefined; error: string }
  >(() => {
    try {
      return { config: getPublicConfig() };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, []);
  const config = cfg.config;

  const [info, setInfo] = useState<FaucetInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const normalizedAddress = address.trim();
  const addressValid = normalizedAddress.length > 0 && isAddress(normalizedAddress);
  const explorerTxUrlTemplate =
    config?.explorerTxUrlTemplate ?? "https://explorer.catalystnet.org/tx/<txHash>";

  const chainBlockedReason = useMemo(() => {
    if (!config) return null;
    if (!info?.chainId) return null;
    if (isChainIdAllowed(config.chainIdAllowlist, info.chainId)) return null;
    return `Unsupported network (chainId ${info.chainId}). This faucet is testnet-only.`;
  }, [config, info?.chainId]);

  useEffect(() => {
    if (!config) return;
    const faucetApiBaseUrl = config.faucetApiBaseUrl;
    let cancelled = false;

    async function load() {
      setInfoError(null);
      try {
        const data = await fetchFaucetInfo(faucetApiBaseUrl);
        if (!cancelled) setInfo(data);
      } catch (e) {
        if (!cancelled) {
          setInfo(null);
          setInfoError(e instanceof Error ? e.message : String(e));
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [config]);

  const disabled =
    !config ||
    !!cfg.error ||
    !!chainBlockedReason ||
    !addressValid ||
    !turnstileToken ||
    status.kind === "submitting";

  async function onSubmit() {
    if (!config) return;
    const faucetApiBaseUrl = config.faucetApiBaseUrl;
    if (!addressValid) {
      setStatus({ kind: "error", message: "Enter a valid EVM address." });
      return;
    }
    if (!turnstileToken) {
      setStatus({ kind: "error", message: "Complete the verification first." });
      return;
    }
    if (chainBlockedReason) {
      setStatus({ kind: "error", message: chainBlockedReason });
      return;
    }

    setStatus({ kind: "submitting" });
    const tokenToUse = turnstileToken;
    setTurnstileToken("");
    setTurnstileKey((k) => k + 1);

    try {
      const res = await requestFaucetFunds({
        baseUrl: faucetApiBaseUrl,
        address: normalizedAddress,
        turnstileToken: tokenToUse,
      });
      setStatus({ kind: "success", txHash: res.txHash, nextEligibleAt: res.nextEligibleAt });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Request failed. Please try again.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <header className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Catalyst Faucet
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Request testnet KAT for development and testing.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                {config?.networkName ?? "Network"}
              </span>
              <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                Testnet
              </span>
            </div>
          </div>
        </header>

        <main className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {info ? (
                  <span>
                    Amount:{" "}
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">
                      {info.amount} {info.symbol}
                    </span>{" "}
                    · Cooldown:{" "}
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">
                      {formatDuration(info.cooldownSeconds)}
                    </span>
                  </span>
                ) : infoError ? (
                  <span className="text-red-600 dark:text-red-400">
                    {infoError}
                  </span>
                ) : (
                  <span>Loading faucet info…</span>
                )}
              </div>
              {info?.chainId ? (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  chainId: <span className="font-mono">{info.chainId}</span>
                </span>
              ) : null}
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            {cfg.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                <p className="font-medium">Configuration error</p>
                <p className="mt-1 font-mono">{cfg.error}</p>
              </div>
            ) : null}

            {chainBlockedReason ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                {chainBlockedReason}
              </div>
            ) : null}

            <div>
              <label className="text-sm font-medium" htmlFor="address">
                Wallet address
              </label>
              <div className="mt-2">
                <input
                  id="address"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="0x…"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (status.kind !== "idle") setStatus({ kind: "idle" });
                  }}
                  className={[
                    "w-full rounded-xl border bg-white px-4 py-3 font-mono text-sm outline-none transition",
                    "dark:bg-zinc-950",
                    address.length === 0
                      ? "border-zinc-200 focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600"
                      : addressValid
                        ? "border-emerald-300 focus:border-emerald-400 dark:border-emerald-900/60 dark:focus:border-emerald-700"
                        : "border-red-300 focus:border-red-400 dark:border-red-900/60 dark:focus:border-red-700",
                  ].join(" ")}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Enter an Ethereum-style address on Catalyst testnet.
              </p>
            </div>

            {config ? (
              <div key={turnstileKey}>
                <TurnstileWidget
                  siteKey={config.turnstileSiteKey}
                  action="faucet_request"
                  onToken={(t) => setTurnstileToken(t)}
                  onExpired={() => setTurnstileToken("")}
                  onError={() => {
                    setTurnstileToken("");
                    setStatus({
                      kind: "error",
                      message: "Verification failed to load. Please disable blockers and retry.",
                    });
                  }}
                />
              </div>
            ) : null}

            <button
              type="button"
              onClick={onSubmit}
              disabled={disabled}
              className={[
                "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition",
                disabled
                  ? "cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
              ].join(" ")}
            >
              {status.kind === "submitting" ? "Requesting…" : "Request funds"}
            </button>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-black">
              {status.kind === "idle" ? (
                <p className="text-zinc-600 dark:text-zinc-400">
                  Complete verification, then request funds. If you hit cooldown, the response will tell you when you can request again.
                </p>
              ) : status.kind === "submitting" ? (
                <p className="text-zinc-600 dark:text-zinc-400">
                  Submitting your request…
                </p>
              ) : status.kind === "error" ? (
                <div className="space-y-1">
                  <p className="font-medium text-red-700 dark:text-red-300">
                    Request failed
                  </p>
                  <p className="text-red-700/90 dark:text-red-200/90">
                    {status.message}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">
                    Success
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    Transaction:{" "}
                    <a
                      className="font-mono text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-600 dark:text-zinc-100 dark:decoration-zinc-700 dark:hover:decoration-zinc-300"
                      href={makeExplorerTxUrl(
                        explorerTxUrlTemplate,
                        status.txHash,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {status.txHash}
                    </a>
                  </p>
                  {status.nextEligibleAt ? (
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Next eligible time:{" "}
                      <span className="font-medium text-zinc-950 dark:text-zinc-50">
                        {formatDateTime(status.nextEligibleAt)}
                      </span>
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <footer className="pt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Explorer:{" "}
              <a
                className="underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-200"
                href="https://explorer.catalystnet.org"
                target="_blank"
                rel="noreferrer"
              >
                explorer.catalystnet.org
              </a>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
