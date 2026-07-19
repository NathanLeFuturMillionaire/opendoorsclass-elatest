import { createHmac, timingSafeEqual } from "crypto";

const MONEROO_API_BASE = "https://api.moneroo.io";

export type MonerooCustomer = {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
};

export type MonerooInitializePayload = {
  amount: number;
  currency: string;
  description: string;
  customer: MonerooCustomer;
  return_url: string;
  metadata?: Record<string, string>;
  methods?: string[];
};

export type MonerooInitializeResponse = {
  message: string;
  data: {
    id: string;
    checkout_url: string;
  };
};

export type MonerooVerifyResponse = {
  message: string;
  data: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    payment_method?: string;
    customer?: MonerooCustomer;
    metadata?: Record<string, string>;
  };
};

export async function initializeMonerooPayment(
  payload: MonerooInitializePayload,
  secretKey: string
): Promise<MonerooInitializeResponse> {
  const response = await fetch(`${MONEROO_API_BASE}/v1/payments/initialize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as MonerooInitializeResponse | { message?: string };
  if (!response.ok) {
    throw new Error(
      "Moneroo init failed: " + ("message" in body ? String(body.message) : response.statusText)
    );
  }
  return body as MonerooInitializeResponse;
}

export async function verifyMonerooTransaction(
  paymentId: string,
  secretKey: string
): Promise<MonerooVerifyResponse> {
  const response = await fetch(`${MONEROO_API_BASE}/v1/payments/${paymentId}/verify`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const body = (await response.json()) as MonerooVerifyResponse | { message?: string };
  if (!response.ok) {
    throw new Error(
      "Moneroo verify failed: " + ("message" in body ? String(body.message) : response.statusText)
    );
  }
  return body as MonerooVerifyResponse;
}

export function verifyMonerooWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
