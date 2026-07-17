import React from "react";

const AnimatedNumber = ({ value }) => {
  const [current, setCurrent] = React.useState(0);
  React.useEffect(() => {
    const target = parseInt(value, 10) || 0;
    if (target === 0) {
      setCurrent(0);
      return;
    }
    let start = 0;
    const duration = 400; // ms
    const stepTime = Math.max(Math.floor(duration / target), 15);
    const timer = setInterval(() => {
      start += 1;
      setCurrent(start);
      if (start >= target) {
        setCurrent(target);
        clearInterval(timer);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <>{current}</>;
};

const StaffSummaryCards = ({ stats = {} }) => {
  const cards = [
    {
      title: "Administrators",
      value: stats.admins || "0",
      color: "#22c55e",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    },
    {
      title: "Support Staff",
      value: stats.staff || "0",
      color: "#3b82f6",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
  ];

  return (
    <>
      <style>
        {`
          .cards-container {
            width: 100%;
            display: flex;
            gap: 24px;
            margin-bottom: 24px;
            font-family: 'Lexend', sans-serif;
          }

          .card-box {
            flex: 1;
            background-color: white;
            border-radius: 16px;
            padding: 24px 32px;
            border: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 110px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease;
          }

          .card-box:hover {
            transform: translateY(-5px) scale(1.02);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
            border-color: #10b981;
          }

          .card-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .card-title {
            font-size: 13px;
            color: #6B7280;
            font-weight: 500;
          }

          .card-value {
            font-size: 32px;
            font-weight: 700;
            color: #111827;
            line-height: 1.1;
          }

          .card-icon-container {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}
      </style>

      <div className="cards-container">
        {cards.map((card, index) => (
          <div className="card-box" key={index}>
            <div className="card-info">
              <span className="card-title">{card.title}</span>
              <span className="card-value"><AnimatedNumber value={card.value} /></span>
            </div>
            <div className="card-icon-container" style={{ background: `${card.color}15` }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default StaffSummaryCards;

