import "./StatCard.css";

export default function StatCard({
    title,
    value,
    icon,
    color = "primary",
}) {

    return (
        <div className={`stat-card ${color}`}>

            <div className="stat-icon">
                {icon}
            </div>

            <div className="stat-content">

                <h4>{title}</h4>

                <h2>{value}</h2>

            </div>

        </div>
    );

}