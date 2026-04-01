const history = {};

function calculateEntropy(userId, speed) {
  if (!history[userId]) {
    history[userId] = [];
  }

  history[userId].push(speed);

  // keep last 5 speeds
  if (history[userId].length > 5) {
    history[userId].shift();
  }

  const speeds = history[userId];

  if (speeds.length < 5) return 0;

  const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;

  const variance =
    speeds.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / speeds.length;

  // Smooth continuous entropy mapping instead of hard mathematical steps to prevent sudden jitter spikes
  let risk = (variance / 400) * 20;
  
  if (risk > 20) risk = 20;
  if (risk < 0) risk = 0;

  return Math.round(risk);
}

module.exports = calculateEntropy;
