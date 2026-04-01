const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const requestRoutes = require("./routes/requestRoutes");
const getContext = require("./services/contextEngine");
const predictiveRisk = require("./services/predictiveRisk");
const calculateEntropy = require("./services/drivingEntropy");
const behaviorLearning = require("./services/behaviorLearning");
const updateTrip = require("./services/etaEngine");
const driverScore = require("./services/driverScore");
const getRiskLevel = require("./services/riskLevel");
const predictiveSafety = require("./services/predictiveSafety");
const routeLearning = require("./services/routeLearning");
const multiModal = require("./services/multiModal");
const timeIntelligence = require("./services/timeIntelligence");
const cityIntelligence = require("./services/cityIntelligence");
const riskMemory = require("./services/riskMemory");

// Routes
const userRoutes = require("./routes/userRoutes");
const locationRoutes = require("./routes/locationRoutes");
const User = require("./models/User");

let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const twilio = require("twilio");
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

app.set("io", io);

const workers = {};

const unsafeZones = [
  { lat: 12.9716, lng: 77.5946 },
  { lat: 12.975, lng: 77.6 },
];

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/requests", requestRoutes);

app.get("/", (req, res) => {
  res.send("NOCTIS Backend Running 🚀");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Send current state immediately
  socket.emit("workers:update", workers);

  // Allow clients to request current state to avoid race conditions
  socket.on("get:workers", () => {
    socket.emit("workers:update", workers);
  });

  socket.on("worker:update", (data) => {
    // ---------------- FAST UPDATE (NO LAG) ----------------
    // Fast position sync (preserve AI state)
    workers[data.userId] = {
      ...workers[data.userId],
      ...data,
      // Protect the ML-computed risk and context from being overridden by the raw client ping
      risk: data.risk === 100 ? 100 : (workers[data.userId]?.risk !== undefined ? workers[data.userId].risk : data.risk),
      context: data.risk === 100 ? data.context : (workers[data.userId]?.context !== undefined ? workers[data.userId].context : data.context),
      socketId: socket.id,
    };

    io.emit("workers:update", workers);

    // ---------------- AI COMPUTE (ASYNC) ----------------

    setImmediate(async () => {
      const entropyRisk = calculateEntropy(data.userId, data.speed || 0);
      const routeRisk = data.tripMode ? 0 : routeLearning(data.userId, data.lat, data.lng);

      const prevSpeed = workers[data.userId]?.speed || 0;
      const acceleration = (data.speed || 0) - prevSpeed;

      const motionRisk = multiModal(data.userId, data.speed || 0, acceleration);

      const timeRisk = timeIntelligence(
        data.userId,
        data.isStopped,
        data.isNight,
      );

      const behaviorRisk = behaviorLearning(
        data.userId,
        data.speed || 0,
        data.isStopped,
      );

      let mlRisk = 0;
      try {
        const mlResponse = await axios.post("http://localhost:5001/predict", {
          speed: data.speed || 0,
          stopDuration: data.stopDuration || 0,
          deviation: data.deviation ? 1 : 0,
          night: data.isNight ? 1 : 0,
          unsafe: data.unsafeZone ? 1 : 0,
          entropy: entropyRisk,
        });

        mlRisk = mlResponse.data.risk || 0;
      } catch {
        console.log("ML server not reachable");
      }

      const predictiveBoost = predictiveSafety({
        lat: data.lat,
        lng: data.lng,
        speed: data.speed,
        unsafeZones,
      });

      const finalRisk = predictiveRisk({
        baseRisk:
          (data.risk || 0) +
          entropyRisk +
          behaviorRisk +
          mlRisk * 0.3 +
          predictiveBoost +
          routeRisk +
          motionRisk +
          timeRisk,
        stopDuration: data.stopDuration,
        deviation: data.deviation,
        isNight: data.isNight,
        unsafeZone: data.unsafeZone,
        taggedLocation: data.taggedLocation,
      });

      const cityRisk = cityIntelligence(data.lat, data.lng, finalRisk);

      const rememberedRisk = riskMemory(data.userId, finalRisk + cityRisk);

      const riskLevel = getRiskLevel(rememberedRisk);

      const trip = updateTrip(
        data.userId,
        data.lat,
        data.lng,
        data.speed || 0,
        data.destination,
      );

      const driverRisk = driverScore(
        data.userId,
        entropyRisk,
        mlRisk,
        data.deviation,
        data.stopDuration,
      );

      let context = getContext({
        speed: data.speed,
        isNight: data.isNight,
        isStopped: data.isStopped,
        deviation: data.deviation,
        unsafeZone: data.unsafeZone,
        transport: data.transport,
        stopDuration: data.stopDuration,
        mlRisk,
        entropyRisk,
        driverRisk,
        routeRisk,
        motionRisk,
        timeRisk,
        predictiveBoost,
        trip,
        taggedLocation: data.taggedLocation,
      });

      if (data.risk === 100) {
        context = data.context || "Emergency triggered";
      }

      workers[data.userId] = {
        ...workers[data.userId],
        context,
        risk: data.risk === 100 ? 100 : rememberedRisk,
        riskLevel: data.risk === 100 ? "emergency" : riskLevel,
        mlRisk,
        trip,
        driverRisk,
      };

      io.emit("worker:update", workers[data.userId]);
      io.emit("workers:update", workers);

      if (workers[data.userId].risk >= 80) {
        io.emit("worker:alert", workers[data.userId]);
      }
    });
  });

  const sosCooldowns = {}; // Prevent API spam

  socket.on("worker:sos", async (data) => {
    if (!workers[data.userId]) {
      workers[data.userId] = { userId: data.userId, name: "Worker", lat: 0, lng: 0 };
    }
    workers[data.userId].risk = 100;
    workers[data.userId].context = "Emergency triggered";

    io.emit("worker:update", workers[data.userId]); 
    io.emit("worker:alert", workers[data.userId]);
    io.emit("workers:update", workers);

    // WHATSAPP DISPATCH LOGIC
    try {
      const now = Date.now();
      // 5-minute cooldown per user
      if (!sosCooldowns[data.userId] || now - sosCooldowns[data.userId] > 5 * 60 * 1000) {
        sosCooldowns[data.userId] = now;
        
        const user = await User.findById(data.userId);
        if (user && user.emergencyContacts && user.emergencyContacts.length > 0) {
          const lat = workers[data.userId].lat;
          const lng = workers[data.userId].lng;
          const locationLink = `https://maps.google.com/?q=${lat},${lng}`;
          const messageBody = `🚨 *EMERGENCY ALERT*\n${user.name || "A NOCTIS user"} is in an emergency and needs assistance. \n\nPlease send me support here:\n${locationLink}`;

          if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
            for (const contact of user.emergencyContacts) {
              // Ensure clean +91 format
              const cleanPhone = contact.phone.replace(/\D/g, '').slice(-10);
              await twilioClient.messages.create({
                body: messageBody,
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: `whatsapp:+91${cleanPhone}`
              });
              console.log(`WhatsApp SOS sent to ${contact.name} (+91${cleanPhone})`);
            }
          } else {
            console.log("⚠️ Twilio not configured. WhatsApp SOS skipped.");
            console.log("Would have sent:", messageBody);
            console.log("To:", user.emergencyContacts);
          }
        }
      }
    } catch (err) {
      console.error("Failed to execute WhatsApp Emergency Protocol:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (let id in workers) {
      if (workers[id].socketId === socket.id) {
        delete workers[id];
      }
    }

    io.emit("workers:update", workers);
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.log("MongoDB Error:", err));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
