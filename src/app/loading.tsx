import { Rocket } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <Rocket className="w-16 h-16 text-primary animate-bounce" />
      <h1 className="mt-4 text-2xl font-semibold">Loading Stellar Conquest...</h1>
      <p className="mt-2 text-muted-foreground">Prepare for galactic domination.</p>
    </div>
  );
}
