import socket from "../socket";

let demoRunning = false;
let workers = {};

const emitUpdate = (
  lat,
  lng,
  risk,
  context,
  driverRisk = 10,
  driverState = "safe",
) => {
  workers["demo-worker"] = {
    userId: "demo-worker",
    name: "Demo Worker",
    lat,
    lng,
    risk,
    context,
    transportType: "office",
    cabNumber: "cab1",
    driverName: "Demo Driver",
    driverPhone: "9999999999",
    driverRisk,
    driverState,
  };

  socket.emit("workers:update", workers);

  if (risk >= 60) {
    socket.emit("worker:alert", workers["demo-worker"]);
  }
};

const moveSmooth = (
  from,
  to,
  duration,
  risk,
  context,
  driverRisk = 10,
  driverState = "safe",
) => {
  // 20 updates per second for smooth marker sliding
  const steps = Math.floor(duration / 50); 
  const latStep = (to[0] - from[0]) / steps;
  const lngStep = (to[1] - from[1]) / steps;

  let current = [...from];
  let i = 0;

  const interval = setInterval(() => {
    current[0] += latStep;
    current[1] += lngStep;

    if (window.demoSetPosition) {
      window.demoSetPosition([...current]);
    }

    emitUpdate(current[0], current[1], risk, context, driverRisk, driverState);

    i++;
    if (i >= steps) clearInterval(interval);
  }, 50);
};

export function startNoctisDemo({
  setRisk,
  pushContext,
  setDriverState,
  setDriverRisk,
  triggerMildAlert,
  triggerStrongAlert,
  triggerEmergency,
}) {
  if (demoRunning) return;
  demoRunning = true;

  const office = window.currentWorkerPosition || [11.0168, 76.9558];

  // relative offsets from current location
  const unsafeZone = [office[0] + 0.001, office[1] + 0.001];
  const deviation = [office[0] + 0.002, office[1] + 0.002];
  const stopPoint = [office[0] + 0.0022, office[1] + 0.0022];
  const entropy = [office[0] + 0.003, office[1] + 0.003];
  const isolated = [office[0] + 0.004, office[1] + 0.004];
  const distress = [office[0] + 0.0045, office[1] + 0.0045];
  const home = [office[0] + 0.005, office[1] + 0.005];

  setRisk(5);
  pushContext("Worker travelling towards home");
  moveSmooth(office, unsafeZone, 30000, 5, "Travelling towards home");

  setTimeout(() => {
    setRisk(25);
    pushContext("Approaching unsafe zone");
    moveSmooth(unsafeZone, deviation, 30000, 25, "Approaching unsafe zone");
  }, 30000);

  setTimeout(() => {
    setRisk(45);
    pushContext("Route deviation detected");
    moveSmooth(deviation, stopPoint, 40000, 45, "Route deviation detected");
  }, 60000);

  setTimeout(() => {
    setRisk(60);
    pushContext("Worker stopped in unusual area");
    triggerMildAlert();
    emitUpdate(stopPoint[0], stopPoint[1], 60, "Worker stopped unusually");
  }, 100000);

  setTimeout(() => {
    setRisk(72);
    pushContext("Driver unstable behaviour detected");
    setDriverState("unsafe");
    setDriverRisk(72);

    moveSmooth(
      stopPoint,
      entropy,
      40000,
      72,
      "Driver unstable behaviour",
      72,
      "unsafe",
    );
  }, 140000);

  setTimeout(() => {
    setRisk(85);
    pushContext("Worker moving through isolated route");
    triggerStrongAlert();

    moveSmooth(
      entropy,
      isolated,
      30000,
      85,
      "Moving through isolated route",
      85,
      "unsafe",
    );
  }, 180000);

  setTimeout(() => {
    setRisk(92);
    pushContext("Distress sound detected");
    triggerStrongAlert();

    moveSmooth(
      isolated,
      distress,
      20000,
      92,
      "Distress sound detected",
      90,
      "unsafe",
    );
  }, 210000);

  setTimeout(() => {
    setRisk(100);
    pushContext("Emergency codeword triggered");
    triggerEmergency();

    moveSmooth(
      distress,
      home,
      10000,
      100,
      "Emergency triggered",
      100,
      "unsafe",
    );
  }, 240000);
}
