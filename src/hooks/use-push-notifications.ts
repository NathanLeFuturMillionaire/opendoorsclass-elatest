import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  deactivatePushSubscription,
  getVapidPublicKey,
  savePushSubscription,
} from "@/lib/push.functions";

export type PushState =
  | "loading"
  | "unsupported"
  | "open-in-new-tab"
  | "not-configured"
  | "default"
  | "denied"
  | "granted";

const SW_URL = "/odc-push-sw.js";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function describeDevice() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Navigateur";
  const platform = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Autre";
  return { browser, platform, deviceName: `${platform} ${browser}` };
}

/**
 * Real Web Push subscription lifecycle (Service Worker + Push API).
 * The app keeps working when push is unavailable: state simply reports why.
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const fetchKey = useServerFn(getVapidPublicKey);
  const save = useServerFn(savePushSubscription);
  const deactivate = useServerFn(deactivatePushSubscription);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined") return;
      const supported =
        "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) return setState("unsupported");
      if (window.top !== window.self) return setState("open-in-new-tab");
      const { publicKey } = await fetchKey();
      if (cancelled) return;
      if (!publicKey) return setState("not-configured");
      setState(Notification.permission as PushState);
    })().catch(() => setState("unsupported"));
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      if (window.top !== window.self) {
        setState("open-in-new-tab");
        return { ok: false as const, reason: "open-in-new-tab" as const };
      }
      const { publicKey } = await fetchKey();
      if (!publicKey) {
        setState("not-configured");
        return { ok: false as const, reason: "not-configured" as const };
      }
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return { ok: false as const, reason: "denied" as const };
      }

      const registration = await navigator.serviceWorker.register(SW_URL);
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const json = subscription.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        return { ok: false as const, reason: "unsupported" as const };
      }
      const device = describeDevice();
      await save({
        data: {
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          ...device,
        },
      });
      setState("granted");
      return { ok: true as const };
    } catch {
      return { ok: false as const, reason: "unsupported" as const };
    } finally {
      setBusy(false);
    }
  }, [fetchKey, save]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration(SW_URL);
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await deactivate({ data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      }
      setState(Notification.permission as PushState);
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    } finally {
      setBusy(false);
    }
  }, [deactivate]);

  return { state, busy, enable, disable };
}
