import type { CartItem, CheckoutState, QuotePayload } from "../types";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export function CartDrawer({
  open,
  cart,
  quote,
  checkout,
  paymentLink,
  placingOrder,
  onClose,
  onRemove,
  onCheckoutChange,
  onSubmit
}: {
  open: boolean;
  cart: CartItem[];
  quote: QuotePayload | null;
  checkout: CheckoutState;
  paymentLink?: string;
  placingOrder: boolean;
  onClose: () => void;
  onRemove: (key: string) => void;
  onCheckoutChange: (patch: Partial<CheckoutState>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <aside className={`drawer ${open ? "open" : ""}`}>
      <div className="drawer-header">
        <h3>Your order</h3>
        <button className="secondary small" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="drawer-body">
        {cart.length ? (
          cart.map((entry) => (
            <div className="cart-line" key={entry.key}>
              <div>
                <strong>{entry.name}</strong>
                <p>
                  {money.format(entry.price)} × {entry.quantity}
                </p>
              </div>
              <button type="button" onClick={() => onRemove(entry.key)}>
                Remove
              </button>
            </div>
          ))
        ) : (
          <div className="placeholder-card compact">
            <p>Your cart is empty.</p>
          </div>
        )}

        <form className="checkout-form" onSubmit={onSubmit}>
          <label>
            <span>Promo code</span>
            <input value={checkout.couponCode} onChange={(event) => onCheckoutChange({ couponCode: event.target.value })} />
          </label>
          <label>
            <span>Name</span>
            <input value={checkout.name} onChange={(event) => onCheckoutChange({ name: event.target.value })} required />
          </label>
          <label>
            <span>Phone</span>
            <input value={checkout.phone} onChange={(event) => onCheckoutChange({ phone: event.target.value })} required />
          </label>
          <label>
            <span>Address</span>
            <textarea value={checkout.address} onChange={(event) => onCheckoutChange({ address: event.target.value })} required />
          </label>
          <label>
            <span>Payment method</span>
            <select value={checkout.paymentMethod} onChange={(event) => onCheckoutChange({ paymentMethod: event.target.value as CheckoutState["paymentMethod"] })}>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="cod">Cash on delivery</option>
            </select>
          </label>
          <label>
            <span>Notes</span>
            <textarea value={checkout.notes} onChange={(event) => onCheckoutChange({ notes: event.target.value })} />
          </label>
          {quote && (
            <div className="quote">
              <div>
                <span>Subtotal</span>
                <strong>{money.format(quote.subtotal)}</strong>
              </div>
              <div>
                <span>Delivery</span>
                <strong>{quote.deliveryFee ? money.format(quote.deliveryFee) : "Free"}</strong>
              </div>
              <div>
                <span>Discount</span>
                <strong>-{money.format(quote.discount)}</strong>
              </div>
              <div className="total">
                <span>Total</span>
                <strong>{money.format(quote.total)}</strong>
              </div>
            </div>
          )}
          {paymentLink ? (
            <a className="secondary" href={paymentLink} rel="noreferrer" target="_blank">
              Open Razorpay payment link
            </a>
          ) : null}
          <button className="primary" disabled={placingOrder} type="submit">
            {placingOrder ? "Creating order..." : "Proceed to payment"}
          </button>
        </form>
      </div>
    </aside>
  );
}
