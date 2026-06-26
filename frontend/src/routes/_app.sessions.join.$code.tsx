import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import type { Session } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { openRazorpay, type RzpOrder } from "@/lib/razorpay";

export const Route = createFileRoute("/_app/sessions/join/$code")({
  ssr: false,
  component: JoinSession,
});

function JoinSession() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    apiGet<{ session: Session }>(`/sessions/join/${code}`)
      .then(({ data }) => setSession(data.session))
      .catch((e) =>
        toast.error(e instanceof ApiError ? e.message : "Invalid code"),
      );
  }, [code]);

  const enroll = async () => {
    if (!session || !user) return;
    setLoading(true);
    try {
      await apiPost(`/sessions/${session._id}/join`);
      toast.success("You're in!");
      navigate({ to: "/sessions/$id", params: { id: session._id } });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const pay = async () => {
    if (!session || !user) return;
    setLoading(true);
    try {
      const order = await apiPost<RzpOrder>("/payments/order", {
        sessionId: session._id,
      });
      await openRazorpay({
        order,
        user: { name: user.name, email: user.email },
        description: session.title,
        onSuccess: async (res) => {
          try {
            await apiPost("/payments/verify", {
              paymentId: order.paymentId,
              orderId: order.orderId,
              razorpayPaymentId: res.razorpay_payment_id,
              razorpaySignature: res.razorpay_signature,
            });
            setPaid(true);
            toast.success("Payment verified");
            await enroll();
          } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Verify failed");
          }
        },
        onDismiss: () => setLoading(false),
      });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Payment failed");
      setLoading(false);
    }
  };

  if (!session) return <div className="text-text-muted-light">Loading…</div>;

  return (
    <div className="max-w-xl">
      <PageHeader title={session.title} subtitle="join this session" />
      <div className="bg-white border rounded-2xl p-6 space-y-4">
        {session.description && (
          <p className="text-text-muted-light">{session.description}</p>
        )}
        {session.requiresPayment && !paid ? (
          <>
            <div className="bg-surface-light rounded-lg p-4">
              <div className="text-xs uppercase tracking-wider text-text-muted-light">
                Registration fee
              </div>
              <div className="text-3xl font-bold text-accent-teal">
                {session.currency} {session.price}
              </div>
            </div>
            <Button onClick={pay} disabled={loading}
              className="w-full bg-accent-teal hover:bg-accent-teal-bright">
              {loading ? "Processing…" : "Pay & join"}
            </Button>
          </>
        ) : (
          <Button onClick={enroll} disabled={loading}
            className="w-full bg-accent-teal hover:bg-accent-teal-bright">
            {loading ? "Joining…" : "Join session"}
          </Button>
        )}
      </div>
    </div>
  );
}
