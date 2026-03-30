# Starting All SOCNITI Services

## Services to Start (in order):

1. **Auth Service** (Port 4001)
2. **Event Service** (Ports 4002, 4005)
3. **Chat Service** (Ports 4003, 4006)
4. **Donation Service** (Ports 4007, 4008)
5. **API Gateway** (Port 8080)
6. **Frontend** (Port 5173)

## Starting Services...

All services are being started now. Please wait for all to be ready.

## Expected Output:

✅ Auth Service: http://localhost:4001/
✅ Event REST API: http://localhost:4002
✅ Event GraphQL: http://localhost:4005/
✅ Chat WebSocket: ws://localhost:4003
✅ Chat GraphQL: http://localhost:4006/
✅ Donation REST API: http://localhost:4007
✅ Donation GraphQL: http://localhost:4008/
✅ API Gateway: http://localhost:8080/
✅ Frontend: http://localhost:5173/

## Testing:

1. Open Frontend: http://localhost:5173/
2. Open GraphQL Playground: http://localhost:8080/
3. Test signup with OTP (check email!)
4. Test login with username/password
5. Test chat (WebSocket)
6. Test donations

## Note:

- Gmail SMTP is configured - OTPs will be sent to real emails!
- Chat requires WebSocket connection
- Donations and Chat require authentication
