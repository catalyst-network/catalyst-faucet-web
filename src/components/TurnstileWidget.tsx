"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  onError?: () => void;
  onExpired?: () => void;
  action?: string;
};

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (turnstileScriptPromise) return turnstileScriptPromise;
  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.turnstile) return resolve();

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-cf-turnstile="true"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Turnstile")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.cfTurnstile = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

export function TurnstileWidget(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await loadTurnstileScript();
        if (cancelled) return;

        const container = containerRef.current;
        const turnstile = window.turnstile;
        if (!container || !turnstile) return;

        container.innerHTML = "";
        widgetIdRef.current = turnstile.render(container, {
          sitekey: props.siteKey,
          theme: "auto",
          size: "flexible",
          action: props.action,
          callback: (token) => props.onToken(token),
          "error-callback": () => props.onError?.(),
          "expired-callback": () => props.onExpired?.(),
        });

        setReady(true);
      } catch {
        if (!cancelled) props.onError?.();
      }
    }

    init();

    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // ignore
        }
      }
      widgetIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.siteKey]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="min-h-[70px] w-full rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
      />
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {ready ? "Verification is required to request funds." : "Loading verification…"}
      </p>
    </div>
  );
}

