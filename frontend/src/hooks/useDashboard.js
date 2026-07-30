import { useEffect, useState } from "react";
import { getDashboardData } from "../services/dashboardService";

export function useDashboard() {

    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {

        async function load() {

            try {

                const data = await getDashboardData();

                setDashboard(data);

            } catch (err) {

                setError(err);

            } finally {

                setLoading(false);

            }

        }

        load();

    }, []);

    return {
        dashboard,
        loading,
        error
    };

}