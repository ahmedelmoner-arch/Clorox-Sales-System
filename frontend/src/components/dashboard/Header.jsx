export default function Header({ delegate }) {

    const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

    return (
        <div className="dashboard-header">

            <div className="header-info">

                <span className="welcome">
                    👋 Good Morning
                </span>

                <h1 className="delegate-name">
                    {delegate?.name || "Delegate"}
                </h1>

                <p className="delegate-role">
                    {delegate?.role || "Sales Representative"}
                </p>

            </div>

            <div className="header-date">
                {today}
            </div>

        </div>
    );
}