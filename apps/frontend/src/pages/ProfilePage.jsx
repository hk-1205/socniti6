import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Shield, Camera, Edit2, Save, X, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    bio: user?.bio || "",
    location: user?.location || "",
    phone: user?.phone || ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    // TODO: Implement API call to update profile
    toast.success("Profile updated successfully!");
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Logged out successfully");
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-[2rem] bg-white p-8 shadow-soft">
          <p className="text-ink/70">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Profile Header */}
      <div className="rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            {/* Profile Picture */}
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-leaf text-3xl font-bold text-white">
                {user.fullName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-clay text-white shadow-soft hover:bg-clay/90">
                <Camera size={16} />
              </button>
            </div>

            {/* User Info */}
            <div>
              <h1 className="font-display text-3xl font-bold text-ink">{user.fullName}</h1>
              <p className="mt-1 text-ink/70">@{user.username}</p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-leaf/10 px-3 py-1 text-sm font-semibold text-leaf">
                <Shield size={14} />
                {user.role}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90"
              >
                <Edit2 size={16} />
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink hover:bg-mist"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded-full bg-leaf px-4 py-2 text-sm font-semibold text-white hover:bg-leaf/90"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Details */}
        <div className="mt-8 space-y-6">
          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              <Mail className="inline h-4 w-4 mr-2" />
              Email Address
            </label>
            <div className="rounded-2xl border border-ink/15 bg-mist px-4 py-3 text-ink/70">
              {user.email}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              <User className="inline h-4 w-4 mr-2" />
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
              />
            ) : (
              <div className="rounded-2xl border border-ink/15 px-4 py-3 text-ink">
                {formData.fullName || "Not provided"}
              </div>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Bio</label>
            {isEditing ? (
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                placeholder="Tell us about yourself..."
              />
            ) : (
              <div className="rounded-2xl border border-ink/15 px-4 py-3 text-ink">
                {formData.bio || "No bio added yet"}
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Location</label>
            {isEditing ? (
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                placeholder="City, Country"
              />
            ) : (
              <div className="rounded-2xl border border-ink/15 px-4 py-3 text-ink">
                {formData.location || "Not provided"}
              </div>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Phone Number</label>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                placeholder="+91 98765 43210"
              />
            ) : (
              <div className="rounded-2xl border border-ink/15 px-4 py-3 text-ink">
                {formData.phone || "Not provided"}
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 border-t border-ink/10 pt-8">
          <h2 className="font-display text-lg font-bold text-ink mb-4">Account Actions</h2>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-full border border-ember/20 bg-ember/10 px-4 py-2 text-sm font-semibold text-ember hover:bg-ember/20"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
