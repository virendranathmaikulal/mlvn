/**
 * PrintTemplate
 *
 * Renders an invisible, print-only div that is shown only when window.print() is called.
 * The parent calls printOrder() which:
 *   1. Sets the print size class on <body> ("print-small" | "print-large")
 *   2. Calls window.print()
 *   3. Cleans up the class after printing
 */

import { forwardRef } from "react";
import { format } from "date-fns";

interface Medicine {
  name: string;
  quantity: string;
  price?: string;
  notes?: string;
}

interface PrintTemplateProps {
  order: {
    id: string;
    customer_name?: string;
    customer_phone: string;
    customer_address?: string;
    medicines?: Medicine[];
    lead_status: string;
    created_at: string;
    notes?: string;
  };
}

export const PrintTemplate = forwardRef<HTMLDivElement, PrintTemplateProps>(
  ({ order }, ref) => {
    const medicines: Medicine[] = order.medicines || [];
    const orderDate = format(new Date(order.created_at), "dd MMM yyyy, hh:mm a");
    const orderId = order.id.slice(-8).toUpperCase();

    return (
      <div ref={ref} id="print-template" className="print-template">
        {/* ── STORE HEADER ── */}
        <div className="print-header">
          <div className="print-store-name">PT. Maikoo Lal Virendra Nath</div>
          <div className="print-store-name">Medical Store</div>
          <div className="print-estd">Estd. 1927</div>
          <div className="print-divider" />
        </div>

        {/* ── ORDER META ── */}
        <div className="print-meta">
          <div className="print-meta-row">
            <span className="print-label">Order #</span>
            <span className="print-value">{orderId}</span>
          </div>
          <div className="print-meta-row">
            <span className="print-label">Date</span>
            <span className="print-value">{orderDate}</span>
          </div>
          <div className="print-meta-row">
            <span className="print-label">Status</span>
            <span className="print-value print-status">{order.lead_status.toUpperCase()}</span>
          </div>
        </div>

        <div className="print-divider" />

        {/* ── CUSTOMER INFO ── */}
        <div className="print-section-title">Customer Details</div>
        <div className="print-customer">
          <div className="print-customer-name">{order.customer_name || "—"}</div>
          <div className="print-customer-phone">{order.customer_phone}</div>
          {order.customer_address && (
            <div className="print-customer-address">
              📍 {order.customer_address}
            </div>
          )}
        </div>

        <div className="print-divider" />

        {/* ── MEDICINES TABLE ── */}
        <div className="print-section-title">Medicines Ordered</div>
        {medicines.length > 0 ? (
          <table className="print-medicines-table">
            <thead>
              <tr>
                <th className="print-th print-th-no">#</th>
                <th className="print-th print-th-name">Medicine</th>
                <th className="print-th print-th-qty">Qty</th>
                {medicines.some((m) => m.price) && (
                  <th className="print-th print-th-price">Price</th>
                )}
              </tr>
            </thead>
            <tbody>
              {medicines.map((med, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "print-tr-even" : "print-tr-odd"}>
                  <td className="print-td print-td-no">{idx + 1}</td>
                  <td className="print-td print-td-name">
                    <span className="print-med-name">{med.name}</span>
                    {med.notes && (
                      <span className="print-med-notes"> ({med.notes})</span>
                    )}
                  </td>
                  <td className="print-td print-td-qty">{med.quantity}</td>
                  {medicines.some((m) => m.price) && (
                    <td className="print-td print-td-price">{med.price || "—"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="print-no-items">No medicines listed</p>
        )}

        {/* ── NOTES ── */}
        {order.notes && (
          <>
            <div className="print-divider" />
            <div className="print-section-title">Notes</div>
            <div className="print-notes">{order.notes}</div>
          </>
        )}

        {/* ── FOOTER ── */}
        <div className="print-divider" />
        <div className="print-footer">
          <div>Thank you for your order!</div>
          <div className="print-footer-sub">
            For queries call: <strong>{order.customer_phone}</strong>
          </div>
          <div className="print-footer-sub print-footer-tiny">
            PT. Maikoo Lal Virendra Nath Medical Store — Estd. 1927
          </div>
        </div>
      </div>
    );
  }
);

PrintTemplate.displayName = "PrintTemplate";

/**
 * Utility: trigger browser print with the correct size class.
 * Call this instead of window.print() directly.
 */
export function printOrder(size: "small" | "large") {
  document.body.classList.remove("print-small", "print-large");
  document.body.classList.add(`print-${size}`);

  // Inject a temporary <style> for @page so the page size matches the chosen format
  const styleId = "__print_page_style__";
  const existing = document.getElementById(styleId);
  if (existing) existing.remove();

  const pageStyle = document.createElement("style");
  pageStyle.id = styleId;
  pageStyle.textContent =
    size === "small"
      ? `@page { size: 72mm auto; margin: 2mm; }`
      : `@page { size: A4; margin: 15mm; }`;
  document.head.appendChild(pageStyle);

  // Small delay so the class + style are applied before the print dialog opens
  setTimeout(() => {
    window.print();
    // Clean up after the dialog closes
    const cleanup = () => {
      document.body.classList.remove("print-small", "print-large");
      const s = document.getElementById(styleId);
      if (s) s.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
  }, 50);
}
