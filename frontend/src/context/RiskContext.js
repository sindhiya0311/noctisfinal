import { createContext, useState } from "react";

export const RiskContext = createContext();

export function RiskProvider({ children }) {
  const [risk, setRisk] = useState(5);
  const [context, setContext] = useState("Safe");
  const [emergency, setEmergency] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const triggerManualSOS = () => {
    setEmergency(true);
    setRisk(100);
    setContext("Manual SOS Triggered");
  };

  const triggerCodewordSOS = () => {
    setEmergency(true);
    setRisk(100);
    setContext("Codeword Detected");
  };

  // AI updates (blocked during demo)
  const updateRisk = (value) => {
    if (!emergency && !demoMode) {
      setRisk(value);
    }
  };

  const updateContext = (text) => {
    if (!emergency && !demoMode) {
      setContext(text);
    }
  };

  // DEMO overrides (always allowed)
  const demoSetRisk = (value) => {
    setRisk(value);
  };

  const demoSetContext = (text) => {
    setContext(text);
  };

  const startDemoMode = () => {
    setDemoMode(true);
  };

  const stopDemoMode = () => {
    setDemoMode(false);
  };

  const resetEmergency = () => {
    setEmergency(false);
    setRisk(5);
    setContext("Safe");
    setDemoMode(false);
  };

  const riskLevel = risk >= 80 ? "emergency" : risk >= 40 ? "warning" : "safe";

  return (
    <RiskContext.Provider
      value={{
        risk,
        context,
        riskLevel,
        triggerManualSOS,
        triggerCodewordSOS,
        updateRisk,
        updateContext,
        resetEmergency,
        emergency,

        // demo
        demoMode,
        startDemoMode,
        stopDemoMode,

        // demo controller hooks
        setRisk: demoSetRisk,
        pushContext: demoSetContext,
      }}
    >
      {children}
    </RiskContext.Provider>
  );
}
