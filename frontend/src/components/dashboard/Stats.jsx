import {
  DollarSign,
  Users,
  FileText,
  Target,
} from "lucide-react";

import StatCard from "../common/StatCard";

export default function Stats({
  reports,
  sales,
  customers,
  target,
}) {
  return (
    <div className="stats-grid">

      <StatCard
        title="Sales"
        value={sales}
        color="primary"
        icon={<DollarSign size={24} />}
      />

      <StatCard
        title="Customers"
        value={customers}
        color="success"
        icon={<Users size={24} />}
      />

      <StatCard
        title="Reports"
        value={reports}
        color="warning"
        icon={<FileText size={24} />}
      />

      <StatCard
        title="Target"
        value={`${target}%`}
        color="danger"
        icon={<Target size={24} />}
      />

    </div>
  );
}