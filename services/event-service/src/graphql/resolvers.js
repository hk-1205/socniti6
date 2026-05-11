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
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    maxParticipants: event.maxParticipants,
    currentParticipants: event.currentParticipants,
    waitlistCount: event.waitlistCount,
    status: event.status,
    donationNeeds: event.donationNeeds || [],
    participants: (event.participants || []).filter(p => p.status === "joined").map(p => ({
      userId: p.userId,
      fullName: p.fullName || null,
      email: p.email || null,
      joinedAt: p.joinedAt.toISOString()
    })),
    waitlist: (event.participants || []).filter(p => p.status === "waitlist").map(p => ({
      userId: p.userId,
      fullName: p.fullName || null,
      email: p.email || null,
      joinedAt: p.joinedAt.toISOString()
    })),
    averageRating: event.averageRating || 0,
    totalReviews: event.totalReviews || 0,
    createdAt: event.createdAt.toISOString(),
    distanceKm: null
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

const resolvers = {
  Query: {
    events: async (_, args) => {
      const { search, category, city, status, date, lat, lng, maxDistanceKm, organizerId } = args;

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
        data = data.filter((event) => event.distanceKm && event.distanceKm <= Number(maxDistanceKm));
      }

      if (viewerCoordinates) {
        data.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      }

      return {
        events: data,
        filters: {
          categories: EVENT_CATEGORIES
        }
      };
    },

    event: async (_, { slug }) => {
      const event = await prisma.event.findUnique({ 
          where: { slug },
          include: { participants: true, donationNeeds: true }
      });
      if (!event) {
        throw new Error("Event not found");
      }
      return serializeEvent(event);
    },

    organizerDashboard: async (_, __, context) => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      const events = await prisma.event.findMany({ 
          where: { organizerId: context.user.sub },
          orderBy: { startsAt: 'asc' },
          include: { participants: true, donationNeeds: true }
      });

      const analytics = events.reduce(
        (acc, event) => {
          acc.totalEvents += 1;
          acc.totalParticipants += event.currentParticipants;
          acc.totalWaitlist += event.waitlistCount;
          return acc;
        },
        { totalEvents: 0, totalParticipants: 0, totalWaitlist: 0 }
      );

      return {
        analytics,
        events: events.map((event) => serializeEvent(event))
      };
    }
  },

  Mutation: {
    createEvent: async (_, { input }, context) => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      // Check if organizer is verified
      const user = await prisma.user.findUnique({ where: { id: context.user.sub } });
      if (!user) throw new Error("User not found");
      if (user.role === "organizer" && !user.isOrganizerApproved) {
        throw new Error("Your organizer account must be verified by an admin before you can create events.");
      }

      const slugBase = toSlug(input.title);
      const slug = `${slugBase}-${Date.now().toString().slice(-6)}`;

      const event = await prisma.event.create({
        data: {
          title: input.title,
          slug,
          description: input.description,
          category: input.category,
          imageUrl: input.imageUrl || "",
          organizerId: context.user.sub,
          organizerName: input.organizerName || "",
          locationName: input.locationName,
          address: input.address || "",
          city: input.city || "",
          state: input.state || "",
          lat: input.coordinates.lat,
          lng: input.coordinates.lng,
          startsAt: new Date(input.startsAt),
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          maxParticipants: input.maxParticipants || 50,
          status: "upcoming",
          donationNeeds: {
              create: (input.donationNeeds || []).map(need => ({
                  item: need.item,
                  quantity: need.quantity,
                  fulfilled: need.fulfilled || 0
              }))
          }
        },
        include: { donationNeeds: true, participants: true }
      });

      return {
        success: true,
        message: "Event created successfully",
        event: serializeEvent(event)
      };
    },

    updateEvent: async (_, { slug, input }, context) => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      let event = await prisma.event.findUnique({ where: { slug } });
      if (!event) {
        throw new Error("Event not found");
      }

      if (event.organizerId !== context.user.sub) {
        throw new Error("Only the organizer can update this event");
      }

      const updateData = {};
      if (input.title) updateData.title = input.title;
      if (input.description) updateData.description = input.description;
      if (input.category) updateData.category = input.category;
      if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
      if (input.locationName) updateData.locationName = input.locationName;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.city !== undefined) updateData.city = input.city;
      if (input.state !== undefined) updateData.state = input.state;
      if (input.coordinates) {
          updateData.lat = input.coordinates.lat;
          updateData.lng = input.coordinates.lng;
      }
      if (input.startsAt) updateData.startsAt = new Date(input.startsAt);
      if (input.endsAt !== undefined) updateData.endsAt = input.endsAt ? new Date(input.endsAt) : null;
      if (input.maxParticipants) updateData.maxParticipants = input.maxParticipants;
      if (input.status) updateData.status = input.status;

      // Note: Updating nested donationNeeds requires a deletion and recreation or complex upsert. 
      // For simplicity here we just delete existing and create new ones if provided.
      if (input.donationNeeds) {
          await prisma.donationNeed.deleteMany({ where: { eventId: event.id } });
          updateData.donationNeeds = {
              create: input.donationNeeds.map(need => ({
                  item: need.item,
                  quantity: need.quantity,
                  fulfilled: need.fulfilled || 0
              }))
          };
      }

      event = await prisma.event.update({
          where: { id: event.id },
          data: updateData,
          include: { donationNeeds: true, participants: true }
      });

      return {
        success: true,
        message: "Event updated successfully",
        event: serializeEvent(event)
      };
    },

    deleteEvent: async (_, { slug }, context) => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      const event = await prisma.event.findUnique({ where: { slug } });
      if (!event) {
        throw new Error("Event not found");
      }

      if (event.organizerId !== context.user.sub) {
        throw new Error("Only the organizer can delete this event");
      }

      await prisma.event.delete({ where: { id: event.id } });

      return {
        success: true,
        message: "Event deleted successfully",
        event: null
      };
    },

    registerForEvent: async (_, { slug, input }, context) => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      let event = await prisma.event.findUnique({ 
          where: { slug },
          include: { participants: true, donationNeeds: true }
      });
      if (!event) {
        throw new Error("Event not found");
      }

      const alreadyJoined = event.participants.some((p) => p.userId === context.user.sub && p.status !== "cancelled");
      if (alreadyJoined) {
        throw new Error("You are already registered for this event");
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

      // Upsert the participant
      await prisma.participant.upsert({
          where: {
              eventId_userId: {
                  eventId: event.id,
                  userId: context.user.sub
              }
          },
          update: {
              status: participantStatus,
              fullName: input?.fullName || "",
              email: input?.email || ""
          },
          create: {
              eventId: event.id,
              userId: context.user.sub,
              status: participantStatus,
              fullName: input?.fullName || "",
              email: input?.email || ""
          }
      });

      // Update event counts
      event = await prisma.event.update({
          where: { id: event.id },
          data: updateData,
          include: { participants: true, donationNeeds: true }
      });

      return {
        success: true,
        message,
        event: serializeEvent(event)
      };
    },

    cancelRegistration: async (_, { slug }, context) => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      let event = await prisma.event.findUnique({ 
          where: { slug },
          include: { participants: { orderBy: { joinedAt: 'asc' } } }
      });
      if (!event) {
        throw new Error("Event not found");
      }

      const participant = event.participants.find((p) => p.userId === context.user.sub && p.status !== "cancelled");
      if (!participant) {
        throw new Error("Registration not found");
      }

      let eventUpdateData = {};

      if (participant.status === "joined") {
          eventUpdateData.currentParticipants = { decrement: 1 };
          
          // Move first waitlist person to joined
          const firstWaitlist = event.participants.find(p => p.status === "waitlist");
          if (firstWaitlist) {
              await prisma.participant.update({
                  where: { id: firstWaitlist.id },
                  data: { status: "joined" }
              });
              eventUpdateData.currentParticipants = { increment: 1 }; // cancels out decrement
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

      return {
        success: true,
        message: "Registration cancelled successfully",
        event: serializeEvent(event)
      };
    }
  },

  Event: {
    organizer: (event) => {
      return { __typename: "User", id: event.organizerId };
    }
  },

  Participant: {
    user: (participant) => {
      return { __typename: "User", id: participant.userId };
    }
  }
};

module.exports = resolvers;
