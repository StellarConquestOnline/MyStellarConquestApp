'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Galactic Anomaly Detected!</h2>
      <p className="text-muted-foreground mb-1">Something went wrong in the cosmos.</p>
      <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">
        Error: {error.message}
      </p>
      <Button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
        variant="destructive"
      >
        Try to Re-align Trajectory (Retry)
      </Button>
    </div>
  );
}
