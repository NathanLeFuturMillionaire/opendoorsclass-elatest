const CHARIOW_API_BASE = "https://api.chariow.com/v1";

export type ChariowCheckoutPayload = {
  product_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: { number: string; country_code: string };
  redirect_url?: string;
  payment_currency?: string;
  custom_metadata?: Record<string, string>;
};

export type ChariowCheckoutResponse = {
  message?: string;
  data: {
    step: "payment" | "completed" | "already_purchased";
    message?: string | null;
    purchase: {
      id: string;
      status: string;
    } | null;
    payment: {
      checkout_url: string | null;
      transaction_id: string | null;
    };
  };
};

export type ChariowSaleResponse = {
  data: {
    id: string;
    status: "awaiting_payment" | "completed" | "failed" | "refunded" | string;
    custom_metadata?: Record<string, string> | null;
    amount?: { value: number; currency: string };
    customer?: { email?: string };
  };
};

async function chariowRequest<T>(path: string, init: RequestInit, apiKey: string): Promise<T> {
  const response = await fetch(`${CHARIOW_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { message: text };
  }
  if (!response.ok) {
    const msg =
      (body as { message?: string }).message ??
      `Chariow ${response.status} ${response.statusText}`;
    throw new Error(`Chariow error: ${msg}`);
  }
  return body as T;
}

export function initChariowCheckout(
  payload: ChariowCheckoutPayload,
  apiKey: string
): Promise<ChariowCheckoutResponse> {
  return chariowRequest<ChariowCheckoutResponse>(
    "/checkout",
    { method: "POST", body: JSON.stringify(payload) },
    apiKey
  );
}

export function getChariowSale(saleId: string, apiKey: string): Promise<ChariowSaleResponse> {
  return chariowRequest<ChariowSaleResponse>(`/sales/${saleId}`, { method: "GET" }, apiKey);
}