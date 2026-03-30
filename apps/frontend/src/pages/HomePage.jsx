import { ArrowRight, MapPinned, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const highlights = [
  {
    title: "Find events near you",
    text: "Discover social impact events within your city and eventually within a 20km radius."
  },
  {
    title: "Volunteer with trust",
    text: "Organizer profiles, role-based access, and secure auth keep the community safer."
  },
  {
    title: "Coordinate in real time",
    text: "SOCNITI is designed for live updates, attendee chats, and timely reminders."
  }
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-ink px-8 py-10 text-white shadow-soft">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
            <Sparkles size={16} />
            Build local impact together
          </span>
          <h1 className="mt-6 max-w-2xl font-display text-5xl font-extrabold leading-tight">
            Discover nearby causes, join NGO events, and turn intention into action.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80">
            SOCNITI connects volunteers, organizers, and donors through location-aware event
            discovery, community participation, and transparent coordination.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 rounded-full bg-clay px-5 py-3 font-semibold text-white"
            >
              Explore events
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white"
            >
              Join SOCNITI
            </Link>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-[2rem] bg-white p-6 shadow-soft">
            <div className="flex items-center gap-3 text-leaf">
              <MapPinned />
              <h2 className="font-display text-xl font-bold text-ink">Location-first discovery</h2>
            </div>
            <p className="mt-4 text-ink/70">
              Event cards, map-ready data, distance sorting, and route integration are baked into
              the platform design from the start.
            </p>
          </div>
          <div className="rounded-[2rem] bg-clay p-6 text-white shadow-soft">
            <div className="flex items-center gap-3">
              <ShieldCheck />
              <h2 className="font-display text-xl font-bold">Built with trust in mind</h2>
            </div>
            <p className="mt-4 text-white/80">
              JWT auth, OTP support, role-based permissions, and organizer verification fit the
              mission-critical parts of the product.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-3">
        {highlights.map((highlight) => (
          <article key={highlight.title} className="rounded-[1.75rem] bg-white p-6 shadow-soft">
            <h3 className="font-display text-xl font-bold text-ink">{highlight.title}</h3>
            <p className="mt-3 text-ink/70">{highlight.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
