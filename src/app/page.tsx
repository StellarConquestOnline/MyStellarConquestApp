
import GameClient from '@/components/GameClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stellar Conquest - Game Board',
  description: 'Engage in interstellar strategy and conquer the galaxy.',
};

export default function HomePage() {
  return <GameClient />;
}
