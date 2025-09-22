
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { XIcon, Sun } from 'lucide-react';
import type { StarSystem as StarSystemType, Planet as PlanetType, Player } from '@/types/game';
import { getStarSvgFillColor } from '@/components/StarMap';

interface StarSystemDetailsPanelProps {
  selectedStarSystem: StarSystemType | undefined;
  players: Player[];
  showFogOfWar: boolean;
  onClose: () => void;
  isProductionTurn?: boolean;
}

const StarSystemDetailsPanel: React.FC<StarSystemDetailsPanelProps> = ({
  selectedStarSystem,
  players,
  showFogOfWar,
  onClose,
  isProductionTurn,
}) => {
  if (!selectedStarSystem || isProductionTurn) return null; // Hide panel during production turns

  const ownerPlayer = players.find(p => p.id === selectedStarSystem.owner);

  return (
    <Card className="w-full md:w-1/3 lg:w-1/4 xl:w-1/5 h-full flex flex-col shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{selectedStarSystem.name}</CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
        <CardDescription className="flex items-center gap-1 text-sm">
          <Sun className="w-4 h-4" style={{ color: selectedStarSystem.starColor ? getStarSvgFillColor(selectedStarSystem.starColor) : 'gray' }} />
          {selectedStarSystem.starColor || 'N/A'} Star System
        </CardDescription>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="space-y-3">
          <p className="text-sm"><span className="font-semibold">Status:</span> {selectedStarSystem.isExplored ? 'Explored' : 'Unexplored'}</p>
          {selectedStarSystem.owner && ownerPlayer && (
            <p className="text-sm">
              <span className="font-semibold">Owner:</span> <span className={ownerPlayer.color}>{ownerPlayer.name || 'Unknown'}</span>
            </p>
          )}

          {(selectedStarSystem.isExplored || !showFogOfWar) && selectedStarSystem.starCardNo && (
            <p className="text-sm"><span className="font-semibold">Star Card Ref:</span> {selectedStarSystem.starCardNo}</p>
          )}
          {selectedStarSystem.isExplored && !selectedStarSystem.starCardNo && (
            <p className="text-sm"><span className="font-semibold">Star Card Ref:</span> Anomaly (No Card Drawn)</p>
          )}
          {!selectedStarSystem.isExplored && showFogOfWar && (
            <p className="text-sm"><span className="font-semibold">Star Card Ref:</span> Hidden</p>
          )}

          <h4 className="font-semibold mt-2">Planets:</h4>
          {selectedStarSystem.isExplored ? (
            selectedStarSystem.planets.length > 0 ? (
              <ul className="space-y-2">
                {selectedStarSystem.planets.map((planet: PlanetType) => (
                  <li key={planet.id} className="text-xs p-2 border rounded-md bg-card/50">
                    <div className="font-medium">{planet.name} (Orbit {planet.orbit}, Type: {planet.type})</div>
                    <div>Max Pop: {planet.maxPopulation}M, Minerals: {planet.isMineralRich ? 'Rich' : 'Normal/Poor'}</div>
                    {planet.colony && <div>Colony Level: {planet.colony.level}</div>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-muted-foreground">(No planets or no detailed scan yet)</p>
          ) : (
            <p className="text-xs text-muted-foreground">(Details revealed upon exploration)</p>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default StarSystemDetailsPanel;
