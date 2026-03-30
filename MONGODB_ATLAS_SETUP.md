# MongoDB Atlas Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create MongoDB Atlas Account

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up with Google/GitHub or email (it's free!)
3. Choose the **FREE** tier (M0 Sandbox)

### Step 2: Create a Cluster

1. After signing in, click **"Build a Database"**
2. Choose **FREE** tier (M0)
3. Select a cloud provider and region (choose closest to you)
4. Cluster Name: `socniti-cluster` (or any name)
5. Click **"Create"**

### Step 3: Create Database User

1. You'll see "Security Quickstart"
2. **Username**: `socniti_user`
3. **Password**: Click "Autogenerate Secure Password" and COPY IT
4. Click **"Create User"**

### Step 4: Add IP Address

1. In "Where would you like to connect from?"
2. Click **"Add My Current IP Address"**
3. Or click **"Allow Access from Anywhere"** (0.0.0.0/0) for development
4. Click **"Finish and Close"**

### Step 5: Get Connection String

1. Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Driver: **Node.js**, Version: **5.5 or later**
4. Copy the connection string (looks like):
   ```
   mongodb+srv://socniti_user:<password>@socniti-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password from Step 3

### Step 6: Update .env File

Replace the MONGODB_URI in your `.env` file with your Atlas connection string:

```env
MONGODB_URI=mongodb+srv://socniti_user:YOUR_PASSWORD@socniti-cluster.xxxxx.mongodb.net/socniti?retryWrites=true&w=majority
```

**Important**: Add `/socniti` before the `?` to specify the database name!

## Example Connection String

```
mongodb+srv://socniti_user:MySecurePass123@socniti-cluster.abc123.mongodb.net/socniti?retryWrites=true&w=majority
```

## Verify Connection

After updating .env, test the connection:

```bash
node test-mongodb.js
```

You should see:
```
✅ MongoDB connection successful!
Database: socniti
```

## Troubleshooting

### "Authentication failed"
- Check your password is correct
- Make sure you replaced `<password>` with actual password
- No spaces or special characters issues

### "Connection timeout"
- Check your IP is whitelisted (Step 4)
- Try "Allow Access from Anywhere" (0.0.0.0/0)
- Check your internet connection

### "Database name not specified"
- Make sure you added `/socniti` before the `?` in the connection string

## Ready to Run!

Once MongoDB Atlas is connected, run:

```bash
npm run dev
```

All services will start with cloud MongoDB! 🚀
