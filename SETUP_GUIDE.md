# SOCNITI Setup Guide

## Prerequisites

Before running the project, ensure you have the following installed:

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **MongoDB** (v6 or higher) - [Download](https://www.mongodb.com/try/download/community)
3. **Git** - [Download](https://git-scm.com/)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install all dependencies for the monorepo including all services and the frontend.

### 2. Start MongoDB

Make sure MongoDB is running on your local machine:

**Windows:**
```bash
# If MongoDB is installed as a service, it should start automatically
# Otherwise, run:
mongod
```

**macOS/Linux:**
```bash
# Start MongoDB service
sudo systemctl start mongod
# OR
brew services start mongodb-community
```

Verify MongoDB is running by connecting to it:
```bash
mongosh
# You should see a MongoDB shell prompt
```

### 3. Configure Environment Variables

The `.env` file has been created with default values. Key configurations:

- **MONGODB_URI**: `mongodb://localhost:27017/socniti` (default local MongoDB)
- **JWT_SECRET**: Pre-configured (change in production!)
- **Ports**: 
  - Frontend: 5173
  - API Gateway: 8080
  - Auth Service: 4001
  - Event Service: 4002 (REST), 4005 (GraphQL)
  - Chat Service: 4003

**Optional configurations** (for full functionality):
- SMTP settings (for email OTP verification)
- Google Maps API key (for location features)

### 4. Start All Services

Run the entire application (all microservices + frontend):

```bash
npm run dev
```

This will start:
- ✅ Frontend (React + Vite) on http://localhost:5173
- ✅ API Gateway (Apollo Federation) on http://localhost:8080
- ✅ Auth Service (GraphQL) on http://localhost:4001
- ✅ Event Service (REST + GraphQL) on http://localhost:4002 & http://localhost:4005
- ✅ Chat Service (GraphQL) on http://localhost:4003

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **GraphQL Playground**: http://localhost:8080/graphql
- **Event REST API**: http://localhost:4002/api/events

## Individual Service Commands

Run services individually for development:

```bash
# Frontend only
npm run dev:frontend

# API Gateway only
npm run dev:gateway

# Auth Service only
npm run dev:auth

# Event Service only
npm run dev:events

# Chat Service only
npm run dev:chat
```

## Testing the GraphQL Federation

Once all services are running, open http://localhost:8080/graphql and try this query:

```graphql
query TestFederation {
  # Get events with organizer details (federated from Auth Service)
  events(maxDistanceKm: 50, lat: 40.7128, lng: -74.0060) {
    events {
      id
      title
      description
      category
      locationName
      startsAt
      currentParticipants
      maxParticipants
      distanceKm
      organizer {
        id
        fullName
        email
        role
      }
    }
  }
  
  # Get current user
  me {
    id
    fullName
    email
    role
  }
}
```

## Creating Test Data

### Register a User (Auth Service)

```graphql
mutation RegisterUser {
  register(
    fullName: "John Doe"
    email: "john@example.com"
    password: "password123"
    role: "organizer"
  ) {
    success
    message
  }
}
```

### Verify OTP (Check console logs for OTP since SMTP is not configured)

```graphql
mutation VerifyOTP {
  verifyOtp(email: "john@example.com", otp: "123456") {
    token
    user {
      id
      fullName
      email
      role
    }
  }
}
```

### Create an Event (Event Service)

Use the token from the previous step in the HTTP Headers:
```json
{
  "Authorization": "Bearer YOUR_TOKEN_HERE"
}
```

```graphql
mutation CreateEvent {
  createEvent(
    input: {
      title: "Community Cleanup Drive"
      description: "Join us for a neighborhood cleanup event"
      category: "Environment"
      locationName: "Central Park"
      address: "Central Park, New York, NY"
      city: "New York"
      state: "NY"
      coordinates: { lat: 40.785091, lng: -73.968285 }
      startsAt: "2024-12-01T10:00:00Z"
      endsAt: "2024-12-01T14:00:00Z"
      maxParticipants: 50
    }
  ) {
    success
    message
    event {
      id
      title
      slug
      organizerId
      organizer {
        fullName
        email
      }
    }
  }
}
```

## Architecture Overview

### Microservices Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React/Vite)   │
│   Port: 5173    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Gateway    │
│ (Apollo Fed)    │
│   Port: 8080    │
└────────┬────────┘
         │
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
┌────────┐ ┌────────┐ ┌────────┐
│  Auth  │ │ Event  │ │  Chat  │
│ Service│ │Service │ │Service │
│  4001  │ │4002/5  │ │  4003  │
└────────┘ └────────┘ └────────┘
    │         │
    ▼         ▼
┌──────────────────┐
│    MongoDB       │
│   Port: 27017    │
└──────────────────┘
```

### Event Service Features

**GraphQL API (Port 4005):**
- ✅ Federated with Auth Service (User references)
- ✅ Full CRUD operations for events
- ✅ Event registration and waitlist management
- ✅ Location-based search with distance calculation
- ✅ Organizer dashboard with analytics
- ✅ Authentication and authorization

**REST API (Port 4002):**
- ✅ All event operations via REST endpoints
- ✅ Compatible with existing frontend
- ✅ `/api/events` - List and filter events
- ✅ `/api/events/:slug` - Get event details
- ✅ `/api/events/:slug/register` - Register for event
- ✅ `/api/events/dashboard` - Organizer dashboard

## Troubleshooting

### MongoDB Connection Error

**Error**: `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution**: 
1. Make sure MongoDB is running: `mongod` or check service status
2. Verify MongoDB is listening on port 27017
3. Check firewall settings

### Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solution**:
1. Find and kill the process using the port:
   ```bash
   # Windows
   netstat -ano | findstr :8080
   taskkill /PID <PID> /F
   
   # macOS/Linux
   lsof -ti:8080 | xargs kill -9
   ```

### GraphQL Federation Errors

**Error**: `Couldn't load service definitions for "events"`

**Solution**:
1. Ensure all subgraph services are running
2. Check that ports match in `.env` and service configurations
3. Restart the API Gateway after all services are up

### Dependencies Installation Timeout

If `npm install` takes too long or times out:

```bash
# Clear npm cache
npm cache clean --force

# Install with increased timeout
npm install --timeout=120000

# Or install workspaces individually
npm install --workspace @socniti/frontend
npm install --workspace @socniti/auth-service
npm install --workspace @socniti/event-service
```

## Next Steps

1. **Implement Chat Service**: Add real-time messaging functionality
2. **Implement Notification Service**: Email reminders and push notifications
3. **Implement Donation Service**: Community needs and donation tracking
4. **Configure SMTP**: Set up email service for OTP delivery
5. **Add Google Maps**: Configure API key for map features
6. **Deploy**: Set up production environment with proper secrets

## Development Tips

- Use `npm run dev:gateway` to restart only the gateway when schema changes
- MongoDB data persists between restarts in the `socniti` database
- Check service logs for debugging - each service logs to its own console
- Use Apollo Studio for advanced GraphQL debugging

## Support

For issues or questions:
1. Check the console logs for each service
2. Verify MongoDB is running and accessible
3. Ensure all environment variables are set correctly
4. Check that no other services are using the required ports
