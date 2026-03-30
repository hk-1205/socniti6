import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function OrganizerDashboardPage() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    api
      .get("/api/events/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then((response) => setDashboard(response.data))
      .catch(() =>
        setDashboard({ analytics: { totalEvents: 0, totalParticipants: 0, totalWaitlist: 0 }, events: [] })
      );
  }, [token]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-4xl font-bold text-ink">Organizer dashboard</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Events", dashboard?.analytics?.totalEvents ?? 0],
          ["Participants", dashboard?.analytics?.totalParticipants ?? 0],
          ["Waitlist", dashboard?.analytics?.totalWaitlist ?? 0]
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.75rem] bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-wide text-ink/50">{label}</p>
            <p className="mt-3 font-display text-4xl font-bold text-ink">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
