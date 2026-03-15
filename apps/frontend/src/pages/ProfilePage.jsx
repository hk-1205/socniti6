import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-bold text-ink">Profile</h1>
        <p className="mt-2 text-sm text-ink/70">
          This is your profile information. Use the settings page to update account details.
        </p>

        {user ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-ink/80">Name</h2>
              <p className="mt-1 text-lg font-semibold text-ink">{user.fullName}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-ink/80">Role</h2>
              <p className="mt-1 text-lg font-semibold text-ink">{user.role}</p>
            </div>
          </div>
        ) : (
          <p className="mt-8 text-sm text-ink/70">Loading profile...</p>
        )}
      </div>
    </div>
  );
}
