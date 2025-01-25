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

// Setup Socket.IO
const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

// Active Users for Geolocation
const activeUsers = new Map();

io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  // Geolocation logic
  const existingLocations = Array.from(activeUsers.entries()).map(
    ([id, location]) => ({
      userId: id,
      ...location,
    })
  );
  socket.emit("initial-locations", existingLocations);

  socket.on("location-update", (location) => {
    activeUsers.set(socket.id, location);
    io.emit("location-update", {
      userId: socket.id,
      ...location,
    });
  });

  socket.on("disconnect", () => {
    activeUsers.delete(socket.id);
    io.emit("user-disconnected", socket.id);
    console.log("User disconnected:", socket.id);
  });

  // Chat functionality
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });

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
