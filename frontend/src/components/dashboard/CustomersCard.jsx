import "./CustomersCard.css";
import { Users, Target, CheckCircle, Percent } from "lucide-react";

export default function CustomersCard({
  target = 0,
  achieved = 0,
  percentage = 0,
}) {
  return (
    <div className="customers-card">

      <div className="customers-title">
        <Users size={22} />
        <span>العملاء</span>
      </div>

      <div className="customers-row">
        <div className="customers-label">
          <Target size={18} />
          <span>الهدف الشهري</span>
        </div>

        <strong>{target}</strong>
      </div>

      <div className="customers-row">
        <div className="customers-label">
          <CheckCircle size={18} />
          <span>المحقق</span>
        </div>

        <strong>{achieved}</strong>
      </div>

      <div className="customers-row">
        <div className="customers-label">
          <Percent size={18} />
          <span>النسبة</span>
        </div>

        <strong>{percentage}%</strong>
      </div>

    </div>
  );
}