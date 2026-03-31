const Event = require("../models/Event");
const { toSlug, EVENT_CATEGORIES } = require("@socniti/shared");
const { distanceInKm } = require("../utils/geo");

const serializeEvent = (event, viewerCoordinates) => {
  const base = {
    id: event._id.toString(),
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
    coordinates: event.coordinates,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    maxParticipants: event.maxParticipants,
    currentParticipants: event.currentParticipants,
    waitlistCount: event.waitlistCount,
    status: event.status,
    donationNeeds: event.donationNeeds || [],
    participants: event.participants?.map(p => ({
      userId: p.userId,
      fullName: p.fullName || null,
      email: p.email || null,
      joinedAt: p.joinedAt.toISOString()
    })) || [],
    waitlist: event.waitlist?.map(p => ({
      userId: p.userId,
      fullName: p.fullName || null,
      email: p.email || null,
      joinedAt: p.joinedAt.toISOString()
    })) || [],
    averageRating: event.averageRating || 0,
    totalReviews: event.totalReviews || 0,
    createdAt: event.createdAt.toISOString(),
    distanceKm: null
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

const resolvers = {
  Query: {
    events: async (_, args) => {
      const { search, category, city, status, date, lat, lng, maxDistanceKm, organizerId } = args;

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
      const event = await Event.findOne({ slug });
      if (!event) {
        throw new Error("Event not found");
      }
      return serializeEvent(event);
    },

    organizerDashboard: async (_, __, context) => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      const events = await Event.find({ organizerId: context.user.sub }).sort({ startsAt: 1 });

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

      const slugBase = toSlug(input.title);
      const slug = `${slugBase}-${Date.now().toString().slice(-6)}`;

      const event = await Event.create({
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
        coordinates: input.coordinates,
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        maxParticipants: input.maxParticipants || 50,
        status: "upcoming",
        donationNeeds: input.donationNeeds || []
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

      const event = await Event.findOne({ slug });
      if (!event) {
        throw new Error("Event not found");
      }

      if (event.organizerId !== context.user.sub) {
        throw new Error("Only the organizer can update this event");
      }

      // Update fields
      if (input.title) event.title = input.title;
      if (input.description) event.description = input.description;
      if (input.category) event.category = input.category;
      if (input.imageUrl !== undefined) event.imageUrl = input.imageUrl;
      if (input.locationName) event.locationName = input.locationName;
      if (input.address !== undefined) event.address = input.address;
      if (input.city !== undefined) event.city = input.city;
      if (input.state !== undefined) event.state = input.state;
      if (input.coordinates) event.coordinates = input.coordinates;
      if (input.startsAt) event.startsAt = new Date(input.startsAt);
      if (input.endsAt !== undefined) event.endsAt = input.endsAt ? new Date(input.endsAt) : null;
      if (input.maxParticipants) event.maxParticipants = input.maxParticipants;
      if (input.status) event.status = input.status;
      if (input.donationNeeds) event.donationNeeds = input.donationNeeds;

      await event.save();

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

      const event = await Event.findOne({ slug });
      if (!event) {
        throw new Error("Event not found");
      }

      if (event.organizerId !== context.user.sub) {
        throw new Error("Only the organizer can delete this event");
      }

      await event.deleteOne();

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

      const event = await Event.findOne({ slug });
      if (!event) {
        throw new Error("Event not found");
      }

      const alreadyJoined = event.participants.some((p) => p.userId === context.user.sub);
      if (alreadyJoined) {
        throw new Error("You are already registered for this event");
      }

      const attendee = {
        userId: context.user.sub,
        fullName: input?.fullName || "",
        email: input?.email || ""
      };

      let message;
      if (event.currentParticipants < event.maxParticipants) {
        event.participants.push(attendee);
        event.currentParticipants += 1;
        message = "Registration successful";
      } else {
        event.waitlist.push(attendee);
        event.waitlistCount += 1;
        message = "Added to waitlist";
      }

      await event.save();

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

      const event = await Event.findOne({ slug });
      if (!event) {
        throw new Error("Event not found");
      }

      const participantIndex = event.participants.findIndex((p) => p.userId === context.user.sub);
      if (participantIndex >= 0) {
        event.participants.splice(participantIndex, 1);
        event.currentParticipants = Math.max(0, event.currentParticipants - 1);

        // Move first waitlist person to participants
        if (event.waitlist.length > 0) {
          const nextParticipant = event.waitlist.shift();
          event.participants.push(nextParticipant);
          event.currentParticipants += 1;
          event.waitlistCount = Math.max(0, event.waitlistCount - 1);
        }
      } else {
        const waitlistIndex = event.waitlist.findIndex((p) => p.userId === context.user.sub);
        if (waitlistIndex < 0) {
          throw new Error("Registration not found");
        }

        event.waitlist.splice(waitlistIndex, 1);
        event.waitlistCount = Math.max(0, event.waitlistCount - 1);
      }

      await event.save();

      return {
        success: true,
        message: "Registration cancelled successfully",
        event: serializeEvent(event)
      };
    }
  },

  Event: {
    organizer: (event) => {
      // Return a reference to the User type from Auth Service
      return { __typename: "User", id: event.organizerId };
    }
  },

  Participant: {
    user: (participant) => {
      // Return a reference to the User type from Auth Service
      return { __typename: "User", id: participant.userId };
    }
  }
};

module.exports = resolvers;
