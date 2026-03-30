# SOCNITI Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install MongoDB

**Windows:**
- Download: https://www.mongodb.com/try/download/community
- Install and start MongoDB service
- Or run: `mongod`

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongod
```

### Step 2: Check Prerequisites

```bash
npm run precheck
```

This will verify:
- ✅ Node.js v18+
- ✅ npm installed
- ✅ Dependencies installed
- ✅ .env file exists
- ✅ MongoDB connection

### Step 3: Start the Application

```bash
npm run dev
```

This starts all services:
- Frontend: http://localhost:5173
- API Gateway: http://localhost:8080/graphql
- Auth Service: http://localhost:4001
- Event Service: http://localhost:4002 (REST) & http://localhost:4005 (GraphQL)
- Chat Service: http://localhost:4003

## 🎯 Test the Event Service

### 1. Open GraphQL Playground

Navigate to: **http://localhost:8080/graphql**

### 2. Register a User

```graphql
mutation {
  register(
    fullName: "Test Organizer"
    email: "test@example.com"
    password: "password123"
    role: "organizer"
  ) {
    success
    message
  }
}
```

### 3. Verify OTP

Check the console logs for the OTP code, then:

```graphql
mutation {
  verifyOtp(email: "test@example.com", otp: "YOUR_OTP") {
    token
    user {
      id
      fullName
      role
    }
  }
}
```

Copy the `token` from the response.

### 4. Create an Event

Add the token to HTTP Headers (bottom left in GraphQL Playground):

```json
{
  "Authorization": "Bearer YOUR_TOKEN_HERE"
}
```

Then run:

```graphql
mutation {
  createEvent(input: {
    title: "Community Beach Cleanup"
    description: "Join us to clean up the beach and protect marine life"
    category: "Environment"
    locationName: "Santa Monica Beach"
    address: "1550 Pacific Coast Hwy"
    city: "Santa Monica"
    state: "CA"
    coordinates: { lat: 34.0195, lng: -118.4912 }
    startsAt: "2024-12-20T09:00:00Z"
    endsAt: "2024-12-20T13:00:00Z"
    maxParticipants: 50
  }) {
    success
    message
    event {
      id
      title
      slug
      organizer {
        fullName
        email
      }
    }
  }
}
```

### 5. Query Events with Federation

```graphql
query {
  events {
    events {
      id
      title
      description
      locationName
      city
      startsAt
      currentParticipants
      maxParticipants
      organizer {
        id
        fullName
        email
        role
      }
    }
  }
}
```

Notice how the `organizer` field is automatically resolved from the Auth Service! 🎉

## 📚 What You Just Did

1. ✅ Started a federated GraphQL microservices architecture
2. ✅ Created a user with authentication
3. ✅ Created an event through the Event Service
4. ✅ Queried events with federated user data from Auth Service
5. ✅ Saw Apollo Federation in action!

## 🔍 Explore More

### REST API

The Event Service also has a REST API:

```bash
# List events
curl http://localhost:4002/api/events

# Get specific event
curl http://localhost:4002/api/events/YOUR_EVENT_SLUG

# Create event (with auth)
curl -X POST http://localhost:4002/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Event","description":"Test",...}'
```

### Frontend

Open http://localhost:5173 to see the React frontend.

### More Queries

```graphql
# Get single event
query {
  event(slug: "community-beach-cleanup-123456") {
    id
    title
    description
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
query {
  organizerDashboard {
    analytics {
      totalEvents
      totalParticipants
      totalWaitlist
    }
    events {
      title
      currentParticipants
      maxParticipants
    }
  }
}
```

### More Mutations

```graphql
# Register for event
mutation {
  registerForEvent(
    slug: "community-beach-cleanup-123456"
    input: {
      fullName: "Jane Volunteer"
      email: "jane@example.com"
    }
  ) {
    success
    message
  }
}

# Update event
mutation {
  updateEvent(
    slug: "community-beach-cleanup-123456"
    input: {
      maxParticipants: 75
      status: ongoing
    }
  ) {
    success
    message
  }
}

# Cancel registration
mutation {
  cancelRegistration(slug: "community-beach-cleanup-123456") {
    success
    message
  }
}
```

## 📖 Documentation

- **Setup Guide**: `SETUP_GUIDE.md` - Detailed setup instructions
- **Integration Guide**: `INTEGRATION_GUIDE.md` - How services connect
- **Project Status**: `PROJECT_STATUS.md` - What's implemented
- **Team Instructions**: `TEAM_INSTRUCTIONS.md` - Team collaboration

## 🐛 Common Issues

### MongoDB not connecting?
```bash
# Test connection
node test-mongodb.js

# Start MongoDB
mongod  # Windows/Linux
brew services start mongodb-community  # macOS
```

### Port already in use?
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8080 | xargs kill -9
```

### Services not starting?
```bash
# Check if dependencies are installed
npm run precheck

# Reinstall if needed
npm install
```

## 🎉 Success!

You now have a fully functional microservices architecture with:
- ✅ Apollo Federation connecting multiple services
- ✅ Event Service with complete CRUD operations
- ✅ User authentication and authorization
- ✅ Both REST and GraphQL APIs
- ✅ Location-based event search
- ✅ Event registration with waitlist management

## 🚀 Next Steps

1. Explore the frontend at http://localhost:5173
2. Create more events and test registration
3. Try location-based search with coordinates
4. Implement the Chat Service
5. Add Notification Service
6. Configure SMTP for real email OTP

Happy coding! 🎊
