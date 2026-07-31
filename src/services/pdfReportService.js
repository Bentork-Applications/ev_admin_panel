/**
 * Service to generate printable PDF/HTML order reports in a new browser window.
 */

export const generateOrderPdfReport = (order) => {
  if (!order) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to download/print the order report.");
    return;
  }

  const itemsList = Array.isArray(order.orderItems) && order.orderItems.length > 0
    ? order.orderItems
    : [{ productDetails: order.productDetails || order.project || "EV Battery Unit", quantity: order.quantity || order.partQuantity || 1 }];

  const totalUnits = itemsList.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const barcodeDisplay = order.startBarcode && order.endBarcode
    ? `${order.startBarcode} → ${order.endBarcode}`
    : (order.barcode || "N/A");

  const createdDateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  }) : new Date().toLocaleDateString("en-IN");

  const updatedDateStr = order.updatedAt ? new Date(order.updatedAt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  }) : createdDateStr;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
        <head>
          <title>Order Report - ${order.orderNumber || order.id} | Bentork LLP</title>
          <style>
            @page {
              size: A4;
              margin: 12mm;
            }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1E293B;
              margin: 0;
              padding: 0;
              background: #FFFFFF;
              font-size: 13px;
              line-height: 1.5;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 3px solid #1E3A8A;
              padding-bottom: 14px;
              margin-bottom: 20px;
            }
            .company-brand {
              font-size: 22px;
              font-weight: 800;
              color: #1E3A8A;
              letter-spacing: 0.5px;
            }
            .company-sub {
              font-size: 12px;
              color: #475569;
              font-weight: 600;
            }
            .company-info {
              font-size: 11px;
              color: #64748B;
              margin-top: 4px;
            }
            .report-badge {
              background: #1E3A8A;
              color: #FFFFFF;
              padding: 6px 14px;
              font-size: 12px;
              font-weight: 700;
              border-radius: 6px;
              display: inline-block;
            }
            .report-meta {
              font-size: 11px;
              color: #64748B;
              text-align: right;
              margin-top: 6px;
            }
            .section-title {
              font-size: 13px;
              font-weight: 700;
              color: #1E3A8A;
              background: #F1F5F9;
              padding: 6px 12px;
              border-left: 4px solid #1E3A8A;
              border-radius: 0 6px 6px 0;
              margin-top: 16px;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .grid-3 {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
            }
            .data-card {
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              padding: 10px 12px;
              border-radius: 8px;
            }
            .data-label {
              font-size: 10px;
              text-transform: uppercase;
              color: #64748B;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            .data-value {
              font-size: 14px;
              font-weight: 700;
              color: #0F172A;
              margin-top: 2px;
            }
            .data-value.highlight { color: #1E3A8A; }
            .data-value.success { color: #047857; }
            .qc-box {
              background: #ECFDF5;
              border: 1px solid #A7F3D0;
              padding: 12px 14px;
              border-radius: 8px;
              margin-top: 14px;
              color: #065F46;
            }
            .status-tag {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              background: #ECFDF5;
              color: #047857;
            }
            .footer {
              margin-top: 30px;
              padding-top: 14px;
              border-top: 2px solid #E2E8F0;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .signature-box {
              text-align: center;
              width: 200px;
            }
            .signature-line {
              border-bottom: 1px solid #475569;
              margin-bottom: 4px;
              height: 35px;
            }
            .no-print {
              margin-bottom: 16px;
              text-align: right;
            }
            .btn-print {
              background: #1E3A8A;
              color: #FFFFFF;
              border: none;
              padding: 10px 20px;
              font-size: 13px;
              font-weight: 600;
              border-radius: 6px;
              cursor: pointer;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
          </div>

          <!-- Header -->
          <div class="header">
            <div>
              <div class="company-brand">BENTORK LLP</div>
              <div class="company-sub">Advanced EV Battery & Storage Systems</div>
              <div class="company-info">Plot 12, Industrial Area, Phase II | Web: www.bentork.com | Support: admin@bentork.com</div>
            </div>
            <div>
              <div class="report-badge">SYSTEM ORDER DOSSIER</div>
              <div class="report-meta">
                <strong>Report Generated:</strong> ${new Date().toLocaleDateString("en-IN")}<br/>
                <strong>Doc Ref:</strong> BNT-${order.id}-${Date.now().toString().slice(-4)}
              </div>
            </div>
          </div>

          <!-- Sales & Customer Details -->
          <div class="section-title">1. Sales & Customer Information</div>
          <div class="grid-3">
            <div class="data-card">
              <div class="data-label">Order Number</div>
              <div class="data-value highlight">${order.orderNumber || `ORD-#${order.id}`}</div>
            </div>
            <div class="data-card">
              <div class="data-label">Customer Name</div>
              <div class="data-value">${order.customerName || "—"}</div>
            </div>
            <div class="data-card">
              <div class="data-label">P.I. Number</div>
              <div class="data-value highlight">${order.piNumber || "—"}</div>
            </div>
            <div class="data-card">
              <div class="data-label">Mobile Number</div>
              <div class="data-value">${order.mobileNumber || "—"}</div>
            </div>
          </div>

          <div style="margin-top: 10px;" class="data-card">
            <div class="data-label">Product Line Items (${itemsList.length}) &nbsp;|&nbsp; Payment Status: <strong style="text-transform: uppercase;">${order.paymentStatus || "PAID"}</strong></div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px;">
              <thead>
                <tr style="background: #F1F5F9; color: #475569; text-transform: uppercase; font-size: 10px;">
                  <th style="padding: 6px 10px; text-align: left;">#</th>
                  <th style="padding: 6px 10px; text-align: left;">Product Details & Specifications</th>
                  <th style="padding: 6px 10px; text-align: right;">Quantity</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList.map((it, idx) => `
                  <tr style="border-top: 1px solid #E2E8F0;">
                    <td style="padding: 6px 10px; color: #64748B;">${idx + 1}</td>
                    <td style="padding: 6px 10px; font-weight: 600; color: #1E293B;">${it.productDetails || "EV Battery Unit"}</td>
                    <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #1D4ED8;">${it.quantity} Units</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background: #F8FAFC; font-weight: 700; border-top: 2px solid #CBD5E1;">
                  <td colspan="2" style="padding: 6px 10px; color: #334155;">Total Batch Quantity</td>
                  <td style="padding: 6px 10px; text-align: right; color: #1D4ED8;">${totalUnits} Units</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Production Details -->
          <div class="section-title">2. Production & Manufacturing Details</div>
          <div class="grid-3">
            <div class="data-card">
              <div class="data-label">Manufacturing Status</div>
              <div class="data-value success">PRODUCTION COMPLETE</div>
            </div>
            <div class="data-card">
              <div class="data-label">Batch Quantity</div>
              <div class="data-value">${totalUnits} Units</div>
            </div>
            <div class="data-card">
              <div class="data-label">Completion Date</div>
              <div class="data-value">${updatedDateStr}</div>
            </div>
          </div>

          <div class="qc-box">
            <strong>Quality Assurance (QC) Inspection: PASSED & CERTIFIED</strong>
            <div style="font-size: 11px; margin-top: 4px;">
              ✓ Cell Voltage Balancing &nbsp;•&nbsp; ✓ BMS Communication &nbsp;•&nbsp; ✓ High Voltage Insulation &nbsp;•&nbsp; ✓ Thermal Load Test
            </div>
          </div>

          <!-- SCM Details -->
          <div class="section-title">3. Supply Chain & Logistics (SCM) Details</div>
          <div class="grid-3">
            <div class="data-card">
              <div class="data-label">Invoice Number</div>
              <div class="data-value highlight">${order.invoiceNumber || "—"}</div>
            </div>
            <div class="data-card">
              <div class="data-label">Barcode Range</div>
              <div class="data-value" style="font-family: monospace;">${barcodeDisplay}</div>
            </div>
            <div class="data-card">
              <div class="data-label">Courier Partner</div>
              <div class="data-value">${order.courierName || "DTDC Express"}</div>
            </div>
            <div class="data-card">
              <div class="data-label">Tracking Number / ID</div>
              <div class="data-value highlight">${order.trackingId || "—"}</div>
            </div>
            <div class="data-card">
              <div class="data-label">Dispatch Status</div>
              <div class="data-value success">DISPATCHED (IN TRANSIT)</div>
            </div>
            <div class="data-card">
              <div class="data-label">Dispatch Date</div>
              <div class="data-value">${updatedDateStr}</div>
            </div>
          </div>

          <!-- Lifecycle Audit -->
          <div class="section-title">4. Order Lifecycle & Audit History</div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px;">
            <thead>
              <tr style="background: #F1F5F9; color: #475569; text-transform: uppercase; font-size: 10px; text-align: left;">
                <th style="padding: 6px 10px;">Stage</th>
                <th style="padding: 6px 10px;">Milestone Event</th>
                <th style="padding: 6px 10px;">Department</th>
                <th style="padding: 6px 10px;">Timestamp</th>
                <th style="padding: 6px 10px;">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-top: 1px solid #E2E8F0;">
                <td style="padding: 6px 10px;"><strong>Stage 1</strong></td>
                <td style="padding: 6px 10px;">Sales Order Registration</td>
                <td style="padding: 6px 10px;">Sales Admin</td>
                <td style="padding: 6px 10px;">${createdDateStr}</td>
                <td style="padding: 6px 10px;"><span class="status-tag">COMPLETED</span></td>
              </tr>
              <tr style="border-top: 1px solid #E2E8F0;">
                <td style="padding: 6px 10px;"><strong>Stage 2</strong></td>
                <td style="padding: 6px 10px;">Manufacturing & Battery Assembly</td>
                <td style="padding: 6px 10px;">Production Dept</td>
                <td style="padding: 6px 10px;">${createdDateStr}</td>
                <td style="padding: 6px 10px;"><span class="status-tag">COMPLETED</span></td>
              </tr>
              <tr style="border-top: 1px solid #E2E8F0;">
                <td style="padding: 6px 10px;"><strong>Stage 3</strong></td>
                <td style="padding: 6px 10px;">Quality Assurance & Inspection Test</td>
                <td style="padding: 6px 10px;">QA Division</td>
                <td style="padding: 6px 10px;">${updatedDateStr}</td>
                <td style="padding: 6px 10px;"><span class="status-tag">PASSED</span></td>
              </tr>
              <tr style="border-top: 1px solid #E2E8F0;">
                <td style="padding: 6px 10px;"><strong>Stage 4</strong></td>
                <td style="padding: 6px 10px;">SCM Barcode Mapping & Invoice Generation</td>
                <td style="padding: 6px 10px;">Supply Chain (SCM)</td>
                <td style="padding: 6px 10px;">${updatedDateStr}</td>
                <td style="padding: 6px 10px;"><span class="status-tag">COMPLETED</span></td>
              </tr>
              <tr style="border-top: 1px solid #E2E8F0;">
                <td style="padding: 6px 10px;"><strong>Stage 5</strong></td>
                <td style="padding: 6px 10px;">Logistics Handover & Carrier Dispatch</td>
                <td style="padding: 6px 10px;">SCM Logistics</td>
                <td style="padding: 6px 10px;">${updatedDateStr}</td>
                <td style="padding: 6px 10px;"><span class="status-tag">DISPATCHED</span></td>
              </tr>
            </tbody>
          </table>

          <!-- Footer -->
          <div class="footer">
            <div style="font-size: 11px; color: #64748B;">
              <strong>Bentork LLP - Official System Record</strong><br/>
              This is an authentic computer-generated report. Confidential.<br/>
              Page 1 of 1
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div style="font-size: 11px; font-weight: 700; color: #1E3A8A;">Authorized Signatory</div>
              <div style="font-size: 10px; color: #64748B;">Bentork LLP Systems</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
