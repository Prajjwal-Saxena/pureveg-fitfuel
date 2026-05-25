import { useEffect, useState } from "react";
import type { AccountPayload, DashboardPayload, IntegrationStatus } from "../types";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const integrationLabels: Array<{ key: keyof IntegrationStatus; label: string }> = [
  { key: "mixpanel", label: "Mixpanel" },
  { key: "openai", label: "OpenAI" },
  { key: "pinecone", label: "Pinecone" },
  { key: "firebase", label: "Firebase" },
  { key: "stripe", label: "Stripe" },
  { key: "razorpay", label: "Razorpay" },
  { key: "twilio", label: "Twilio" },
  { key: "n8n", label: "n8n" },
  { key: "aws", label: "AWS" }
];

export function DashboardSection({
  dashboard,
  integrations,
  onSaveAccount,
  savingAccount
}: {
  dashboard: DashboardPayload | null;
  integrations: IntegrationStatus | null;
  onSaveAccount: (account: AccountPayload) => void;
  savingAccount: boolean;
}) {
  const [account, setAccount] = useState<AccountPayload>({
    displayName: "",
    email: "",
    phone: ""
  });

  useEffect(() => {
    if (dashboard?.account) {
      setAccount({
        displayName: dashboard.account.displayName || "",
        email: dashboard.account.email || "",
        phone: dashboard.account.phone || ""
      });
    }
  }, [dashboard?.account]);

  if (!dashboard) {
    return (
      <section className="dashboard-panel">
        <div className="placeholder-card">
          <h4>Dashboard appears after profile setup</h4>
          <p>Phase 3 is preparing the user graph, personalized catalog rails, and account layer that retention systems will build on.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-panel">
      <div className="section-copy">
        <span className="pill">Profile dashboard</span>
        <h3>Your FitFuel identity is becoming a real nutrition operating layer</h3>
        <p>Orders are now tied to your user identity, and your account details can drive checkout, retention, personalized recommendations, and integration readiness.</p>
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-summary">
          <div className="dashboard-grid">
            <div className="metric-card">
              <small>Orders placed</small>
              <strong>{dashboard.stats.ordersPlaced}</strong>
            </div>
            <div className="metric-card">
              <small>Total spend</small>
              <strong>{money.format(dashboard.stats.totalSpend)}</strong>
            </div>
            <div className="metric-card">
              <small>Current streak</small>
              <strong>{dashboard.stats.currentStreak} days</strong>
            </div>
            <div className="metric-card">
              <small>Subscription</small>
              <strong>{dashboard.stats.activeSubscription ? "Active" : "Not yet"}</strong>
            </div>
          </div>

          <div className="recent-orders">
            {dashboard.recentOrders.length ? (
              dashboard.recentOrders.map((order) => (
                <article className="schedule-card" key={order.id}>
                  <span>{new Date(order.createdAt).toLocaleDateString("en-IN")}</span>
                  <strong>{order.orderNumber}</strong>
                  <p>
                    {money.format(order.total)} • {order.paymentStatus}
                  </p>
                </article>
              ))
            ) : (
              <div className="placeholder-card compact">
                <p>No past orders yet. Your next order will start the dashboard history.</p>
              </div>
            )}
          </div>

          {integrations ? (
            <div className="integration-card">
              <div className="account-header">
                <span className="pill">Integrations</span>
                <small>Live readiness snapshot</small>
              </div>
              <div className="integration-grid">
                {integrationLabels.map((integration) => (
                  <div className={`integration-chip ${integrations[integration.key] ? "ready" : "pending"}`} key={integration.key}>
                    <span>{integration.label}</span>
                    <strong>{integrations[integration.key] ? "Ready" : "Pending"}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <form
          className="account-card"
          onSubmit={(event) => {
            event.preventDefault();
            onSaveAccount(account);
          }}
        >
          <div className="account-header">
            <span className="pill">Account</span>
            <small>Auth: {dashboard.account.authProvider}</small>
          </div>

          <label>
            <span>Display name</span>
            <input value={account.displayName} onChange={(event) => setAccount((current) => ({ ...current, displayName: event.target.value }))} required />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={account.email} onChange={(event) => setAccount((current) => ({ ...current, email: event.target.value }))} />
          </label>
          <label>
            <span>Phone</span>
            <input value={account.phone} onChange={(event) => setAccount((current) => ({ ...current, phone: event.target.value }))} />
          </label>

          <button className="primary" disabled={savingAccount} type="submit">
            {savingAccount ? "Saving account..." : "Save account details"}
          </button>
        </form>
      </div>
    </section>
  );
}
