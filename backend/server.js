const express = require("express");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const taskRoutes = require("./routes/taskAllocatorRoutes.js");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
const Connection = require("./config/db");
const cors = require("cors");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
app.use(cors());
app.use(express.json()); // to accept json data

// Connect to database
const PORT = process.env.PORT || 5001;
const username = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;

Connection(username, password);

// Routes
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/workspace", workspaceRoutes);
app.use("/api/tasks", taskRoutes);

app.get("/", (req, res) => {
  res.send("API is running..");
});

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

// Initialize Server
const server = app.listen(PORT, () =>
  console.log(`Server running on PORT ${PORT}...`)
);

// Setup Socket.IO with improved configuration
const io = require("socket.io")(server, {
  pingTimeout: 120000, // Increase ping timeout
  pingInterval: 25000, // Add ping interval
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
  connectTimeout: 45000, // Add connection timeout
  reconnection: true, // Enable reconnection
  reconnectionAttempts: 5, // Maximum reconnection attempts
  reconnectionDelay: 1000, // Initial delay between reconnection attempts
  reconnectionDelayMax: 5000, // Maximum delay between reconnection attempts
});

// Active Users for Geolocation with last known locations
const activeUsers = new Map();
const userSockets = new Map(); // Track user socket mappings

io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  // Handle user authentication and mapping
  socket.on("setup", (userData) => {
    if (userData && userData._id) {
      userSockets.set(userData._id, socket.id);
      socket.userId = userData._id;
      socket.userName = userData.name; // Store username in socket object
      socket.join(userData._id);
      socket.emit("connected");
      
      // Send existing locations to newly connected user
      const existingLocations = Array.from(activeUsers.entries()).map(
        ([id, locationData]) => ({
          userId: id,
          userName: locationData.userName, // Include username in existing locations
          ...locationData,
          timestamp: locationData.timestamp
        })
      );
      socket.emit("initial-locations", existingLocations);
    }
  });

  // Enhanced location update handling
  socket.on("location-update", (location) => {
    if (socket.userId) {
      const locationData = {
        ...location,
        timestamp: Date.now(),
        socketId: socket.id,
        // Add user information
        userName: socket.userName // We'll set this during setup
      };
      
      activeUsers.set(socket.userId, locationData);
      
      // Broadcast to all clients except sender
      socket.broadcast.emit("location-update", {
        userId: socket.userId,
        userName: socket.userName,
        ...locationData
      });
    }
  });

  // Improved disconnect handling
  socket.on("disconnect", async () => {
    if (socket.userId) {
      // Keep the last known location for a grace period
      setTimeout(() => {
        // Only remove if user hasn't reconnected
        if (!io.sockets.adapter.rooms.has(socket.userId)) {
          activeUsers.delete(socket.userId);
          userSockets.delete(socket.userId);
          io.emit("user-disconnected", socket.userId);
          console.log("User fully disconnected:", socket.userId);
        }
      }, 5000); // 5 second grace period
    }
  });

  // Handle reconnection
  socket.on("reconnect", () => {
    console.log("Socket reconnected:", socket.id);
    if (socket.userId) {
      userSockets.set(socket.userId, socket.id);
      socket.join(socket.userId);
      
      // Resend location if available
      const lastLocation = activeUsers.get(socket.userId);
      if (lastLocation) {
        socket.broadcast.emit("location-update", {
          userId: socket.userId,
          userName: socket.userName,
          ...lastLocation
        });
      }
    }
  });

  // Chat functionality
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    const chat = newMessageRecieved.chat;
    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message received", newMessageRecieved);
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});
