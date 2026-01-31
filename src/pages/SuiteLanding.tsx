import { useState, useEffect, Component, ReactNode } from "react";
import { useDesktopMode } from "@/hooks/useDesktopMode";
import { MobileSuiteLanding } from "@/components/suite/MobileSuiteLanding";
import { DesktopSuiteLanding } from "@/components/suite/DesktopSuiteLanding";

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: () => void;
}

class SuiteLandingErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SuiteLanding Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">Unable to load the dashboard.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function SuiteLanding() {
  const { isDesktopMode } = useDesktopMode();

  return (
    <SuiteLandingErrorBoundary>
      {isDesktopMode ? <DesktopSuiteLanding /> : <MobileSuiteLanding />}
    </SuiteLandingErrorBoundary>
  );
}
