import React from "react";
import { Terminal, Loader2 } from "lucide-react";

interface EmptyStateProps {
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ className }) => {
  return (
    <div className={`flex flex-col items-center justify-center h-full text-center ${className || ''}`}>
      <Terminal className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">Ready to Execute</h3>
      <p className="text-sm text-muted-foreground">
        Enter a task to run the agent
      </p>
    </div>
  );
};

interface LoadingStateProps {
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ className }) => {
  return (
    <div className={`flex items-center justify-center h-full ${className || ''}`}>
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm text-muted-foreground">Initializing agent...</span>
      </div>
    </div>
  );
};
