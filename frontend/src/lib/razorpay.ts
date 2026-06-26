import { env } from "./env";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

let scriptPromise: Promise<boolean> | null = null;

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export interface RzpOrder {
  key?: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentId?: string;
}

export async function openRazorpay({
  order,
  user,
  description,
  onSuccess,
  onDismiss,
}: {
  order: RzpOrder;
  user: { name: string; email: string };
  description: string;
  onSuccess: (res: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onDismiss?: () => void;
}) {
  const ok = await loadRazorpay();
  if (!ok || !window.Razorpay) {
    throw new Error("Razorpay SDK failed to load");
  }
  const rzp = new window.Razorpay({
    key: order.key || env.RAZORPAY_KEY_ID,
    order_id: order.orderId,
    amount: order.amount,
    currency: order.currency,
    name: "GD Evaluation",
    description,
    prefill: { name: user.name, email: user.email },
    theme: { color: "#1C9A8F" },
    handler: onSuccess,
    modal: { ondismiss: onDismiss },
  });
  rzp.open();
}
