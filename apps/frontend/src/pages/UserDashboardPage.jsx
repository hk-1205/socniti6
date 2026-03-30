import { useAuth } from "../context/AuthContext";

export default function UserDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-[2rem] bg-white p-8 shadow-soft">
        <h1 className="font-display text-4xl font-bold text-ink">
          Welcome back{user?.fullName ? `, ${user.fullName}` : ""}
        </h1>
        <p className="mt-3 text-ink/70">
          This is the user dashboard shell. We&rsquo;ll expand it with attended events, donation
          history, feedback history, and notification preferences next.
        </p>
      </div>
    </div>
  );
}
