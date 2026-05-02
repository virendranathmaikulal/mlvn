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
 * Utility: open a new window, write the print content into it, and call print().
 * This completely sidesteps the React DOM tree visibility problem.
 */
export function printOrder(size: "small" | "large") {
  const source = document.getElementById("print-template");
  if (!source) {
    console.error("printOrder: #print-template not found in DOM");
    return;
  }

  const isSmall = size === "small";

  const pageCSS = isSmall
    ? `@page { size: 72mm auto; margin: 2mm; }`
    : `@page { size: A4; margin: 15mm; }`;

  const sharedCSS = `
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 0;
      background: #fff; color: #000;
      font-family: ${isSmall ? "'Courier New', Courier, monospace" : "Arial, sans-serif"};
      font-size: ${isSmall ? "9pt" : "11pt"};
      line-height: ${isSmall ? "1.3" : "1.5"};
      ${isSmall ? "width: 72mm; max-width: 72mm;" : ""}
    }
    .print-template {
      padding: ${isSmall ? "2mm" : "10mm"};
      ${isSmall ? "width: 68mm; max-width: 68mm;" : "width: 190mm; max-width: 190mm;"}
    }
    .print-header { text-align: center; margin-bottom: 6px; }
    .print-store-name {
      font-weight: 700; letter-spacing: 0.5px;
      font-size: ${isSmall ? "11pt" : "18pt"};
      ${isSmall ? "" : "font-family: Georgia, serif;"}
    }
    .print-estd { font-size: ${isSmall ? "7pt" : "10pt"}; letter-spacing: 1px; margin-top: 2px; }
    .print-divider { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .print-meta { margin-bottom: 4px; }
    .print-meta-row { display: flex; justify-content: space-between; }
    .print-label { font-weight: 600; }
    .print-status { font-weight: 700; }
    .print-section-title {
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      margin: ${isSmall ? "4px 0 3px" : "8px 0 4px"};
      border-bottom: 1px solid #000; padding-bottom: 2px;
      font-size: ${isSmall ? "inherit" : "11pt"};
    }
    .print-customer-name { font-weight: 700; }
    .print-customer-phone {
      font-size: ${isSmall ? "13pt" : "13pt"};
      font-weight: 700; letter-spacing: 1px; margin: 3px 0;
    }
    .print-customer-address { margin-top: 2px; word-break: break-word; }
    .print-medicines-table {
      width: 100%; border-collapse: collapse;
      margin-top: ${isSmall ? "4px" : "6px"};
    }
    .print-th {
      text-align: left; font-weight: 700;
      border-bottom: 1px solid #000;
      padding: ${isSmall ? "2px 3px" : "5px 8px"};
      ${isSmall ? "" : "border: 1px solid #ccc; background: #f0f0f0;"}
    }
    .print-td {
      padding: ${isSmall ? "2px 3px" : "5px 8px"};
      vertical-align: top;
      ${isSmall ? "" : "border: 1px solid #ccc;"}
    }
    .print-th-no, .print-td-no { width: ${isSmall ? "14px" : "30px"}; }
    .print-th-qty, .print-td-qty { width: ${isSmall ? "36px" : "60px"}; text-align: right; }
    .print-th-price, .print-td-price { width: ${isSmall ? "44px" : "70px"}; text-align: right; }
    .print-med-name { font-weight: 700; }
    .print-med-notes { font-weight: 400; font-size: 0.85em; }
    .print-tr-even { background: ${isSmall ? "#f5f5f5" : "#fafafa"}; }
    .print-no-items { font-style: italic; margin: 4px 0; }
    .print-notes { font-size: 0.9em; margin: 3px 0; word-break: break-word; }
    .print-footer {
      text-align: center;
      margin-top: ${isSmall ? "6px" : "14px"};
      font-size: ${isSmall ? "0.85em" : "10pt"};
      ${isSmall ? "" : "border-top: 1px solid #ccc; padding-top: 8px;"}
    }
    .print-footer-sub { margin-top: 2px; }
    .print-footer-tiny { font-size: 0.8em; color: #555; }
  `;

  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (!printWindow) {
    alert("Pop-up blocked. Please allow pop-ups for this site to print.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Order Print</title>
        <style>${pageCSS}\n${sharedCSS}</style>
      </head>
      <body>
        ${source.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();

  // Wait for resources to load then print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Fallback if onload doesn't fire (some browsers)
  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } catch {
      // already closed or printed
    }
  }, 800);
}
