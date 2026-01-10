import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { StateCreator } from 'zustand';
import { api } from '@/lib/api';
import type { AgentRunWithMetrics } from '@/lib/api';

// Constants for memory management
const MAX_AGENT_RUNS = 1000;
const MAX_SESSION_OUTPUTS = 500;
const MAX_OUTPUT_LENGTH = 10000;
const POLLING_INTERVAL_DEFAULT = 3000;
const CACHE_DURATION = 5000;

// Helper function to trim array with size limit
function trimArrayWithLimit<T>(array: T[], maxSize: number): T[] {
  if (array.length <= maxSize) {
    return array;
  }
  return array.slice(-maxSize);
}

interface AgentState {
  // Agent runs data
  agentRuns: AgentRunWithMetrics[];
  runningAgents: Set<string>;
  sessionOutputs: Record<string, string>;

  // UI state
  isLoadingRuns: boolean;
  isLoadingOutput: boolean;
  error: string | null;
  lastFetchTime: number;

  // Actions
  fetchAgentRuns: (forceRefresh?: boolean) => Promise<void>;
  fetchSessionOutput: (runId: number) => Promise<void>;
  createAgentRun: (data: { agentId: number; projectPath: string; task: string; model?: string }) => Promise<AgentRunWithMetrics>;
  cancelAgentRun: (runId: number) => Promise<void>;
  deleteAgentRun: (runId: number) => Promise<void>;
  clearError: () => void;

  // Real-time updates
  handleAgentRunUpdate: (run: AgentRunWithMetrics) => void;

  // Polling management
  startPolling: (interval?: number) => void;
  stopPolling: () => void;
  pollingInterval: NodeJS.Timeout | null;
}

const agentStore: StateCreator<
  AgentState,
  [],
  [['zustand/subscribeWithSelector', never]],
  AgentState
> = (set, get) => ({
    // Initial state
    agentRuns: [],
    runningAgents: new Set(),
    sessionOutputs: {},
    isLoadingRuns: false,
    isLoadingOutput: false,
    error: null,
    lastFetchTime: 0,
    pollingInterval: null,

    // Fetch agent runs with caching and memory limits
    fetchAgentRuns: async (forceRefresh = false) => {
      const now = Date.now();
      const { lastFetchTime, runningAgents } = get();

      // Smart caching: only cache for configured duration and skip if no running agents
      if (!forceRefresh && now - lastFetchTime < CACHE_DURATION && runningAgents.size === 0) {
        return;
      }

      set({ isLoadingRuns: true, error: null });

      try {
        const runs = await api.listAgentRuns();

        // Only fetch running/pending agent IDs for smart polling
        const runningIds = runs
          .filter((r) => r.status === 'running' || r.status === 'pending')
          .map((r) => r.id?.toString() || '')
          .filter(Boolean);

        // Limit agent runs array size to prevent memory leaks
        const trimmedRuns = trimArrayWithLimit(runs, MAX_AGENT_RUNS);

        set((state) => ({
          agentRuns: trimmedRuns,
          runningAgents: new Set(runningIds),
          isLoadingRuns: false,
          lastFetchTime: now
        }));
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch agent runs',
          isLoadingRuns: false
        });
      }
    },
    
    // Fetch session output for a specific run with memory limits
    fetchSessionOutput: async (runId: number) => {
      set({ isLoadingOutput: true, error: null });

      try {
        const output = await api.getAgentRunWithRealTimeMetrics(runId).then(run => run.output || '');

        // Apply output length limit to prevent memory bloat
        const trimmedOutput = output.length > MAX_OUTPUT_LENGTH
          ? output.slice(-MAX_OUTPUT_LENGTH)
          : output;

        set((state) => {
          // Limit session outputs cache size
          const currentOutputs = state.sessionOutputs;
          const updatedOutputs = {
            ...currentOutputs,
            [runId]: trimmedOutput
          };

          // If exceeding max size, remove oldest entries (based on insertion order)
          const outputEntries = Object.entries(updatedOutputs);
          if (outputEntries.length > MAX_SESSION_OUTPUTS) {
            const sortedEntries = outputEntries
              .sort(([a], [b]) => a.localeCompare(b)) // Sort by key to maintain insertion order
              .slice(-MAX_SESSION_OUTPUTS);
            return {
              sessionOutputs: Object.fromEntries(sortedEntries),
              isLoadingOutput: false
            };
          }

          return {
            sessionOutputs: updatedOutputs,
            isLoadingOutput: false
          };
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch session output',
          isLoadingOutput: false
        });
      }
    },
    
    // Create a new agent run with memory management
    createAgentRun: async (data: { agentId: number; projectPath: string; task: string; model?: string }) => {
      try {
        const runId = await api.executeAgent(data.agentId, data.projectPath, data.task, data.model);

        // Fetch the created run details
        const run = await api.getAgentRun(runId);

        // Update local state immediately with size limit enforcement
        set((state) => {
          const newRuns = [run, ...state.agentRuns];
          const trimmedRuns = trimArrayWithLimit(newRuns, MAX_AGENT_RUNS);

          return {
            agentRuns: trimmedRuns,
            runningAgents: new Set([...state.runningAgents, runId.toString()])
          };
        });

        return run;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to create agent run'
        });
        throw error;
      }
    },
    
    // Cancel an agent run
    cancelAgentRun: async (runId: number) => {
      try {
        await api.killAgentSession(runId);
        
        // Update local state
        set((state) => ({
          agentRuns: state.agentRuns.map((r) =>
            r.id === runId ? { ...r, status: 'cancelled' } : r
          ),
          runningAgents: new Set(
            [...state.runningAgents].filter(id => id !== runId.toString())
          )
        }));
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to cancel agent run'
        });
        throw error;
      }
    },
    
    // Delete an agent run
    deleteAgentRun: async (runId: number) => {
      try {
        // First ensure the run is cancelled if it's still running
        const run = get().agentRuns.find((r) => r.id === runId);
        if (run && (run.status === 'running' || run.status === 'pending')) {
          await api.killAgentSession(runId);
        }
        
        // Note: There's no deleteAgentRun API method, so we just remove from local state
        // The run will remain in the database but won't be shown in the UI
        
        // Update local state
        set((state) => ({
          agentRuns: state.agentRuns.filter((r) => r.id !== runId),
          runningAgents: new Set(
            [...state.runningAgents].filter(id => id !== runId.toString())
          ),
          sessionOutputs: Object.fromEntries(
            Object.entries(state.sessionOutputs).filter(([id]) => id !== runId.toString())
          )
        }));
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to delete agent run'
        });
        throw error;
      }
    },
    
    // Clear error
    clearError: () => set({ error: null }),
    
    // Handle real-time agent run updates
    handleAgentRunUpdate: (run: AgentRunWithMetrics) => {
      set((state) => {
        const existingIndex = state.agentRuns.findIndex((r) => r.id === run.id);
        const updatedRuns = [...state.agentRuns];
        
        if (existingIndex >= 0) {
          updatedRuns[existingIndex] = run;
        } else {
          updatedRuns.unshift(run);
        }
        
        const runningIds = updatedRuns
          .filter((r) => r.status === 'running' || r.status === 'pending')
          .map((r) => r.id?.toString() || '')
          .filter(Boolean);
        
        return {
          agentRuns: updatedRuns,
          runningAgents: new Set(runningIds)
        };
      });
    },
    
    // Start smart polling - only polls if there are running agents
    startPolling: (interval = POLLING_INTERVAL_DEFAULT) => {
      const { pollingInterval, stopPolling } = get();

      // Clear existing interval
      if (pollingInterval) {
        stopPolling();
      }

      // Start new interval with smart polling logic
      const newInterval = setInterval(() => {
        const { runningAgents } = get();

        // Only poll if there are running/pending agents
        if (runningAgents.size > 0) {
          get().fetchAgentRuns();
        }
      }, interval);

      set({ pollingInterval: newInterval });
    },
    
    // Stop polling
    stopPolling: () => {
      const { pollingInterval } = get();
      if (pollingInterval) {
        clearInterval(pollingInterval);
        set({ pollingInterval: null });
      }
    }
  });

export const useAgentStore = create<AgentState>()(
  subscribeWithSelector(agentStore)
);