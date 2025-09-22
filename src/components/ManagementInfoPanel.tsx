
'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { XIcon, Factory, Ship, FlaskConical, Info, Users, TrendingUp, ChevronsRight, Coins, PlusCircle } from 'lucide-react';
import type { GameState, ResearchData, GameDataItem, Player, Planet, Colony, StarSystem, HexPosition } from '@/types/game';
import { parseAlphanumericCoordinate } from '@/components/StarMap'; // For parsing hex input
import { useToast } from '@/hooks/use-toast';


interface ManagementInfoPanelProps {
  activePanel: 'colonies' | 'tech' | 'production' | 'fleet' | null;
  gameState: GameState;
  currentPlayer: Player | undefined;
  onClose: () => void;
  isProductionTurn?: boolean;
  onBuildItem: (itemId: string) => void;
  onAllocateResearch: (techId: string, pointsToAllocate: number) => void;
  onCreateFleet: (targetPosition: HexPosition, shipsToAssign: Array<{ type: string; count: number }>) => void;
}

const ManagementInfoPanel: React.FC<ManagementInfoPanelProps> = ({
  activePanel,
  gameState,
  currentPlayer,
  onClose,
  isProductionTurn,
  onBuildItem,
  onAllocateResearch,
  onCreateFleet,
}) => {
  if (!activePanel) return null;

  const { toast } = useToast();
  const [researchAllocation, setResearchAllocation] = useState<Record<string, string>>({});
  const [showCreateFleetForm, setShowCreateFleetForm] = useState(false);
  const [createFleetTargetHex, setCreateFleetTargetHex] = useState<string>('');
  const [fleetScoutCount, setFleetScoutCount] = useState<string>('');
  const [fleetCorvetteCount, setFleetCorvetteCount] = useState<string>('');
  const [fleetColonyTransportCount, setFleetColonyTransportCount] = useState<string>('');


  useEffect(() => {
    if (activePanel !== 'fleet') {
      setShowCreateFleetForm(false);
      setCreateFleetTargetHex('');
      setFleetScoutCount('');
      setFleetCorvetteCount('');
      setFleetColonyTransportCount('');
    }
  }, [activePanel]);

  const handleNumericInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, maxValue?: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^[0-9\b]+$/.test(value)) {
      if (maxValue !== undefined && parseInt(value, 10) > maxValue) {
        setter(maxValue.toString());
      } else {
        setter(value);
      }
    }
  };
  
  const handleCreateFleetSubmit = () => {
    if (!currentPlayer) return;

    const targetPosition = parseAlphanumericCoordinate(createFleetTargetHex);
    if (!targetPosition) {
      toast({ title: "Invalid Hex Coordinate", description: "Please enter a valid hex coordinate (e.g., A10, AF5).", variant: "destructive"});
      return;
    }
    
    // Basic map boundary check (can be enhanced later)
    if (targetPosition.col < 0 || targetPosition.col >= gameState.mapSettings.cols ||
        targetPosition.row < 0 || targetPosition.row >= (targetPosition.col % 2 !== 0 ? gameState.mapSettings.rowsOdd : gameState.mapSettings.rowsEven) ) {
        toast({ title: "Invalid Hex Coordinate", description: "Target hex is outside map boundaries.", variant: "destructive"});
        return;
    }


    const shipsToAssign: Array<{ type: string; count: number }> = [];
    const scouts = parseInt(fleetScoutCount, 10) || 0;
    const corvettes = parseInt(fleetCorvetteCount, 10) || 0;
    const colonyTransports = parseInt(fleetColonyTransportCount, 10) || 0;

    if (scouts > 0) shipsToAssign.push({ type: 'Scout', count: scouts });
    if (corvettes > 0) shipsToAssign.push({ type: 'Corvette', count: corvettes });
    if (colonyTransports > 0) shipsToAssign.push({ type: 'ColonyTransport', count: colonyTransports });
    
    if (shipsToAssign.length > 0) {
      onCreateFleet(targetPosition, shipsToAssign);
      setShowCreateFleetForm(false);
      setCreateFleetTargetHex('');
      setFleetScoutCount('');
      setFleetCorvetteCount('');
      setFleetColonyTransportCount('');
    } else {
      toast({ title: "No Ships Selected", description: "Please assign at least one ship to the task force.", variant: "destructive"});
    }
  };


  const handleResearchAllocationChange = (techId: string, value: string) => {
    const cleanedValue = value.replace(/[^0-9]/g, ''); 
    setResearchAllocation(prev => ({ ...prev, [techId]: cleanedValue }));
  };

  const getTechIdByName = (name: string): string | undefined => {
    const foundItem = gameState.gameDataItems.find(item => item.Name === name);
    return foundItem ? foundItem.id : undefined;
  };
  
  const allResearchItems = gameState.gameDataItems
    .filter(item => item.PurchaseType === "Ship Speed Research" || item.PurchaseType === "Weapon Research" || item.PurchaseType === "Technology Research")
    .map(item => {
      let category: ResearchData['category'] = 'Unknown';
      if (item.PurchaseType === "Ship Speed Research") category = 'Ship Speed';
      else if (item.PurchaseType === "Weapon Research") category = 'Weapon';
      else if (item.PurchaseType === "Technology Research") category = 'Technology';
      
      let level = 0;
      if (typeof item.Level === 'number') level = item.Level;
      else if (typeof item.Level === 'string' && item.Level !== '') level = parseInt(item.Level, 10);
      else if (item.Level === '') level = 1; 

      return {
        ...item,
        id: item.id, 
        category,
        level,
      } as ResearchData;
    });

  const getEffectiveCost = (item: ResearchData | GameDataItem, player: Player | undefined): number => {
    if (!player) return item.IPCost;
    if (item.DiscountPrerequisit && typeof item.DiscountPrice === 'number' && item.DiscountPrice > 0) {
      const prereqTechId = getTechIdByName(item.DiscountPrerequisit);
      if (prereqTechId && player.researchedTechIds.includes(prereqTechId)) {
        return item.DiscountPrice;
      }
    }
    return item.IPCost;
  };

  const canResearchTech = (tech: ResearchData, player: Player | undefined): boolean => {
    if (!player) return false;
    if (player.researchedTechIds.includes(tech.id)) return false; 

    if (tech.ResearchPrerequisite) {
      const prereqTechId = getTechIdByName(tech.ResearchPrerequisite);
      if (!prereqTechId || !player.researchedTechIds.includes(prereqTechId)) {
        return false;
      }
    }

    if (tech.level > 1) {
      const lowerLevelTechResearchedInCategory = allResearchItems.some(
        prevTech =>
          player.researchedTechIds.includes(prevTech.id) &&
          prevTech.category === tech.category &&
          prevTech.level === tech.level - 1
      );
      if (!lowerLevelTechResearchedInCategory) {
        return false;
      }
    }
    return true;
  };

  const canBuildItem = (item: GameDataItem, player: Player | undefined, currentTurn: number): boolean => {
    if (!player) return false;

    if (currentTurn === 0) {
        if (item.PurchaseType === "Ship") {
            if (item.Name !== "Scout" && item.Name !== "Corvette") {
                return false;
            }
            if (item.Name === "Colony Transport") return false; 
        } else if (item.PurchaseType === "Planetary") {
            return false; 
        }
    }

    if (item.ResearchPrerequisite) {
      const prereqTechId = getTechIdByName(item.ResearchPrerequisite);
      if (!prereqTechId || !player.researchedTechIds.includes(prereqTechId)) {
        return false;
      }
    }
    return true;
  };

  const purchasableUnitsAndStructures = gameState.gameDataItems.filter(item =>
    (item.PurchaseType === "Ship" || item.PurchaseType === "Planetary") && canBuildItem(item, currentPlayer, gameState.turn)
  );

  const availableResearch = allResearchItems.filter(tech => canResearchTech(tech, currentPlayer));

  const relevantResearchForTechPanel = allResearchItems.filter(tech => {
    if (!currentPlayer) return false;
    return currentPlayer.researchedTechIds.includes(tech.id) || (currentPlayer.researchProgress[tech.id] || 0) > 0;
  });

  const playerOwnedColonies: { colony: Colony; planet: Planet; starSystem: StarSystem }[] = [];
  if (currentPlayer) {
    gameState.starSystems.forEach(starSystem => {
      if (starSystem.owner === currentPlayer.id) {
        starSystem.planets.forEach(planet => {
          if (planet.colony && planet.colony.playerId === currentPlayer.id) {
            playerOwnedColonies.push({ colony: planet.colony, planet, starSystem });
          }
        });
      }
    });
  }

  const handleAllocateButtonClick = (techId: string) => {
    const points = parseInt(researchAllocation[techId] || "0");
    if (points > 0) {
      onAllocateResearch(techId, points);
      setResearchAllocation(prev => ({ ...prev, [techId]: '' })); 
    }
  };

  return (
    <Card className="w-full md:w-1/3 lg:w-1/4 xl:w-1/5 h-full flex flex-col shadow-lg">
      <CardHeader>
        <CardTitle className="capitalize flex items-center justify-between">
          {activePanel === 'fleet' ? 'Fleet Management' : activePanel}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <XIcon className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent>
          {activePanel === 'production' && currentPlayer && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-1">Galactic Production</h3>
                 <CardDescription className="text-xs text-muted-foreground italic">
                  Current Player Global PP: {currentPlayer.resources.productionPoints} (for Turn 0 and emergency use)
                </CardDescription>
                 <CardDescription className="text-xs text-muted-foreground italic mt-1">
                  (PP will be managed per colony. Unused PP are lost at the end of your production actions.)
                </CardDescription>
              </div>

              <Card className="p-3 bg-muted/30">
                <CardHeader className="p-0 mb-2">
                    <CardTitle className="text-base">Production Phases (Overview)</CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-xs space-y-2 text-muted-foreground">
                    <div>
                        <h5 className="font-semibold text-sm text-foreground/80 flex items-center gap-1"><Users className="w-3 h-3" />1. Population Growth</h5>
                        {isProductionTurn && playerOwnedColonies.length > 0 ? playerOwnedColonies.map(({ colony, planet, starSystem }) => {
                            let growthAmount = 0;
                            if (planet.type === 'Terran') {
                                growthAmount = Math.floor(colony.population / 5);
                            } else if (planet.type === 'Sub Terran') {
                                growthAmount = Math.floor(colony.population / 10);
                            }
                            const newPopulation = colony.population + growthAmount;
                            const excessPopulation = Math.max(0, newPopulation - planet.maxPopulation);

                            return (
                                <div key={colony.id} className="ml-2 my-1 p-2 border-l border-muted-foreground/50 text-xs">
                                    <p className="font-medium">{colony.name} ({planet.type} on {planet.name}, {starSystem.name})</p>
                                    <p>Current Pop: {colony.population}M</p>
                                    <p>Growth: +{growthAmount}M</p>
                                    <p>New Potential Pop: {newPopulation}M (Max: {planet.maxPopulation}M)</p>
                                    {excessPopulation > 0 && <p className="text-amber-400">Excess: {excessPopulation}M (must be transported or lost)</p>}
                                </div>
                            );
                        }) : (
                           <p className="ml-2 italic text-xs">
                            {isProductionTurn ? (gameState.turn === 0 ? "No colonies established in Turn 0." : "No colonies to grow population.") : "Not a production turn."}
                           </p>
                        )}
                         <p className="text-xs mt-1 ml-2">
                            - Terran: +1M per 5M. Sub-Terran: +1M per 10M. Minimal/Barren: No growth.
                            <br/>- Excess over max pop must be transported or is lost.
                        </p>
                    </div>
                     <div>
                        <h5 className="font-semibold text-sm text-foreground/80 flex items-center gap-1"><Coins className="w-3 h-3" />2. Calculate Production Points</h5>
                        {isProductionTurn && playerOwnedColonies.length > 0 ? playerOwnedColonies.map(({ colony, planet, starSystem }) => {
                            let growthAmount = 0; 
                            if (planet.type === 'Terran') growthAmount = Math.floor(colony.population / 5);
                            else if (planet.type === 'Sub Terran') growthAmount = Math.floor(colony.population / 10);
                            
                            const populationAfterGrowth = colony.population + growthAmount;
                            let colonyPP = populationAfterGrowth + colony.factoriesCount;
                            if (planet.isMineralRich) {
                                colonyPP *= 2;
                            }

                            return (
                                <div key={`${colony.id}-pp`} className="ml-2 my-1 p-2 border-l border-muted-foreground/50 text-xs">
                                    <p className="font-medium">{colony.name} ({planet.name}, {starSystem.name})</p>
                                    <p>Pop (post-growth): {populationAfterGrowth}M (+{populationAfterGrowth} Base PP)</p>
                                    <p>Factories: {colony.factoriesCount} (+{colony.factoriesCount} Base PP)</p>
                                    <p>Mineral Rich Bonus: {planet.isMineralRich ? 'Yes (PP x2)' : 'No'}</p>
                                    <p className="font-semibold">Calculated PP for this colony: {colonyPP}</p>
                                </div>
                            );
                        }) : (
                           <p className="ml-2 italic text-xs">
                            {isProductionTurn ? (gameState.turn === 0 ? "No colonies to calculate PP for in Turn 0." : "No colonies to calculate PP for.") : "Not a production turn."}
                           </p>
                        )}
                         <p className="text-xs mt-1 ml-2">
                            - +1 PP per 1M pop (after growth). +1 PP per factory.
                            <br/>- Mineral Rich planets: Double total PP for that colony.
                            <br/>- (Note: Game currently uses global PP for spending).
                        </p>
                    </div>
                     <div>
                        <h5 className="font-semibold text-sm text-foreground/80 flex items-center gap-1"><ChevronsRight className="w-3 h-3" />3. Build Colony Transports for Emigration</h5>
                         <p className="ml-2 italic text-xs">(Not Implemented Yet)</p>
                         <p className="text-xs mt-1 ml-2">
                            - Cost: 1PP per transport. Reduces colony pop by 1M (excess first).
                            <br/>- Emigration Bonus: +1M bonus pop (on own transport) for every 3M from growth emigrated. Max 3M bonus.
                        </p>
                    </div>
                     <div>
                        <h5 className="font-semibold text-sm text-foreground/80 flex items-center gap-1"><Factory className="w-3 h-3" />4. Spend Production Points</h5>
                        <p className="ml-2 italic text-xs">(Using Global PP for now. Per-colony spending and item placement not implemented)</p>
                         <p className="text-xs mt-1 ml-2">
                            - Ships/Planetary: Pay in full by one colony. Items appear at that colony.
                            <br/>- Research: Can be funded across colonies/turns.
                        </p>
                    </div>
                </CardContent>
              </Card>

              <div>
                <h4 className="font-semibold text-md mb-2 flex items-center gap-1"><Ship className="w-4 h-4 text-primary" />Build Units & Structures</h4>
                {purchasableUnitsAndStructures.length > 0 ? purchasableUnitsAndStructures.map(item => (
                  <Card key={item.id} className="p-3 mb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.Name} ({item.PurchaseType}) {item.Quantity && typeof item.Quantity === 'number' && item.Quantity > 1 ? `(x${item.Quantity})`:``}</p>
                        <p className="text-xs text-muted-foreground">Cost: {getEffectiveCost(item, currentPlayer)} PP</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => onBuildItem(item.id)}
                        disabled={!isProductionTurn || (currentPlayer?.resources.productionPoints ?? 0) < getEffectiveCost(item, currentPlayer)}
                      >
                        Build
                      </Button>
                    </div>
                    {item.Note && <p className="text-xs text-muted-foreground mt-1 italic"><Info size={12} className="inline mr-1"/>{item.Note}</p>}
                    {!canBuildItem(item, currentPlayer, gameState.turn) && item.ResearchPrerequisite && (
                        <p className="text-xs text-amber-500 mt-1">Requires: {item.ResearchPrerequisite}</p>
                    )}
                     {gameState.turn === 0 && item.PurchaseType === "Ship" && item.Name === "Colony Transport" && (
                        <p className="text-xs text-amber-500 mt-1">Colony Transports cannot be built in Turn 0.</p>
                    )}
                     {gameState.turn === 0 && item.PurchaseType === "Planetary" && (
                        <p className="text-xs text-amber-500 mt-1">Planetary items cannot be built in Turn 0.</p>
                    )}
                  </Card>
                )) : <p className="text-xs text-muted-foreground text-center py-2">No items available to build (check research, turn number, or game phase).</p>}
              </div>

              <div>
                <h4 className="font-semibold text-md mb-2 flex items-center gap-1"><FlaskConical className="w-4 h-4 text-primary"/>Available Research</h4>
                {availableResearch.length > 0 ? availableResearch.map(tech => {
                  const currentProgress = currentPlayer.researchProgress[tech.id] || 0;
                  const effectiveCost = getEffectiveCost(tech, currentPlayer);
                  const remainingCost = Math.max(0, effectiveCost - currentProgress);
                  const allocationAmount = parseInt(researchAllocation[tech.id] || "0");
                  return (
                    <Card key={tech.id} className="p-3 mb-2">
                      <p className="font-medium">{tech.Name} <span className="text-xs text-muted-foreground">({tech.category}, Lvl {tech.level})</span></p>
                      <p className="text-xs text-muted-foreground">
                        Cost: {effectiveCost} PP {effectiveCost < tech.IPCost ? `(Discounted from ${tech.IPCost} PP)` : ''}
                      </p>
                       <div className="w-full bg-muted-foreground/20 rounded-full h-2.5 my-1">
                          <div className="bg-accent h-2.5 rounded-full" style={{ width: `${effectiveCost > 0 ? (currentProgress / effectiveCost) * 100 : 0}%` }}></div>
                      </div>
                      <p className="text-xs">{currentProgress}/{effectiveCost} RP accumulated. ({remainingCost} PP to complete)</p>
                      {tech.Note && <p className="text-xs text-muted-foreground mt-1 italic"><Info size={12} className="inline mr-1"/>{tech.Note}</p>}
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                            type="text" 
                            pattern="[0-9]*"
                            inputMode="numeric"
                            min="0"
                            max={Math.min(currentPlayer.resources.productionPoints, remainingCost)}
                            placeholder="PP to spend"
                            value={researchAllocation[tech.id] || ''}
                            onChange={(e) => handleResearchAllocationChange(tech.id, e.target.value)}
                            className="h-8 text-xs"
                            disabled={!isProductionTurn || remainingCost === 0 || playerOwnedColonies.length > 0 }
                        />
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            className="h-8 text-xs" 
                            onClick={() => handleAllocateButtonClick(tech.id)}
                            disabled={
                                !isProductionTurn || 
                                remainingCost === 0 || 
                                allocationAmount <= 0 ||
                                allocationAmount > Math.min(currentPlayer.resources.productionPoints, remainingCost) ||
                                playerOwnedColonies.length > 0 
                            }
                        >
                            Allocate
                        </Button>
                      </div>
                       {!canResearchTech(tech, currentPlayer) && tech.ResearchPrerequisite && (
                         <p className="text-xs text-amber-500 mt-1">Requires Tech: {tech.ResearchPrerequisite}</p>
                       )}
                       {!canResearchTech(tech, currentPlayer) && tech.level > 1 && !allResearchItems.some( prevTech => currentPlayer.researchedTechIds.includes(prevTech.id) && prevTech.category === tech.category && prevTech.level === tech.level - 1) && (
                         <p className="text-xs text-amber-500 mt-1">Requires Level {tech.level-1} {tech.category} tech.</p>
                       )}
                       {playerOwnedColonies.length > 0 && (
                         <p className="text-xs text-amber-500 mt-1">Research allocation will be per-colony soon.</p>
                       )}
                    </Card>
                  );
                }) : <p className="text-xs text-muted-foreground text-center py-2">No new research available (check prerequisites or levels).</p>}
              </div>
            </div>
          )}

          {activePanel === 'fleet' && currentPlayer && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Organize and dispatch your fleets.</p>
              
              <Card className="p-3 bg-muted/30">
                <CardHeader className="p-0 mb-2">
                    <CardTitle className="text-base">Unassigned Ships</CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-xs space-y-1">
                    <p>Scouts: {currentPlayer?.resources.unassignedScouts ?? 0}</p>
                    <p>Corvettes: {currentPlayer?.resources.unassignedCorvettes ?? 0}</p>
                    <p>Colony Transports: {currentPlayer?.resources.unassignedColonyTransports ?? 0}</p>
                </CardContent>
              </Card>

              {!showCreateFleetForm && (
                <Button 
                    className="w-full" 
                    onClick={() => setShowCreateFleetForm(true)}
                    disabled={isProductionTurn}
                >
                    <PlusCircle className="w-4 h-4 mr-2"/> Create New Task Force
                </Button>
              )}

              {showCreateFleetForm && (
                <Card className="p-4 space-y-3">
                    <CardTitle className="text-md">New Task Force</CardTitle>
                    <div>
                        <Label htmlFor="targetHex" className="text-xs">Target Hex Coordinate</Label>
                        <Input 
                            id="targetHex"
                            placeholder="e.g., A10 or AF5"
                            value={createFleetTargetHex}
                            onChange={(e) => setCreateFleetTargetHex(e.target.value.toUpperCase())}
                            className="mt-1 h-8 text-xs"
                            disabled={isProductionTurn}
                        />
                    </div>
                    <div>
                        <Label htmlFor="scoutCount" className="text-xs">Scouts (Available: {currentPlayer.resources.unassignedScouts || 0})</Label>
                        <Input 
                            id="scoutCount" type="text" pattern="[0-9]*" inputMode="numeric" 
                            value={fleetScoutCount} 
                            onChange={handleNumericInputChange(setFleetScoutCount, currentPlayer.resources.unassignedScouts || 0)}
                            placeholder="0" 
                            className="mt-1 h-8 text-xs"
                            disabled={isProductionTurn || (currentPlayer.resources.unassignedScouts || 0) === 0}
                        />
                    </div>
                    <div>
                        <Label htmlFor="corvetteCount" className="text-xs">Corvettes (Available: {currentPlayer.resources.unassignedCorvettes || 0})</Label>
                        <Input 
                            id="corvetteCount" type="text" pattern="[0-9]*" inputMode="numeric"
                            value={fleetCorvetteCount} 
                            onChange={handleNumericInputChange(setFleetCorvetteCount, currentPlayer.resources.unassignedCorvettes || 0)}
                            placeholder="0" 
                            className="mt-1 h-8 text-xs"
                            disabled={isProductionTurn || (currentPlayer.resources.unassignedCorvettes || 0) === 0}
                        />
                    </div>
                    <div>
                        <Label htmlFor="colonyTransportCount" className="text-xs">Colony Transports (Available: {currentPlayer.resources.unassignedColonyTransports || 0})</Label>
                        <Input 
                            id="colonyTransportCount" type="text" pattern="[0-9]*" inputMode="numeric"
                            value={fleetColonyTransportCount} 
                            onChange={handleNumericInputChange(setFleetColonyTransportCount, currentPlayer.resources.unassignedColonyTransports || 0)}
                            placeholder="0" 
                            className="mt-1 h-8 text-xs"
                            disabled={isProductionTurn || (currentPlayer.resources.unassignedColonyTransports || 0) === 0}
                        />
                    </div>
                    <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => setShowCreateFleetForm(false)} className="flex-1 text-xs h-8">Cancel</Button>
                        <Button 
                            size="sm" 
                            onClick={handleCreateFleetSubmit} 
                            className="flex-1 text-xs h-8"
                            disabled={
                                isProductionTurn ||
                                !createFleetTargetHex.trim() ||
                                ((parseInt(fleetScoutCount,10) || 0) === 0 && (parseInt(fleetCorvetteCount,10) || 0) === 0 && (parseInt(fleetColonyTransportCount,10) || 0) === 0)
                            }
                        >
                            Confirm Create
                        </Button>
                    </div>
                </Card>
              )}
              
              <div className="mt-4 space-y-2">
                <h4 className="font-semibold text-md">Deployed Task Forces</h4>
                {gameState.fleets.filter(f => f.owner === currentPlayer?.id).length > 0 ? 
                  gameState.fleets.filter(f => f.owner === currentPlayer?.id).map(fleet => (
                    <Card key={fleet.id} className="p-3">
                      <p className="font-semibold text-sm">Task Force ID: ...{fleet.id.slice(-6)}</p>
                      <p className="text-xs text-muted-foreground">Location: Column {fleet.position.col +1 }, Row {fleet.position.row +1}</p>
                      <ul className="text-xs list-disc list-inside pl-1 mt-1">
                        {fleet.ships.map(ship => <li key={ship.type}>{ship.count}x {ship.type}</li>)}
                      </ul>
                      <Button size="sm" variant="secondary" className="mt-2 w-full text-xs h-8" disabled={isProductionTurn}>Manage Fleet</Button>
                    </Card>
                  ))
                  : <p className="text-xs text-muted-foreground text-center py-2">No task forces deployed yet.</p>
                }
              </div>
            </div>
          )}


          {activePanel === 'colonies' && (
             <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Manage your established colonies.</p>
              <div data-ai-hint="planet colony buildings" className="w-full h-32 bg-muted rounded-md flex items-center justify-center">
                <Image src="https://placehold.co/300x200.png" alt="Colony placeholder" width={150} height={100} className="rounded" />
              </div>
              {playerOwnedColonies.length > 0 ?
                playerOwnedColonies.map(({colony, planet, starSystem}) => (
                    <Card key={colony.id} className="p-3 mb-2">
                        <p className="font-medium">{colony.name} <span className="text-xs text-muted-foreground">({planet.type} on {planet.name}, {starSystem.name})</span></p>
                        <p className="text-xs">Population: {colony.population}M / {planet.maxPopulation}M</p>
                        <p className="text-xs">Factories: {colony.factoriesCount}</p>
                        <p className="text-xs">Local PP: {colony.productionPoints}</p>
                        <Button size="sm" variant="outline" className="w-full mt-1 text-xs" disabled>Manage Colony (Not Impl.)</Button>
                    </Card>
                ))
                : <p className="text-xs text-muted-foreground text-center py-2">No colonies established yet.</p>
              }
            </div>
          )}

          {activePanel === 'tech' && currentPlayer && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Overview of your researched and in-progress technologies.</p>
              {relevantResearchForTechPanel.length > 0 ? relevantResearchForTechPanel.map(tech => {
                const progress = currentPlayer.researchProgress[tech.id] || 0;
                const isResearched = currentPlayer.researchedTechIds.includes(tech.id);
                const effectiveCost = getEffectiveCost(tech, currentPlayer);
                return (
                    <Card key={tech.id} className="p-3">
                      <p className="font-semibold">{tech.Name} <span className="text-xs text-muted-foreground">({tech.category}, Lvl {tech.level})</span></p>
                      <p className="text-xs text-muted-foreground">{tech.Note || "No description provided."}</p>
                      <div className="w-full bg-muted-foreground/20 rounded-full h-2.5 my-1">
                          <div className="bg-accent h-2.5 rounded-full" style={{ width: `${effectiveCost > 0 ? (progress / effectiveCost) * 100 : 0}%` }}></div>
                      </div>
                      <p className="text-xs">{isResearched ? "Completed" : `${progress}/${effectiveCost} RP accumulated`}</p>
                    </Card>
                );
                }) : <p className="text-xs text-muted-foreground text-center py-2">No research completed or in progress.</p>}
            </div>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default ManagementInfoPanel;

    