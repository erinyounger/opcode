import React from "react";
import { History } from "lucide-react";
import { AgentRunsList } from "../AgentRunsList";
import { type AgentRunWithMetrics } from "@/lib/api";

interface ExecutionHistoryProps {
  runs: AgentRunWithMetrics[];
  runsLoading: boolean;
}

export const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({
  runs,
  runsLoading,
}) => {
  return (
    <div className="overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-heading-4">Recent Executions</h2>
      </div>
      {runsLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : (
        <AgentRunsList runs={runs} />
      )}
    </div>
  );
};
