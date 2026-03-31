const Event = require("../models/Event");
const { toSlug, EVENT_CATEGORIES } = require("@socniti/shared");
const { distanceInKm } = require("../utils/geo");

const serializeEvent = (event, viewerCoordinates) => {
  const base = {
    id: event._id,
    title: event.title,
    slug: event.slug,
    description: event.description,
    category: event.category,
    imageUrl: event.imageUrl,
    organizerId: event.organizerId,
    organizerName: event.organizerName,
    locationName: event.locationName,
    address: event.address,
    city: event.city,
    state: event.state,
    coordinates: event.coordinates,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    maxParticipants: event.maxParticipants,
    currentParticipants: event.currentParticipants,
    waitlistCount: event.waitlistCount,
    status: event.status,
    donationNeeds: event.donationNeeds,
    averageRating: event.averageRating,
    totalReviews: event.totalReviews,
    createdAt: event.createdAt
  };

  if (viewerCoordinates?.lat && viewerCoordinates?.lng) {
    base.distanceKm = distanceInKm(
      viewerCoordinates.lat,
      viewerCoordinates.lng,
      event.coordinates.lat,
      event.coordinates.lng
    );
  }

  return base;
};

const listEvents = async (req, res) => {
  const { search, category, city, status, date, lat, lng, maxDistanceKm, organizerId } = req.query;

  const query = {};
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } }
    ];
  }
  if (category) query.category = category;
  if (city) query.city = city;
  if (status) query.status = status;
  if (organizerId) query.organizerId = organizerId;
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    query.startsAt = { $gte: start, $lt: end };
  }

  const events = await Event.find(query).sort({ startsAt: 1 });
  const viewerCoordinates = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
  let data = events.map((event) => serializeEvent(event, viewerCoordinates));

  if (viewerCoordinates && maxDistanceKm) {
    data = data.filter((event) => event.distanceKm <= Number(maxDistanceKm));
  }

  if (viewerCoordinates) {
    data.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  }

  return res.json({
    events: data,
    filters: {
      categories: EVENT_CATEGORIES
    }
  });
};

const getEventBySlug = async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  return res.json({ event: serializeEvent(event) });
};

const createEvent = async (req, res) => {
  const slugBase = toSlug(req.body.title);
  const slug = `${slugBase}-${Date.now().toString().slice(-6)}`;

  const event = await Event.create({
    title: req.body.title,
    slug,
    description: req.body.description,
    category: req.body.category,
    imageUrl: req.body.imageUrl || "",
    organizerId: req.user.sub,
    organizerName: req.body.organizerName || "",
    locationName: req.body.locationName,
    address: req.body.address || "",
    city: req.body.city || "",
    state: req.body.state || "",
    coordinates: req.body.coordinates,
    startsAt: req.body.startsAt,
    endsAt: req.body.endsAt,
    maxParticipants: req.body.maxParticipants || 50,
    status: req.body.status || "upcoming",
    donationNeeds: req.body.donationNeeds || []
  });

  return res.status(201).json({
    message: "Event created",
    event: serializeEvent(event)
  });
};

const updateEvent = async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  if (event.organizerId !== req.user.sub) {
    return res.status(403).json({ message: "Only the organizer can update this event" });
  }

  Object.assign(event, req.body);
  await event.save();

  return res.json({
    message: "Event updated",
    event: serializeEvent(event)
  });
};

const deleteEvent = async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  if (event.organizerId !== req.user.sub) {
    return res.status(403).json({ message: "Only the organizer can delete this event" });
  }

  await event.deleteOne();
  return res.json({ message: "Event deleted" });
};

const registerForEvent = async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const alreadyJoined = event.participants.some((participant) => participant.userId === req.user.sub);
  if (alreadyJoined) {
    return res.status(409).json({ message: "You are already registered for this event" });
  }

  const attendee = {
    userId: req.user.sub,
    fullName: req.body.fullName || "",
    email: req.body.email || ""
  };

  if (event.currentParticipants < event.maxParticipants) {
    event.participants.push(attendee);
    event.currentParticipants += 1;
  } else {
    event.waitlist.push(attendee);
    event.waitlistCount += 1;
  }

  await event.save();

  return res.json({
    message: event.currentParticipants <= event.maxParticipants ? "Registration successful" : "Added to waitlist",
    event: serializeEvent(event)
  });
};

const cancelRegistration = async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const participantIndex = event.participants.findIndex((participant) => participant.userId === req.user.sub);
  if (participantIndex >= 0) {
    event.participants.splice(participantIndex, 1);
    event.currentParticipants = Math.max(0, event.currentParticipants - 1);

    if (event.waitlist.length > 0) {
      const nextParticipant = event.waitlist.shift();
      event.participants.push(nextParticipant);
      event.currentParticipants += 1;
      event.waitlistCount = Math.max(0, event.waitlistCount - 1);
    }
  } else {
    const waitlistIndex = event.waitlist.findIndex((participant) => participant.userId === req.user.sub);
    if (waitlistIndex < 0) {
      return res.status(404).json({ message: "Registration not found" });
    }

    event.waitlist.splice(waitlistIndex, 1);
    event.waitlistCount = Math.max(0, event.waitlistCount - 1);
  }

  await event.save();

  return res.json({
    message: "Registration cancelled",
    event: serializeEvent(event)
  });
};

const getOrganizerDashboard = async (req, res) => {
  const events = await Event.find({ organizerId: req.user.sub }).sort({ startsAt: 1 });

  const analytics = events.reduce(
    (accumulator, event) => {
      accumulator.totalEvents += 1;
      accumulator.totalParticipants += event.currentParticipants;
      accumulator.totalWaitlist += event.waitlistCount;
      return accumulator;
    },
    { totalEvents: 0, totalParticipants: 0, totalWaitlist: 0 }
  );

  return res.json({
    analytics,
    events: events.map((event) => serializeEvent(event))
  });
};

module.exports = {
  listEvents,
  getEventBySlug,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
  getOrganizerDashboard
};
