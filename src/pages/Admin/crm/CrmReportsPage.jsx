import React, { useState, useEffect, useCallback } from "react";
import {
  Download,
  TrendingUp,
  BarChart2,
  DollarSign,
  Award,
  Users,
  RefreshCw,
  Printer,
  AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie
} from "recharts";
import { Toast } from "../../../components/common/Toast";
import { crmService } from "../../../services/crmService";

export default function CrmReportsPage() {
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversionReport, setConversionReport] = useState(null);
  const [revenueReport, setRevenueReport] = useState(null);
  const [pipelineData, setPipelineData] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [campaignData, setCampaignData] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchReportsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [convRes, revRes, leadsRes, oppsRes, campRes] = await Promise.all([
        crmService.getConversionReport().catch(() => null),
        crmService.getRevenueReport().catch(() => null),
        crmService.getAllLeads().catch(() => []),
        crmService.getAllOpportunities().catch(() => []),
        crmService.getAllCampaigns().catch(() => [])
      ]);

      setConversionReport(convRes);
      setRevenueReport(revRes);

      // Compute pipeline by stage from real opportunities
      const opps = Array.isArray(oppsRes) ? oppsRes : [];
      const stages = [
        { name: "Qualified", count: opps.filter((o) => (o.stage || "").toUpperCase() === "QUALIFIED").length },
        { name: "Req.", count: opps.filter((o) => (o.stage || "").toUpperCase() === "REQUIREMENT").length },
        { name: "Proposal", count: opps.filter((o) => (o.stage || "").toUpperCase() === "PROPOSAL").length },
        { name: "Negotiation", count: opps.filter((o) => (o.stage || "").toUpperCase() === "NEGOTIATION").length },
        { name: "Won", count: opps.filter((o) => (o.stage || "").toUpperCase() === "WON").length }
      ];
      setPipelineData(stages);

      // Compute top lead sources from real leads
      const leads = Array.isArray(leadsRes) ? leadsRes : [];
      const sourceCounts = {};
      leads.forEach((l) => {
        const src = l.source || "Other";
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      });
      const totalLeads = leads.length;
      const computedSources =
        totalLeads > 0
          ? Object.keys(sourceCounts).map((src, i) => ({
              name: src,
              percent: Math.round((sourceCounts[src] / totalLeads) * 100),
              color: ["#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#CBD5E1"][i % 5]
            }))
          : [];

      setLeadSources(computedSources);

      // Real campaigns summary
      const camps = Array.isArray(campRes) ? campRes : [];
      setCampaignData(
        camps.map((c) => ({
          campaign: c.name || c.title || "Campaign",
          sent: c.recipients || c.targetAudienceCount || 0,
          responses: c.responses || c.openedCount || 0,
          interested: c.interestedCount || 0,
          quotes: c.quotesCount || c.quotes || 0,
          won: c.wonCount || c.convertedCount || 0
        }))
      );
    } catch (err) {
      console.error("Failed to load reports:", err);
      setError(err.message || "Failed to load CRM reports data");
      showToast(err.message || "Failed to load CRM reports data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  // Real client export options: Native Print & CSV Export
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Leads", conversionReport?.totalLeads ?? 0],
      ["Qualified Leads", conversionReport?.qualifiedLeads ?? 0],
      ["Quotes Sent", revenueReport?.quotesSent ?? 0],
      ["Orders Closed", revenueReport?.ordersClosed ?? 0],
      ["Conversion Rate (%)", `${conversionReport?.conversionRatePercentage ?? 0}%`],
      [],
      ["Pipeline Stage", "Count"],
      ...pipelineData.map((p) => [p.name, p.count]),
      [],
      ["Lead Source", "Share (%)"],
      ...leadSources.map((s) => [s.name, `${s.percent}%`])
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((r) => r.map((c) => `"${c ?? ""}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Downloaded CRM Sales Summary CSV", "success");
  };

  return (
    <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        .crm-rep-kpis {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }
        .crm-rep-charts {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        @media (max-width: 1200px) {
          .crm-rep-kpis {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 900px) {
          .crm-rep-charts {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 600px) {
          .crm-rep-kpis {
            grid-template-columns: 1fr;
          }
        }
        .crm-rep-skeleton {
          height: 14px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: crmPulse 1.5s infinite;
          border-radius: 4px;
        }
        @keyframes crmPulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
            Reports & Analytics
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
            Management visibility into sales execution, funnel velocity and conversion metrics
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={fetchReportsData}
            disabled={loading}
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #CBD5E1",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handlePrint}
            style={{
              padding: "9px 14px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #CBD5E1",
              fontSize: "13px",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Printer size={15} />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              backgroundColor: "#2563EB",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)"
            }}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && !loading && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#991B1B",
            fontSize: "13px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={16} color="#DC2626" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchReportsData}
            style={{
              padding: "4px 12px",
              borderRadius: "6px",
              backgroundColor: "#DC2626",
              color: "#fff",
              border: "none",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 5 Top KPI Cards */}
      <div className="crm-rep-kpis">
        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Total Leads</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
            {conversionReport?.totalLeads ?? 0}
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Qualified</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#2563EB", marginTop: "4px" }}>
            {conversionReport?.qualifiedLeads ?? 0}
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Quotes Sent</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#D97706", marginTop: "4px" }}>
            {revenueReport?.quotesSent ?? 0}
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Orders Closed</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#16A34A", marginTop: "4px" }}>
            {revenueReport?.ordersClosed ?? 0}
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Conversion Rate</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#16A34A", marginTop: "4px" }}>
            {conversionReport?.conversionRatePercentage != null ? `${conversionReport.conversionRatePercentage}%` : "0%"}
          </div>
        </div>
      </div>

      {/* 2 Middle Charts */}
      <div className="crm-rep-charts">
        {/* Chart 1: Pipeline by Stage */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #E2E8F0",
            padding: "20px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
              Pipeline by Stage
            </h3>
          </div>
          <div style={{ width: "100%", height: 220 }}>
            {loading ? (
              <div className="crm-rep-skeleton" style={{ width: "100%", height: "200px", borderRadius: "8px" }} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                  <Tooltip
                    formatter={(val) => [`${val} Deals`, "Volume"]}
                    contentStyle={{ backgroundColor: "#1E293B", borderRadius: "8px", color: "#fff", border: "none" }}
                  />
                  <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Top Lead Sources */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #E2E8F0",
            padding: "20px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
              Lead Inflow by Source
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", justifyContent: "center", height: "220px" }}>
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="crm-rep-skeleton" style={{ width: "80px", height: "12px", marginBottom: "4px" }} />
                  <div className="crm-rep-skeleton" style={{ width: "100%", height: "8px" }} />
                </div>
              ))
            ) : leadSources.length > 0 ? (
              leadSources.map((item, idx) => (
                <div key={idx}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#334155", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    <span>{item.percent}%</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", backgroundColor: "#F1F5F9", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${item.percent}%`, height: "100%", backgroundColor: item.color, borderRadius: "4px" }} />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", color: "#64748B", fontSize: "13px" }}>
                No lead sources recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
          overflow: "hidden"
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
            Campaign Conversion Performance
          </h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B" }}>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>CAMPAIGN NAME</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>RECIPIENTS</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>RESPONSES</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>QUOTES</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>ORDERS WON</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2].map((i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "14px 16px" }}><div className="crm-rep-skeleton" style={{ width: "160px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-rep-skeleton" style={{ width: "50px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-rep-skeleton" style={{ width: "50px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-rep-skeleton" style={{ width: "50px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-rep-skeleton" style={{ width: "50px" }} /></td>
                  </tr>
                ))
              ) : campaignData.length > 0 ? (
                campaignData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0F172A" }}>{row.campaign}</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{row.sent}</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{row.responses}</td>
                    <td style={{ padding: "12px 16px", color: "#2563EB", fontWeight: 600 }}>{row.quotes}</td>
                    <td style={{ padding: "12px 16px", color: "#16A34A", fontWeight: 600 }}>{row.won}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>
                    No campaigns logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
