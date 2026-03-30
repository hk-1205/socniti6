# Event Service Integration Guide

## Overview

The Event Service is now fully integrated with the SOCNITI microservices architecture, providing both REST and GraphQL APIs with Apollo Federation support.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    React + Vite + Tailwind                       │
│                     http://localhost:5173                        │
│                                                                   │
│  Pages: Home, Events, Login, Register, Dashboard, Profile        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP Requests
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                                 │
│                  Apollo Federation Gateway                       │
│                     http://localhost:8080                        │
│                                                                   │
│  Composes schemas from all subgraphs into unified API            │
│  Handles query planning and execution across services            │
└──────┬──────────────────────┬──────────────────────┬────────────┘
       │                      │                      │
       │ GraphQL              │ GraphQL              │ GraphQL
       │                      │                      │
       ▼                      ▼                      ▼
┌─────────────┐      ┌──────────────────┐     ┌─────────────┐
│   AUTH      │      │   EVENT SERVICE  │     │    CHAT     │
│  SERVICE    │      │                  │     │   SERVICE   │
│             │      │  ┌────────────┐  │     │             │
│  Port 4001  │◄─────┼──┤  GraphQL   │  │     │  Port 4003  │
│             │ User │  │  Port 4005 │  │     │             │
│  GraphQL    │ Refs │  └────────────┘  │     │  GraphQL    │
│  Subgraph   │      │                  │     │  Subgraph   │
│             │      │  ┌────────────┐  │     │             │
│  - User     │      │  │    REST    │  │     │  - Message  │
│  - Auth     │      │  │  Port 4002 │  │     │  - Chat     │
│  - JWT      │      │  └────────────┘  │     │             │
└──────┬──────┘      └────────┬─────────┘     └──────┬──────┘
       │                      │                       │
       │                      │                       │
       └──────────────────────┴───────────────────────┘
                              │
                              │ Mongoose ODM
                              │
                              ▼
                    ┌──────────────────┐
                    │     MongoDB      │
                    │   Port 27017     │
                    │                  │
                    │  Database:       │
                    │    socniti       │
                    │                  │
                    │  Collections:    │
                    │  - users         │
                    │  - events        │
                    └──────────────────┘
```

## Federation Flow

### Example: Query Events with Organizer Details

```graphql
query GetEventsWithOrganizers {
  events {
    events {
      id
      title
      organizerId
      organizer {        # ← Resolved by Auth Service
        fullName
        email
        role
      }
    }
  }
}
```

**Execution Flow:**

1. **Client** sends query to API Gateway (port 8080)
2. **API Gateway** analyzes query and creates execution plan:
   - Query `events` from Event Service
   - For each event, resolve `organizer` from Auth Service using `organizerId`
3. **Event Service** (port 4005) returns events with `organizerId`
4. **API Gateway** sends federated query to Auth Service:
   ```graphql
   query {
     _entities(representations: [
       { __typename: "User", id: "user1" },
       { __typename: "User", id: "user2" }
     ]) {
       ... on User {
         fullName
         email
         role
       }
     }
   }
   ```
5. **Auth Service** (port 4001) resolves User entities
6. **API Gateway** combines results and returns to client

## Event Service Endpoints

### GraphQL API (Port 4005)

**Endpoint**: `http://localhost:4005/graphql`

**Federated with**: Auth Service (User references)

#### Queries

```graphql
# List events with filters
query ListEvents {
  events(
    search: "cleanup"
    category: "Environment"
    city: "New York"
    status: upcoming
    lat: 40.7128
    lng: -74.0060
    maxDistanceKm: 50
  ) {
    events {
      id
      title
      description
      locationName
      distanceKm
      currentParticipants
      maxParticipants
      organizer {
        fullName
        email
      }
    }
    filters {
      categories
    }
  }
}

# Get single event
query GetEvent {
  event(slug: "beach-cleanup-123456") {
    id
    title
    description
    organizer {
      fullName
      email
      role
    }
    participants {
      userId
      fullName
      user {
        email
        role
      }
    }
  }
}

# Organizer dashboard
query OrganizerDashboard {
  organizerDashboard {
    analytics {
      totalEvents
      totalParticipants
      totalWaitlist
    }
    events {
      id
      title
      currentParticipants
      maxParticipants
    }
  }
}
```

#### Mutations

```graphql
# Create event (requires auth)
mutation CreateEvent {
  createEvent(input: {
    title: "Community Garden Planting"
    description: "Help us plant vegetables"
    category: "Environment"
    locationName: "Community Garden"
    city: "Brooklyn"
    state: "NY"
    coordinates: { lat: 40.6782, lng: -73.9442 }
    startsAt: "2024-12-20T10:00:00Z"
    maxParticipants: 25
  }) {
    success
    message
    event {
      id
      slug
      title
    }
  }
}

# Update event (requires auth + ownership)
mutation UpdateEvent {
  updateEvent(
    slug: "community-garden-123456"
    input: {
      maxParticipants: 30
      status: ongoing
    }
  ) {
    success
    message
    event {
      id
      maxParticipants
      status
    }
  }
}

# Register for event (requires auth)
mutation RegisterForEvent {
  registerForEvent(
    slug: "community-garden-123456"
    input: {
      fullName: "John Doe"
      email: "john@example.com"
    }
  ) {
    success
    message
    event {
      currentParticipants
      waitlistCount
    }
  }
}

# Cancel registration (requires auth)
mutation CancelRegistration {
  cancelRegistration(slug: "community-garden-123456") {
    success
    message
  }
}

# Delete event (requires auth + ownership)
mutation DeleteEvent {
  deleteEvent(slug: "community-garden-123456") {
    success
    message
  }
}
```

### REST API (Port 4002)

**Base URL**: `http://localhost:4002/api/events`

#### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List events with filters | No |
| GET | `/:slug` | Get event by slug | No |
| POST | `/` | Create event | Yes (organizer/admin) |
| PATCH | `/:slug` | Update event | Yes (owner) |
| DELETE | `/:slug` | Delete event | Yes (owner) |
| POST | `/:slug/register` | Register for event | Yes |
| POST | `/:slug/cancel` | Cancel registration | Yes |
| GET | `/dashboard` | Organizer dashboard | Yes (organizer/admin) |

#### Example REST Requests

**List Events:**
```bash
curl "http://localhost:4002/api/events?city=New York&category=Environment"
```

**Get Event:**
```bash
curl "http://localhost:4002/api/events/beach-cleanup-123456"
```

**Create Event:**
```bash
curl -X POST http://localhost:4002/api/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Park Cleanup",
    "description": "Clean up the local park",
    "category": "Environment",
    "locationName": "Central Park",
    "city": "New York",
    "coordinates": { "lat": 40.785091, "lng": -73.968285 },
    "startsAt": "2024-12-15T10:00:00Z",
    "maxParticipants": 50
  }'
```

**Register for Event:**
```bash
curl -X POST http://localhost:4002/api/events/park-cleanup-123456/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Smith",
    "email": "jane@example.com"
  }'
```

## Authentication Flow

### 1. Register User (Auth Service)

```graphql
mutation Register {
  register(
    fullName: "Alice Organizer"
    email: "alice@example.com"
    password: "securepass123"
    role: "organizer"
  ) {
    success
    message
  }
}
```

### 2. Verify OTP (Auth Service)

Check console logs for OTP (since SMTP is not configured by default)

```graphql
mutation Verify {
  verifyOtp(
    email: "alice@example.com"
    otp: "123456"
  ) {
    token
    user {
      id
      fullName
      role
    }
  }
}
```

### 3. Use Token in Requests

**GraphQL (via HTTP Headers):**
```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**REST (via Authorization header):**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4002/api/events
```

## JWT Token Structure

```json
{
  "sub": "user_id_here",        // Standard JWT subject claim
  "id": "user_id_here",          // Backward compatibility
  "email": "user@example.com",
  "role": "organizer",
  "iat": 1234567890,
  "exp": 1237159890
}
```

## Federation Details

### Event Service Schema (Federated)

```graphql
type Event @key(fields: "id") {
  id: ID!
  organizerId: ID!
  organizer: User              # References Auth Service
  participants: [Participant!]
}

type Participant {
  userId: ID!
  user: User                   # References Auth Service
}

# Stub type for federation
type User @key(fields: "id", resolvable: false) {
  id: ID!
}
```

### Auth Service Schema (Federated)

```graphql
type User @key(fields: "id") {
  id: ID!
  fullName: String!
  email: String
  role: String!
}
```

### How Federation Works

1. **Event Service** declares it needs `User` type but doesn't resolve it
2. **Auth Service** owns the `User` type and can resolve all its fields
3. **API Gateway** automatically:
   - Fetches events from Event Service
   - Extracts `organizerId` values
   - Queries Auth Service for User details
   - Combines results into single response

## Testing the Integration

### 1. Start All Services

```bash
npm run dev
```

Wait for all services to start:
- ✅ Auth Service running at http://localhost:4001
- ✅ Event REST API running on port 4002
- ✅ Event GraphQL Subgraph running at http://localhost:4005
- ✅ Chat Subgraph running at http://localhost:4003
- ✅ API Gateway ready at http://localhost:8080

### 2. Open GraphQL Playground

Navigate to: http://localhost:8080/graphql

### 3. Test Federation Query

```graphql
query TestFederation {
  # This query spans multiple services
  events {
    events {
      id
      title
      organizerId
      organizer {          # ← From Auth Service
        id
        fullName
        email
        role
      }
      participants {
        userId
        fullName
        user {             # ← From Auth Service
          email
          role
        }
      }
    }
  }
  
  # Also query Auth Service directly
  me {
    id
    fullName
    email
  }
}
```

### 4. Test Mutations

```graphql
# First, authenticate
mutation Login {
  login(email: "alice@example.com", password: "securepass123") {
    token
    user {
      id
      fullName
      role
    }
  }
}

# Then create an event (add token to HTTP Headers)
mutation CreateEvent {
  createEvent(input: {
    title: "Test Event"
    description: "Testing federation"
    category: "Community"
    locationName: "Test Location"
    city: "Test City"
    state: "TS"
    coordinates: { lat: 0, lng: 0 }
    startsAt: "2024-12-31T12:00:00Z"
    maxParticipants: 10
  }) {
    success
    event {
      id
      slug
      organizer {
        fullName
      }
    }
  }
}
```

## Troubleshooting

### Gateway Can't Connect to Event Service

**Error**: `Couldn't load service definitions for "events"`

**Solution**:
1. Ensure Event Service is running on port 4005
2. Check Event Service logs for errors
3. Verify MongoDB is connected
4. Restart API Gateway after Event Service is up

### User References Not Resolving

**Error**: `Cannot return null for non-nullable field User.fullName`

**Solution**:
1. Ensure Auth Service is running
2. Check that `organizerId` exists in User collection
3. Verify JWT token is valid
4. Check Auth Service `__resolveReference` resolver

### Authentication Errors

**Error**: `Authentication required`

**Solution**:
1. Ensure you're passing JWT token in headers
2. Format: `Authorization: Bearer YOUR_TOKEN`
3. Verify JWT_SECRET is the same in all services
4. Check token hasn't expired (30 days default)

### MongoDB Connection Issues

**Error**: `MongooseServerSelectionError`

**Solution**:
1. Start MongoDB: `mongod` or service
2. Check MongoDB is on port 27017
3. Run: `node test-mongodb.js`
4. Verify MONGODB_URI in .env

## Performance Considerations

### GraphQL Federation
- Gateway caches schema between polls (5 second interval)
- Batch User lookups when possible
- Consider DataLoader for N+1 query optimization

### REST API
- MongoDB indexes on: `slug`, `organizerId`, `startsAt`, `city`
- Geospatial index on `coordinates` for location search
- Pagination recommended for large result sets

### Caching Strategy
- Consider Redis for:
  - Event list caching
  - User profile caching
  - Session management

## Next Steps

1. **Add Subscriptions**: Real-time event updates
2. **Implement DataLoader**: Optimize federated queries
3. **Add Caching**: Redis for frequently accessed data
4. **Rate Limiting**: Protect APIs from abuse
5. **Monitoring**: Add logging and metrics
6. **Testing**: Unit and integration tests
7. **Documentation**: OpenAPI spec for REST API

## Resources

- [Apollo Federation Docs](https://www.apollographql.com/docs/federation/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [MongoDB Geospatial Queries](https://www.mongodb.com/docs/manual/geospatial-queries/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
