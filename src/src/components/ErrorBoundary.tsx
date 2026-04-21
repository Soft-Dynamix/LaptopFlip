"use client";
import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center gap-4">
          <div className="size-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="size-8 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button onClick={() => {
            this.setState({ hasError: false, error: null });
            // Force page reload to reset all state after HMR errors
            window.location.reload();
          }} variant="outline">
            <RefreshCw className="size-4" />
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
