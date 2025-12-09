import React from "react";

// ✅ Import icons
import totalIcon from "../../assets/icons/stafficon/blue.svg";
import adminIcon from "../../assets/icons/stafficon/toatl.svg";
import managerIcon from "../../assets/icons/stafficon/yellow.svg";
import activeIcon from "../../assets/icons/stafficon/red.svg";

const StaffSummaryCards = ({ stats = {} }) => {
  const cards = [
    { title: "Total Staff", value: stats.totalStaff || "...", icon: totalIcon },
    { title: "Administrators", value: stats.admins || "...", icon: adminIcon },
    { title: "Managers", value: stats.managers || "...", icon: managerIcon },
    { title: "Active", value: stats.active || "...", icon: activeIcon },
  ];

  return (
    <>
      <style>
        {`
          .cards-container {
            width: 100%;
            display: flex;
            justify-content: space-between; /* ✅ spread across full width */
            gap: 15px;
          }

          .card-box {
            flex: 1; /* ✅ each card grows equally */
            max-width: 230px; /* prevent too wide */
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: 14px;
            
            padding: 12px 20px;
            background-color: white;
            border: 0.2px solid #ddd;
            height: 90px;
            font-family: Roboto, sans-serif;
          }

          .card-title {
            font-size: 12px;
            line-height: 160%;
            font-weight: 400;
          }

          .card-value {
            font-size: 24px;
            line-height: 160%;
            font-weight: 600;
          }

          .card-icon {
            width: 22px;
            height: 22px;
          }
        `}
      </style>

      <div className="cards-container">
        {cards.map((card, index) => (
          <div className="card-box" key={index}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className="card-title">{card.title}</span>
              <span className="card-value">{card.value}</span>
            </div>
            <img
              src={card.icon}
              alt={`${card.title} icon`}
              className="card-icon"
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default StaffSummaryCards;
