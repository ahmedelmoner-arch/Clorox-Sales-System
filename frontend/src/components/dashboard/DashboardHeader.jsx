import "./DashboardHeader.css";

export default function DashboardHeader({
  delegate = "أحمد منير",
  progress = 72,
}) {
  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="dashboard-header">

      <div className="welcome">
        👋
      </div>

      <p className="welcome-text">
        أهلاً بك
      </p>

      <h1 className="delegate-name">
        {delegate}
      </h1>

      <p className="today">
        {today}
      </p>

      <div className="progress-info">

        <span>نسبة إنجاز القطع</span>

        <span>{progress}%</span>

      </div>

      <div className="progress-bar">

        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />

      </div>

    </div>
  );
}