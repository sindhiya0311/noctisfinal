const memory = {};

function riskMemory(userId, risk) {
  if (!memory[userId]) {
    memory[userId] = {
      value: risk,
    };
  }

  const prev = memory[userId].value;

  // Exponential Moving Average (EMA) to prevent mathematical oscillation
  // Smoothly blends 15% of the new raw risk with 85% of the history over time
  let newRisk = prev + 0.15 * (risk - prev);

  // Fast-react to extreme sudden alerts (override the smoothing filter)
  if (risk >= 80 && risk > prev + 30) {
    newRisk = risk; 
  }

  // clamp securely
  if (newRisk > 100) newRisk = 100;
  if (newRisk < 0) newRisk = 0;

  memory[userId].value = newRisk;

  return Math.round(newRisk);
}

module.exports = riskMemory;
