const history = {};

function behaviorLearning(userId, speed, isStopped) {
  if (!history[userId]) {
    history[userId] = {
      speeds: [],
      stops: 0,
    };
  }

  const user = history[userId];

  // learn speed
  user.speeds.push(speed);

  if (user.speeds.length > 20) {
    user.speeds.shift();
  }

  const avgSpeed = user.speeds.reduce((a, b) => a + b, 0) / user.speeds.length;

  let risk = 0;

  // unusual slow movement with hysteresis
  if (speed < avgSpeed * 0.3 && avgSpeed > 10) {
    user.slowTicks = (user.slowTicks || 0) + 1;
  } else {
    user.slowTicks = 0;
  }

  // unusual fast movement with hysteresis
  if (speed > avgSpeed * 1.5) {
    user.fastTicks = (user.fastTicks || 0) + 1;
  } else {
    user.fastTicks = 0;
  }

  if (user.slowTicks > 3) risk += 10;
  if (user.fastTicks > 3) risk += 10;

  // abnormal stopping
  if (isStopped) {
    user.stops++;
  } else {
    user.stops = 0;
  }

  if (user.stops > 5) {
    risk += 10;
  }

  return risk;
}

module.exports = behaviorLearning;
