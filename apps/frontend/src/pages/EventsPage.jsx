import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { eventApi } from "../lib/api";
import { Plus, MapPin, Calendar, Users, UserPlus, Heart, X, Loader2 } from "lucide-react";
import CreateEventModal from "../components/CreateEventModal";
import DonationModal from "../components/DonationModal";
import toast from "react-hot-toast";

const SAMPLE_EVENTS = [
  {
    id: "sample-1", title: "Eye Donation Awareness Camp",
    description: "Join us for an eye donation awareness camp. Learn about the importance of eye donation and pledge to donate your eyes. Free eye checkup available.",
    category: "Healthcare", locationName: "Lions Club Community Center", city: "Mumbai", state: "Maharashtra",
    startsAt: "2026-04-15T10:00:00Z", currentParticipants: 45, maxParticipants: 100, slug: "eye-donation-awareness-camp-mumbai", isSample: true
  },
  {
    id: "sample-2", title: "Juhu Beach Cleanup Drive",
    description: "Help us clean Juhu Beach and make it plastic-free. Bring your friends and family for a morning of community service. Gloves and bags provided.",
    category: "Environment", locationName: "Juhu Beach", city: "Mumbai", state: "Maharashtra",
    startsAt: "2026-04-20T07:00:00Z", currentParticipants: 78, maxParticipants: 150, slug: "beach-cleanup-drive-juhu", isSample: true
  },
  {
    id: "sample-3", title: "Free Medical Health Camp",
    description: "Free health checkup for underprivileged communities. General screening, blood pressure, diabetes testing, and doctor consultations available.",
    category: "Healthcare", locationName: "Government School Ground", city: "Delhi", state: "Delhi",
    startsAt: "2026-04-18T09:00:00Z", currentParticipants: 120, maxParticipants: 200, slug: "free-medical-camp-delhi", isSample: true
  },
  {
    id: "sample-4", title: "Tree Plantation Drive",
    description: "Plant 1000 trees in one day! Join our mission to make Bangalore greener. Saplings and tools will be provided. Refreshments included.",
    category: "Environment", locationName: "Cubbon Park", city: "Bangalore", state: "Karnataka",
    startsAt: "2026-04-25T06:30:00Z", currentParticipants: 234, maxParticipants: 500, slug: "tree-plantation-drive-bangalore", isSample: true
  },
  {
    id: "sample-5", title: "Blood Donation Camp",
    description: "Donate blood, save lives. Organized by Indian Red Cross Society. All blood groups needed. Certificate of appreciation provided.",
    category: "Healthcare", locationName: "City Hospital", city: "Pune", state: "Maharashtra",
    startsAt: "2026-04-22T08:00:00Z", currentParticipants: 67, maxParticipants: 100, slug: "blood-donation-camp-pune", isSample: true
  },
  {
    id: "sample-6", title: "Street Dog Vaccination Drive",
    description: "Help vaccinate street dogs against rabies. Veterinary team present. Volunteers needed for handling and documentation.",
    category: "Animal Welfare", locationName: "Sector 15 Market", city: "Noida", state: "Uttar Pradesh",
    startsAt: "2026-04-28T07:00:00Z", currentParticipants: 23, maxParticipants: 50, slug: "street-dog-vaccination-noida", isSample: true
  }
];

const categoryColors = {
  Healthcare: "bg-ember/10 text-ember",
  Environment: "bg-leaf/10 text-leaf",
  "Animal Welfare": "bg-clay/10 text-clay",
  Education: "bg-ink/10 text-ink",
  "Community Service": "bg-leaf/10 text-leaf",
  "Disaster Relief": "bg-ember/10 text-ember",
  Other: "bg-ink/10 text-ink"
};

// Join Event Modal
function JoinEventModal({ event, onClose, onSuccess }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!user) { toast.error("Please login to register"); navigate("/login"); return; }
    if (event.isSample) { toast.success("Registered for event! (Demo mode)"); onSuccess(); onClose(); return; }
    setLoading(true);
    try {
      const res = await eventApi.post(`/api/events/${event.slug}/register`, {
        fullName: user.fullName, email: user.email
      });
      toast.success(res.data.message || "Registered successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Registration failed");
    } finally { setLoading(false); }
  };

  const isFull = event.currentParticipants >= event.maxParticipants;
  const spotsLeft = event.maxParticipants - event.currentParticipants;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-soft">
        <div className="border-b border-ink/10 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${categoryColors[event.category] || "bg-leaf/10 text-leaf"}`}>
                {event.category}
              </span>
              <h2 className="font-display text-xl font-bold text-ink mt-2">{event.title}</h2>
            </div>
            <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-mist">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="p-8 space-y-4">
          <p className="text-sm text-ink/70">{event.description}</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-ink/70"><MapPin size={16} className="text-leaf" /><span>{event.locationName}, {event.city}</span></div>
            <div className="flex items-center gap-2 text-ink/70"><Calendar size={16} className="text-leaf" /><span>{new Date(event.startsAt).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span></div>
            <div className="flex items-center gap-2 text-ink/70"><Users size={16} className="text-leaf" />
              <span>{event.currentParticipants} / {event.maxParticipants} registered
                {!isFull && <span className="ml-1 text-leaf font-semibold">({spotsLeft} spots left)</span>}
              </span>
            </div>
          </div>
          {isFull && (
            <div className="rounded-2xl bg-clay/10 border border-clay/20 px-4 py-3 text-sm text-clay font-semibold text-center">
              Event is full — you'll be added to the waitlist
            </div>
          )}
          <button onClick={handleJoin} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-leaf text-white py-3 px-4 rounded-full hover:bg-leaf/90 font-semibold disabled:opacity-50 shadow-soft transition-all">
            {loading ? <><Loader2 className="h-5 w-5 animate-spin" />Registering...</> : <><UserPlus size={20} />{isFull ? "Join Waitlist" : "Confirm Registration"}</>}
          </button>
          <button onClick={onClose} className="w-full text-center text-sm text-ink/60 hover:text-ink font-semibold py-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState(SAMPLE_EVENTS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinTarget, setJoinTarget] = useState(null);
  const [donateTarget, setDonateTarget] = useState(null);
  const [joinedIds, setJoinedIds] = useState(new Set());

  const loadEvents = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      const res = await eventApi.get("/api/events", { params });
      const real = res.data.events || [];
      // Merge: keep current sample event state (preserves updated counts), append real events
      setEvents(prev => {
        const samples = prev.filter(e => e.isSample);
        return [...samples, ...real];
      });
    } catch {
      // Keep whatever is already in state on failure
    }
  }, [search, categoryFilter]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const filtered = events.filter(e =>
    (!search || e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.city?.toLowerCase().includes(search.toLowerCase())) &&
    (!categoryFilter || e.category === categoryFilter)
  );

  const categories = ["Healthcare", "Environment", "Animal Welfare", "Education", "Community Service", "Disaster Relief"];

  const handleJoinSuccess = (eventId) => {
    setJoinedIds(prev => new Set([...prev, eventId]));
    // Update participant count locally for immediate feedback
    setEvents(prev => prev.map(e =>
      e.id === eventId
        ? { ...e, currentParticipants: e.currentParticipants + 1 }
        : e
    ));
    // Also reload real events from backend (won't affect sample events since they're merged)
    loadEvents();
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink">Events</h1>
          <p className="mt-2 text-ink/70">Discover and join community events near you.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search events or city..."
            className="rounded-2xl border border-ink/15 px-4 py-2.5 text-sm focus:ring-2 focus:ring-leaf focus:border-transparent w-56" />
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="rounded-2xl border border-ink/15 px-4 py-2.5 text-sm focus:ring-2 focus:ring-leaf focus:border-transparent">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {user ? (
            <button onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-full bg-clay px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay/90 shadow-soft whitespace-nowrap">
              <Plus size={18} /> Create Event
            </button>
          ) : (
            <button onClick={() => { toast.error("Please login to create an event"); navigate("/login"); }}
              className="flex items-center gap-2 rounded-full bg-clay px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay/90 shadow-soft whitespace-nowrap">
              <Plus size={18} /> Create Event
            </button>
          )}
        </div>
      </div>

      {/* Event Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(event => {
          const isJoined = joinedIds.has(event.id);
          const isFull = event.currentParticipants >= event.maxParticipants;
          return (
            <article key={event.id} className="rounded-[1.75rem] bg-white p-6 shadow-soft flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${categoryColors[event.category] || "bg-leaf/10 text-leaf"}`}>
                  {event.category}
                </span>
                {event.isSample && (
                  <span className="rounded-full bg-mist px-2 py-0.5 text-xs text-ink/50 font-medium">Sample</span>
                )}
              </div>
              <h2 className="mt-3 font-display text-xl font-bold text-ink leading-snug">{event.title}</h2>
              <p className="mt-2 text-sm text-ink/70 line-clamp-2 flex-1">{event.description}</p>
              <div className="mt-4 space-y-1.5 text-sm text-ink/70">
                <div className="flex items-center gap-2"><MapPin size={14} className="text-leaf shrink-0" /><span className="truncate">{event.locationName}, {event.city}</span></div>
                <div className="flex items-center gap-2"><Calendar size={14} className="text-leaf shrink-0" /><span>{new Date(event.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>
                <div className="flex items-center gap-2"><Users size={14} className="text-leaf shrink-0" />
                  <span>{event.currentParticipants}/{event.maxParticipants}
                    {isFull ? <span className="ml-1 text-ember font-semibold">Full</span> : <span className="ml-1 text-leaf font-semibold">{event.maxParticipants - event.currentParticipants} left</span>}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full rounded-full bg-mist overflow-hidden">
                <div className="h-full rounded-full bg-leaf transition-all"
                  style={{ width: `${Math.min(100, (event.currentParticipants / event.maxParticipants) * 100)}%` }} />
              </div>
              {/* Action buttons */}
              <div className="mt-4 flex gap-2">
                {isJoined ? (
                  <div className="flex-1 rounded-full bg-leaf/10 border border-leaf/20 py-2 text-center text-sm font-semibold text-leaf">
                    ✓ Registered
                  </div>
                ) : (
                  <button onClick={() => setJoinTarget(event)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-leaf text-white py-2 text-sm font-semibold hover:bg-leaf/90 shadow-soft transition-all">
                    <UserPlus size={16} />{isFull ? "Waitlist" : "Join"}
                  </button>
                )}
                <button onClick={() => { if (!user) { toast.error("Please login to donate"); navigate("/login"); return; } setDonateTarget(event); }}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-clay/10 border border-clay/20 text-clay px-4 py-2 text-sm font-semibold hover:bg-clay/20 transition-all">
                  <Heart size={16} /> Donate
                </button>
                <button onClick={() => navigate(`/events/${event.slug}`)}
                  className="flex items-center justify-center rounded-full border border-ink/15 px-3 py-2 text-sm text-ink/70 hover:bg-mist transition-all">
                  View
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-ink/70 text-lg">No events found.</p>
          <p className="text-ink/50 text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      )}

      {/* Modals */}
      <CreateEventModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={loadEvents} />
      {joinTarget && <JoinEventModal event={joinTarget} onClose={() => setJoinTarget(null)} onSuccess={() => handleJoinSuccess(joinTarget.id)} />}
      {donateTarget && <DonationModal isOpen={!!donateTarget} onClose={() => setDonateTarget(null)} eventId={donateTarget.id} eventTitle={donateTarget.title} isSample={donateTarget.isSample} />}
    </div>
  );
}
