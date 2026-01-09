import { useState, useEffect, useCallback } from "react";
import { api, type AgentRunWithMetrics } from "@/lib/api";

export const useAgentRuns = () => {
  const [runs, setRuns] = useState<AgentRunWithMetrics[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const loadRuns = useCallback(async () => {
    try {
      setRunsLoading(true);
      const runsList = await api.listAgentRuns();
      setRuns(runsList);
    } catch (err) {
      console.error("Failed to load runs:", err);
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  return {
    runs,
    runsLoading,
    loadRuns,
  };
};
