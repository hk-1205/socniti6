const { prisma } = require("@socniti/database");
const { toSlug, EVENT_CATEGORIES } = require("@socniti/shared");
const { distanceInKm } = require("../utils/geo");

const serializeEvent = (event, viewerCoordinates) => {
  const base = {
    id: event.id,
    title: event.title,
    slug: event.slug,
    description: event.description,
    category: event.category,
    imageUrl: event.imageUrl || null,
    organizerId: event.organizerId,
    organizerName: event.organizerName || null,
    locationName: event.locationName,
    address: event.address || null,
    city: event.city || null,
    state: event.state || null,
    coordinates: { lat: event.lat, lng: event.lng },
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    maxParticipants: event.maxParticipants,
    currentParticipants: event.currentParticipants,
    waitlistCount: event.waitlistCount,
    status: event.status,
    donationNeeds: event.donationNeeds || [],
    averageRating: event.averageRating,
    totalReviews: event.totalReviews,
    createdAt: event.createdAt,
    participants: (event.participants || []).filter(p => p.status === "joined").map(p => ({
        userId: p.userId,
        fullName: p.fullName || null,
        email: p.email || null,
        joinedAt: p.joinedAt
    })),
    waitlist: (event.participants || []).filter(p => p.status === "waitlist").map(p => ({
        userId: p.userId,
        fullName: p.fullName || null,
        email: p.email || null,
        joinedAt: p.joinedAt
    }))
  };

  if (viewerCoordinates?.lat && viewerCoordinates?.lng) {
    base.distanceKm = distanceInKm(
      viewerCoordinates.lat,
      viewerCoordinates.lng,
      event.lat,
      event.lng
    );
  }

  return base;
};

const listEvents = async (req, res) => {
  const { search, category, city, status, date, lat, lng, maxDistanceKm, organizerId } = req.query;

  const where = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } }
    ];
  }
  if (category) where.category = category;
  if (city) where.city = city;
  if (status) where.status = status;
  if (organizerId) where.organizerId = organizerId;
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.startsAt = { gte: start, lt: end };
  }

  const events = await prisma.event.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: { participants: true, donationNeeds: true }
  });

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
  const event = await prisma.event.findUnique({
      where: { slug: req.params.slug },
      include: { participants: true, donationNeeds: true }
  });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  return res.json({ event: serializeEvent(event) });
};

const createEvent = async (req, res) => {
  try {
      const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role === "organizer" && !user.isOrganizerApproved) {
          return res.status(403).json({ message: "Your organizer account must be verified by an admin." });
      }

      const slugBase = toSlug(req.body.title);
      const slug = `${slugBase}-${Date.now().toString().slice(-6)}`;

      const event = await prisma.event.create({
          data: {
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
              lat: req.body.coordinates.lat,
              lng: req.body.coordinates.lng,
              startsAt: new Date(req.body.startsAt),
              endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null,
              maxParticipants: req.body.maxParticipants || 50,
              status: req.body.status || "upcoming",
              donationNeeds: {
                  create: (req.body.donationNeeds || []).map(need => ({
                      item: need.item,
                      quantity: need.quantity,
                      fulfilled: need.fulfilled || 0
                  }))
              }
          },
          include: { participants: true, donationNeeds: true }
      });

      return res.status(201).json({
          message: "Event created",
          event: serializeEvent(event)
      });
  } catch (error) {
      return res.status(500).json({ message: error.message });
  }
};

const updateEvent = async (req, res) => {
  let event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  if (event.organizerId !== req.user.sub) {
    return res.status(403).json({ message: "Only the organizer can update this event" });
  }

  const updateData = {};
  if (req.body.title) updateData.title = req.body.title;
  if (req.body.description) updateData.description = req.body.description;
  if (req.body.category) updateData.category = req.body.category;
  if (req.body.imageUrl !== undefined) updateData.imageUrl = req.body.imageUrl;
  if (req.body.locationName) updateData.locationName = req.body.locationName;
  if (req.body.address !== undefined) updateData.address = req.body.address;
  if (req.body.city !== undefined) updateData.city = req.body.city;
  if (req.body.state !== undefined) updateData.state = req.body.state;
  if (req.body.coordinates) {
      updateData.lat = req.body.coordinates.lat;
      updateData.lng = req.body.coordinates.lng;
  }
  if (req.body.startsAt) updateData.startsAt = new Date(req.body.startsAt);
  if (req.body.endsAt !== undefined) updateData.endsAt = req.body.endsAt ? new Date(req.body.endsAt) : null;
  if (req.body.maxParticipants) updateData.maxParticipants = req.body.maxParticipants;
  if (req.body.status) updateData.status = req.body.status;

  if (req.body.donationNeeds) {
      await prisma.donationNeed.deleteMany({ where: { eventId: event.id } });
      updateData.donationNeeds = {
          create: req.body.donationNeeds.map(need => ({
              item: need.item,
              quantity: need.quantity,
              fulfilled: need.fulfilled || 0
          }))
      };
  }

  event = await prisma.event.update({
      where: { id: event.id },
      data: updateData,
      include: { participants: true, donationNeeds: true }
  });

  return res.json({
    message: "Event updated",
    event: serializeEvent(event)
  });
};

const deleteEvent = async (req, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  if (event.organizerId !== req.user.sub) {
    return res.status(403).json({ message: "Only the organizer can delete this event" });
  }

  await prisma.event.delete({ where: { id: event.id } });
  return res.json({ message: "Event deleted" });
};

const registerForEvent = async (req, res) => {
  let event = await prisma.event.findUnique({ 
      where: { slug: req.params.slug },
      include: { participants: true, donationNeeds: true }
  });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const alreadyJoined = event.participants.some((p) => p.userId === req.user.sub && p.status !== "cancelled");
  if (alreadyJoined) {
    return res.status(409).json({ message: "You are already registered for this event" });
  }

  let participantStatus = "joined";
  let message = "Registration successful";
  let updateData = {};

  if (event.currentParticipants < event.maxParticipants) {
    updateData.currentParticipants = { increment: 1 };
  } else {
    participantStatus = "waitlist";
    updateData.waitlistCount = { increment: 1 };
    message = "Added to waitlist";
  }

  await prisma.participant.upsert({
      where: {
          eventId_userId: {
              eventId: event.id,
              userId: req.user.sub
          }
      },
      update: {
          status: participantStatus,
          fullName: req.body.fullName || "",
          email: req.body.email || ""
      },
      create: {
          eventId: event.id,
          userId: req.user.sub,
          status: participantStatus,
          fullName: req.body.fullName || "",
          email: req.body.email || ""
      }
  });

  event = await prisma.event.update({
      where: { id: event.id },
      data: updateData,
      include: { participants: true, donationNeeds: true }
  });

  return res.json({
    message,
    event: serializeEvent(event)
  });
};

const cancelRegistration = async (req, res) => {
  let event = await prisma.event.findUnique({ 
      where: { slug: req.params.slug },
      include: { participants: { orderBy: { joinedAt: 'asc' } } }
  });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const participant = event.participants.find((p) => p.userId === req.user.sub && p.status !== "cancelled");
  if (!participant) {
    return res.status(404).json({ message: "Registration not found" });
  }

  let eventUpdateData = {};

  if (participant.status === "joined") {
      eventUpdateData.currentParticipants = { decrement: 1 };
      
      const firstWaitlist = event.participants.find(p => p.status === "waitlist");
      if (firstWaitlist) {
          await prisma.participant.update({
              where: { id: firstWaitlist.id },
              data: { status: "joined" }
          });
          eventUpdateData.currentParticipants = { increment: 1 };
          eventUpdateData.waitlistCount = { decrement: 1 };
      }
  } else if (participant.status === "waitlist") {
      eventUpdateData.waitlistCount = { decrement: 1 };
  }

  await prisma.participant.update({
      where: { id: participant.id },
      data: { status: "cancelled" }
  });

  event = await prisma.event.update({
      where: { id: event.id },
      data: eventUpdateData,
      include: { participants: true, donationNeeds: true }
  });

  return res.json({
    message: "Registration cancelled",
    event: serializeEvent(event)
  });
};

const getOrganizerDashboard = async (req, res) => {
  const events = await prisma.event.findMany({ 
      where: { organizerId: req.user.sub },
      orderBy: { startsAt: 'asc' },
      include: { participants: true, donationNeeds: true }
  });

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
