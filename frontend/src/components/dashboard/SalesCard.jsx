import "./SalesCard.css";
import { Target, TrendingUp, Package } from "lucide-react";

export default function SalesCard({
  target = 0,
  achieved = 0,
  percentage = 0,
}) {
  return (
    <div className="sales-card">

      <div className="sales-title">
        <Package size={22} />
        <span>المبيعات</span>
      </div>

      <div className="sales-row">
        <div className="sales-label">
          <Target size={18} />
          <span>الهدف</span>
        </div>

        <strong>{target.toLocaleString("ar-EG")}</strong>
      </div>

      <div className="sales-row">
        <div className="sales-label">
          <Package size={18} />
          <span>المحقق</span>
        </div>

        <strong>{achieved.toLocaleString("ar-EG")}</strong>
      </div>

      <div className="sales-row">
        <div className="sales-label">
          <TrendingUp size={18} />
          <span>الإنجاز</span>
        </div>

        <strong>{percentage}%</strong>
      </div>

    </div>
  );
}