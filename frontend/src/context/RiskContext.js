import { createContext, useState, useCallback } from "react";

export const RiskContext = createContext();

export function RiskProvider({ children }) {
  const [risk, setRisk] = useState(5);
  const [context, setContext] = useState("Safe");
  const [emergency, setEmergency] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const triggerManualSOS = useCallback(() => {
    setEmergency(true);
    setRisk(100);
    setContext("Manual SOS Triggered");
  }, []);

  const triggerCodewordSOS = useCallback(() => {
    setEmergency(true);
    setRisk(100);
    setContext("Codeword Detected");
  }, []);

  // AI updates (blocked during demo)
  const updateRisk = useCallback((value) => {
    if (!emergency && !demoMode) {
      setRisk(value);
    }
  }, [emergency, demoMode]);

  const updateContext = useCallback((text) => {
    if (!emergency && !demoMode) {
      setContext(text);
    }
  }, [emergency, demoMode]);

  // DEMO overrides (always allowed)
  const demoSetRisk = useCallback((value) => {
    setRisk(value);
  }, []);

  const demoSetContext = useCallback((text) => {
    setContext(text);
  }, []);

  const startDemoMode = useCallback(() => {
    setDemoMode(true);
  }, []);

  const stopDemoMode = useCallback(() => {
    setDemoMode(false);
  }, []);

  const resetEmergency = useCallback(() => {
    setEmergency(false);
    setRisk(5);
    setContext("Safe");
    setDemoMode(false);
  }, []);

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
