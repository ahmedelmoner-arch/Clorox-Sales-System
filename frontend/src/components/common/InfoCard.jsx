import "./InfoCard.css";

export default function InfoCard({
  icon,
  title,
  rows = []
}) {
  return (
    <div className="info-card">

      <div className="info-card-title">
        {icon}
        <span>{title}</span>
      </div>

      {rows.map((row, index) => (
        <div
          className="info-row"
          key={index}
        >
          <span>{row.label}</span>

          <strong>{row.value}</strong>
        </div>
      ))}

    </div>
  );
}