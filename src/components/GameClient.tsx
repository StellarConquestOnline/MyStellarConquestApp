
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import StarMap, { parseAlphanumericCoordinate, hexDistance } from '@/components/StarMap';
import TutorialAssistantDialog from '@/components/TutorialAssistantDialog';
import MultiplayerPanel from '@/components/MultiplayerPanel';
import StarSystemDetailsPanel from '@/components/StarSystemDetailsPanel';
import ManagementInfoPanel from '@/components/ManagementInfoPanel';

import type { GameState, Player, StarSystem as StarSystemType, Fleet as FleetType, Planet as PlanetType, GameSessionData, GameDataItem, ResearchData, HexPosition, CommandPost } from '@/types/game';
import {
  Users,
  Orbit,
  FlaskConical,
  Bot,
  Rocket,
  Factory,
  ChevronRight,
  History,
  Settings,
  PanelLeft,
  Eye,
  EyeOff,
  Network,
  PlusSquare,
  LogIn,
  Warehouse,
  Ship,
  Loader2,
  Move,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  initialGameState as baseInitialGameState,
  initialStarSystems,
  initialEntryPoints,
  MIN_PLAYERS_TO_START,
  INITIAL_TURN_0_PRODUCTION_POINTS,
  REGULAR_PRODUCTION_POINTS,
  PRODUCTION_TURN_INTERVAL
} from '@/data/game-init-data';
import { useGameSessionManagement } from '@/hooks/useGameSessionManagement';

// Helper function to calculate fleet speed
const calculatePlayerFleetSpeed = (player: Player | undefined, gameDataItems: GameDataItem[]): number => {
  const baseSpeed = 2;
  let maxSpeedBonus = 0;

  if (player && player.researchedTechIds && gameDataItems) {
    player.researchedTechIds.forEach(techId => {
      const techItem = gameDataItems.find(item => item.id === techId);
      if (techItem && techItem.PurchaseType === "Ship Speed Research") {
        const bonus = Number(techItem.ShipSpeedBonus);
        if (!isNaN(bonus) && bonus > maxSpeedBonus) {
          maxSpeedBonus = bonus;
        }
      }
    });
  }
  return baseSpeed + maxSpeedBonus;
};


const GameClient = () => {
  const initialGameStateRef = useRef(JSON.parse(JSON.stringify(baseInitialGameState)));
  const [gameState, setGameState] = useState<GameState>(initialGameStateRef.current);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [activeManagementPanel, setActiveManagementPanel] = useState<'colonies' | 'tech' | 'production' | 'fleet' | null>(null);
  const [activeMultiplayerPanel, setActiveMultiplayerPanel] = useState<'create' | 'join' | null>(null);
  const [showFogOfWar, setShowFogOfWar] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [selectedStarSystemId, setSelectedStarSystemId] = useState<string | null>(null);
  const [selectedFleetId, setSelectedFleetId] = useState<string | null>(null);
  const [isMovingFleet, setIsMovingFleet] = useState(false);

  const { toast } = useToast();
  const prevTurnRef = useRef<number>(gameState.turn);
  const prevPlayerIdRef = useRef<string | null>(gameState.currentPlayerId);


  const gameSession = useGameSessionManagement({ gameState, setGameState, initialGameStateRef });
  const {
    createdGameCode,
    hostName, setHostName,
    isPrivateGame, setIsPrivateGame,
    joinGameCode, setJoinGameCode,
    joiningPlayerName, setJoiningPlayerName,
    publicGamesList,
    isLoadingPublicGames,
    firestoreGameStatus,
    localUserPlayerId,
    isEndingTurn,
    isAttemptingRejoin,
    fetchPublicGames,
    handleCreateGameSession,
    handleJoinGame,
    handleJoinListedGame,
    handleStartGame,
    handleCancelGame,
    handleEndTurn,
  } = gameSession;


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (firestoreGameStatus === 'In Progress' && gameState.gamePhase === 'playing' && gameState.players.length > 0 && gameState.gameId) {
        const needsBoardInit = gameState.starSystems === initialGameStateRef.current.starSystems ||
                               (gameState.fleets.length === 0 && gameState.players.some(p => p.entryPointId)) ||
                               (gameState.commandPosts.length === 0 && gameState.players.length > 0);


        if (needsBoardInit) {
            let newLocalStarSystems = initialStarSystems.map(ss => ({
                ...ss,
                isExplored: false,
                owner: undefined,
                planets: [],
            }));

            const playersFromGameState = gameState.players;
            let newLocalFleets: FleetType[] = [];
            let newLocalCommandPosts: CommandPost[] = [];

            playersFromGameState.forEach(player => {
                const entryPoint = initialEntryPoints.find(ep => ep.id === player.entryPointId);
                if (entryPoint) {
                    const entrySystemIndex = newLocalStarSystems.findIndex(ss =>
                        ss.position.col === entryPoint.position.col && ss.position.row === entryPoint.position.row
                    );
                    if (entrySystemIndex !== -1) {
                        newLocalStarSystems[entrySystemIndex] = {
                            ...newLocalStarSystems[entrySystemIndex],
                            isExplored: true,
                            owner: player.id,
                        };
                    }
                    
                    if (!gameState.fleets.some(f => f.owner === player.id && f.position.col === entryPoint.position.col && f.position.row === entryPoint.position.row)) {
                        newLocalFleets.push({
                            id: `fleet_start_${player.id}_${Date.now()}`,
                            owner: player.id,
                            ships: [
                                { type: 'Scout', count: player.resources.unassignedScouts || 0 },
                                { type: 'Corvette', count: player.resources.unassignedCorvettes || 0 },
                                { type: 'ColonyTransport', count: player.resources.unassignedColonyTransports || 0 },
                            ].filter(s => s.count > 0), 
                            position: entryPoint.position,
                        });
                    }
                     
                    if (!gameState.commandPosts.some(cp => cp.owner === player.id && cp.position.col === entryPoint.position.col && cp.position.row === entryPoint.position.row)) {
                        newLocalCommandPosts.push({
                            id: `cmd_post_${player.id}_initial_${Date.now()}`,
                            owner: player.id,
                            position: entryPoint.position,
                        });
                    }
                }
            });

            setGameState(prev => ({
                ...prev,
                starSystems: newLocalStarSystems,
                fleets: prev.fleets.length > 0 ? prev.fleets : newLocalFleets.filter(f => f.ships.length > 0),
                commandPosts: prev.commandPosts.length > 0 ? prev.commandPosts : newLocalCommandPosts, 
            }));
            setActiveMultiplayerPanel(null);
            setActiveManagementPanel(null);
        }
    }
  }, [firestoreGameStatus, gameState.gamePhase, gameState.gameId, gameState.players, gameState.starSystems, gameState.fleets, gameState.commandPosts, setGameState, initialGameStateRef]);


  useEffect(() => {
    if (gameState.gamePhase !== 'playing' || !isClient || gameState.players.length === 0) return;

    const currentTurn = gameState.turn;
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    const isGameTurnChange = prevTurnRef.current !== currentTurn;

    if (isGameTurnChange) {
      if (currentTurn === 0 && prevTurnRef.current === -1) { 
        toast({ title: `Game Turn 0: Initial Production Phase!`, description: `All players receive ${INITIAL_TURN_0_PRODUCTION_POINTS} PP.` });
        setGameState(prev => ({
          ...prev,
          players: prev.players.map(player => ({
            ...player,
            resources: {
              ...player.resources,
              productionPoints: INITIAL_TURN_0_PRODUCTION_POINTS,
            }
          }))
        }));
      } else if (currentTurn > 0) { 
        if (currentTurn % PRODUCTION_TURN_INTERVAL === 0) { 
          toast({ title: `Game Turn ${currentTurn}: Production Phase!`, description: `All players receive ${REGULAR_PRODUCTION_POINTS} PP.` });
          setGameState(prev => ({
            ...prev,
            players: prev.players.map(player => ({
              ...player,
              resources: {
                ...player.resources,
                productionPoints: player.resources.productionPoints + REGULAR_PRODUCTION_POINTS,
              }
            }))
          }));
        } else { 
          toast({ title: `Game Turn ${currentTurn} begins.` });
        }
      }
    }

    if (!isGameTurnChange && prevPlayerIdRef.current !== gameState.currentPlayerId && currentPlayer) {
      const currentTurnIsProduction = currentTurn === 0 || (currentTurn > 0 && currentTurn % PRODUCTION_TURN_INTERVAL === 0);
      if (currentTurnIsProduction) {
        toast({ title: `Production - Player Turn: ${currentPlayer.name}` });
      } else {
        toast({ title: `Player Turn: ${currentPlayer.name}` });
      }
    }

    prevTurnRef.current = currentTurn;
    prevPlayerIdRef.current = gameState.currentPlayerId;

  }, [gameState.turn, gameState.currentPlayerId, gameState.gamePhase, gameState.players, toast, setGameState, isClient]);


  const isCurrentTurnAProductionGameTurn = gameState.gamePhase === 'playing' && (gameState.turn === 0 || (gameState.turn > 0 && gameState.turn % PRODUCTION_TURN_INTERVAL === 0));

  const getTechIdByName = (name: string): string | undefined => {
    const foundItem = gameState.gameDataItems.find(item => item.Name === name);
    return foundItem ? foundItem.id : undefined;
  };

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

  const handleBuildItem = (itemId: string) => {
    const itemToBuild = gameState.gameDataItems.find(item => item.id === itemId);
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);

    if (!itemToBuild || !currentPlayer) {
      toast({ title: "Build Error", description: "Item or player not found.", variant: "destructive" });
      return;
    }

    const cost = getEffectiveCost(itemToBuild, currentPlayer);

    if (currentPlayer.resources.productionPoints < cost) {
      toast({ title: "Insufficient PP", description: `Not enough Production Points to build ${itemToBuild.Name}. Need ${cost} PP.`, variant: "destructive" });
      return;
    }

    setGameState(prev => {
      const updatedPlayers = prev.players.map(p => {
        if (p.id === currentPlayer.id) {
          let updatedResources = { ...p.resources, productionPoints: p.resources.productionPoints - cost };

          if (itemToBuild.PurchaseType === "Ship") {
            const quantity = typeof itemToBuild.Quantity === 'number' ? itemToBuild.Quantity : 1;
            if (itemToBuild.Name === "Scout") {
              updatedResources.unassignedScouts = (updatedResources.unassignedScouts || 0) + quantity;
            } else if (itemToBuild.Name === "Corvette") {
              updatedResources.unassignedCorvettes = (updatedResources.unassignedCorvettes || 0) + quantity;
            } else if (itemToBuild.Name === "Colony Transport") {
              updatedResources.unassignedColonyTransports = (updatedResources.unassignedColonyTransports || 0) + quantity;
            }
          }
          return { ...p, resources: updatedResources };
        }
        return p;
      });
      return { ...prev, players: updatedPlayers };
    });

    toast({ title: "Item Built!", description: `${itemToBuild.Name} successfully built. Cost: ${cost} PP.` });
  };

  const handleAllocateResearch = (techId: string, pointsToAllocate: number) => {
    const techToResearch = gameState.gameDataItems.find(item => item.id === techId) as ResearchData | undefined;
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);

    if (!techToResearch || !currentPlayer) {
      toast({ title: "Research Error", description: "Technology or player not found.", variant: "destructive" });
      return;
    }

    if (pointsToAllocate <= 0) {
        toast({ title: "Invalid Allocation", description: "Points to allocate must be greater than zero.", variant: "destructive" });
        return;
    }

    const effectiveCost = getEffectiveCost(techToResearch, currentPlayer);
    const currentProgress = currentPlayer.researchProgress[techId] || 0;
    const remainingCost = Math.max(0, effectiveCost - currentProgress);

    if (pointsToAllocate > remainingCost) {
      toast({ title: "Allocation Error", description: `Cannot allocate more than remaining cost (${remainingCost} PP).`, variant: "destructive" });
      return;
    }

    if (currentPlayer.resources.productionPoints < pointsToAllocate) {
      toast({ title: "Insufficient PP", description: `Not enough Production Points. Need ${pointsToAllocate} PP.`, variant: "destructive" });
      return;
    }

    setGameState(prev => {
      const updatedPlayers = prev.players.map(p => {
        if (p.id === currentPlayer.id) {
          const newProgress = currentProgress + pointsToAllocate;
          const updatedResearchProgress = { ...p.researchProgress, [techId]: newProgress };
          let updatedResearchedTechIds = [...p.researchedTechIds];

          if (newProgress >= effectiveCost) {
            if (!updatedResearchedTechIds.includes(techId)) {
              updatedResearchedTechIds.push(techId);
            }
            updatedResearchProgress[techId] = effectiveCost;
          }

          return {
            ...p,
            resources: { ...p.resources, productionPoints: p.resources.productionPoints - pointsToAllocate },
            researchProgress: updatedResearchProgress,
            researchedTechIds: updatedResearchedTechIds,
          };
        }
        return p;
      });
      return { ...prev, players: updatedPlayers };
    });

    if ((currentProgress + pointsToAllocate) >= effectiveCost) {
        toast({ title: "Research Complete!", description: `${techToResearch.Name} has been researched.` });
    } else {
        toast({ title: "Research Progress", description: `${pointsToAllocate} PP allocated to ${techToResearch.Name}.` });
    }
  };

  const handleCreateFleet = (targetPosition: HexPosition, shipsToAssign: Array<{ type: string; count: number }>) => {
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);

    if (!currentPlayer) {
      toast({ title: "Fleet Creation Error", description: "Current player not found.", variant: "destructive" });
      return;
    }

    const validShipsToAssign = shipsToAssign.filter(s => s.count > 0);
    if (validShipsToAssign.length === 0) {
      toast({ title: "Fleet Creation Error", description: "No ships selected to assign to the fleet.", variant: "destructive" });
      return;
    }

    let canCreate = true;
    let tempResources = { ...currentPlayer.resources };
    for (const ship of validShipsToAssign) {
      if (ship.type === 'Scout' && (tempResources.unassignedScouts || 0) < ship.count) canCreate = false;
      else if (ship.type === 'Corvette' && (tempResources.unassignedCorvettes || 0) < ship.count) canCreate = false;
      else if (ship.type === 'ColonyTransport' && (tempResources.unassignedColonyTransports || 0) < ship.count) canCreate = false;
      if (!canCreate) break;
    }

    if (!canCreate) {
      toast({ title: "Insufficient Ships", description: "Not enough unassigned ships of the selected types.", variant: "destructive" });
      return;
    }

    setGameState(prev => {
      const updatedPlayers = prev.players.map(p => {
        if (p.id === currentPlayer.id) {
          const updatedResources = { ...p.resources };
          validShipsToAssign.forEach(ship => {
            if (ship.type === 'Scout') updatedResources.unassignedScouts = (updatedResources.unassignedScouts || 0) - ship.count;
            else if (ship.type === 'Corvette') updatedResources.unassignedCorvettes = (updatedResources.unassignedCorvettes || 0) - ship.count;
            else if (ship.type === 'ColonyTransport') updatedResources.unassignedColonyTransports = (updatedResources.unassignedColonyTransports || 0) - ship.count;
          });
          return { ...p, resources: updatedResources };
        }
        return p;
      });

      const newFleet: FleetType = {
        id: `fleet_${currentPlayer.id}_${Date.now()}`,
        owner: currentPlayer.id,
        ships: validShipsToAssign,
        position: targetPosition,
      };

      return { ...prev, players: updatedPlayers, fleets: [...prev.fleets, newFleet] };
    });

    toast({ title: "Task Force Created!", description: `New task force assembled at Hex (${targetPosition.col +1}, ${targetPosition.row + 1}).` });
  };


  const handleStarSystemClick = (systemId: string) => {
    if (isCurrentTurnAProductionGameTurn && !isMovingFleet) {
        toast({ title: "Production Turn Actions Only", description: "Movement and exploration are not allowed during a production turn.", variant: "default" });
        return;
    }

    const clickedSystem = gameState.starSystems.find(s => s.id === systemId);
    if (!clickedSystem) return;

    const playerFleetInSystem = gameState.fleets.find(f =>
      f.owner === gameState.currentPlayerId &&
      f.position.col === clickedSystem.position.col &&
      f.position.row === clickedSystem.position.row
    );

    if (!clickedSystem.isExplored && gameState.currentPlayerId && playerFleetInSystem) {
        let alertMessages: string[] = [];
        const hasCorvette = playerFleetInSystem.ships.some(s => s.type === 'Corvette' || s.type === 'Fighter' || s.type === 'Death Star');
        let updatedShips = JSON.parse(JSON.stringify(playerFleetInSystem.ships));
        let fleetModified = false;

        if (!hasCorvette) {
            const shipsAtRisk = playerFleetInSystem.ships.filter(s => s.type === 'Scout' || s.type === 'ColonyTransport');
            shipsAtRisk.forEach(shipType => {
                for (let i = 0; i < shipType.count; i++) {
                    const roll = Math.floor(Math.random() * 6) + 1;
                    if (roll === 1) {
                        const shipIndex = updatedShips.findIndex((s: { type: string, count: number }) => s.type === shipType.type);
                        if (shipIndex !== -1 && updatedShips[shipIndex].count > 0) {
                            updatedShips[shipIndex].count--;
                            alertMessages.push(`A ${shipType.type} was lost to an anomaly in ${clickedSystem.name}! (Rolled a 1)`);
                            fleetModified = true;
                            if (updatedShips[shipIndex].count === 0) {
                                updatedShips.splice(shipIndex, 1);
                            }
                        }
                    }
                }
            });
        }

        if (fleetModified) {
            setGameState(prev => ({
                ...prev,
                fleets: prev.fleets.map(f => f.id === playerFleetInSystem.id ? { ...f, ships: updatedShips.filter((s: { type: string, count: number }) => s.count > 0) } : f).filter(f => f.ships.length > 0)
            }));
        }

        if (alertMessages.length > 0) {
          toast({
              title: "Exploration Hazard!",
              description: (
                  <ScrollArea className="h-20">
                      {alertMessages.map((msg, i) => <p key={i} className="text-xs">{msg}</p>)}
                  </ScrollArea>
              ),
              variant: "destructive"
          });
        }

        setGameState(prev => {
          const updatedSystems = prev.starSystems.map(s => {
            if (s.id === systemId) {
              let planetsToAssign: PlanetType[] = [];
              let cardNoToAssign = s.starCardNo;
              if (!cardNoToAssign) {
                  cardNoToAssign = `SC-${Math.floor(Math.random() * 100) + 1}`;
              }
              if (s.starColor === 'Blue') {
                planetsToAssign = [{ id: `${s.id}-p1`, name: `${s.name} I`, type: 'Barren', orbit: 1, maxPopulation: 0, isMineralRich: true }];
              } else if (s.starColor === 'Green') {
                 planetsToAssign = [{ id: `${s.id}-p1`, name: `${s.name} I`, type: 'Minimal Terran', orbit: 2, maxPopulation: 10, isMineralRich: false }];
              } else if (s.starColor === 'Yellow' && Math.random() < 0.3) { 
                 planetsToAssign = [{ id: `${s.id}-p1`, name: `${s.name} I`, type: 'Terran', orbit: Math.floor(Math.random() * 3) + 2, maxPopulation: 50 + Math.floor(Math.random() * 50), isMineralRich: Math.random() < 0.2 }];
              }

              return {
                ...s,
                isExplored: true,
                owner: gameState.currentPlayerId,
                starCardNo: cardNoToAssign,
                planets: s.planets.length > 0 ? s.planets : planetsToAssign
              };
            }
            return s;
          });
          return { ...prev, starSystems: updatedSystems };
        });
    }
    setSelectedStarSystemId(prevId => (prevId === systemId ? null : systemId));
    if (activeManagementPanel && !isCurrentTurnAProductionGameTurn) setActiveManagementPanel(null);
    if (activeMultiplayerPanel) setActiveMultiplayerPanel(null);
    if (isMovingFleet) { // If in fleet movement mode, clicking a star system is a move attempt
        handleMapElementClick(systemId, 'star-system', clickedSystem.position);
    } else {
        setSelectedStarSystemId(prevId => (prevId === systemId ? null : systemId));
        if (activeManagementPanel && !isCurrentTurnAProductionGameTurn) setActiveManagementPanel(null);
        if (activeMultiplayerPanel) setActiveMultiplayerPanel(null);
    }
  };
  
  const handleMapElementClick = (id: string | null, type: 'star-system' | 'fleet' | 'hex', position?: HexPosition) => {
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    if (!currentPlayer || isCurrentTurnAProductionGameTurn) return;
  
    if (!isMovingFleet) { // Phase 1: Selecting a fleet to move
      if (type === 'fleet' && id) {
        const fleet = gameState.fleets.find(f => f.id === id);
        if (fleet && fleet.owner === gameState.currentPlayerId) {
          setSelectedFleetId(id);
          setIsMovingFleet(true);
          setSelectedStarSystemId(null); // Deselect star system when selecting fleet
          setActiveManagementPanel(null);
          toast({ title: "Fleet Selected", description: `Task Force ${id.slice(-4)} ready for orders. Click destination hex.` });
        } else if (fleet) {
          toast({ title: "Cannot Select Fleet", description: "This is not your fleet.", variant: "destructive" });
        }
      } else if (type === 'star-system' && id) {
        // Normal star system click for details/exploration if not moving
        handleStarSystemClick(id);
      }
    } else { // Phase 2: Fleet selected, now selecting a destination
      if ((type === 'hex' || type === 'star-system') && position && selectedFleetId) {
        const fleetToMove = gameState.fleets.find(f => f.id === selectedFleetId);
        if (!fleetToMove) {
          setIsMovingFleet(false);
          setSelectedFleetId(null);
          return;
        }
  
        const playerSpeed = calculatePlayerFleetSpeed(currentPlayer, gameState.gameDataItems);
        const distance = hexDistance(fleetToMove.position, position);
  
        // Command Post Range Check (Simplified)
        let inCommandRange = true;
        const isScoutFleet = fleetToMove.ships.every(s => s.type === 'Scout'); // True if ONLY scouts
        if (!isScoutFleet) {
          const nearestCmdPostDist = Math.min(
            ...gameState.commandPosts
              .filter(cp => cp.owner === currentPlayer.id)
              .map(cp => hexDistance(position, cp.position))
          );
          if (nearestCmdPostDist > 8) {
            inCommandRange = false;
          }
        }
  
        if (distance <= playerSpeed && inCommandRange) {
          setGameState(prev => ({
            ...prev,
            fleets: prev.fleets.map(f =>
              f.id === selectedFleetId ? { ...f, position: position! } : f
            ),
          }));
  
          // Trigger exploration if moved into an unexplored star system
          if (type === 'star-system' && id) {
            const targetSystem = gameState.starSystems.find(s => s.id === id);
            if (targetSystem && !targetSystem.isExplored) {
                handleStarSystemClick(id); // This will handle exploration logic
            }
          }
          
          toast({ title: "Fleet Moved", description: `Task Force ${selectedFleetId.slice(-4)} moved to (${position.col + 1}, ${position.row + 1}).` });
        } else if (distance > playerSpeed) {
          toast({ title: "Move Failed", description: `Destination out of range. Max: ${playerSpeed} hexes, Distance: ${distance}.`, variant: "destructive" });
        } else if (!inCommandRange) {
          toast({ title: "Move Failed", description: `Destination is out of command range (8 hexes from nearest command post). Scouts are exempt.`, variant: "destructive" });
        }
  
        setIsMovingFleet(false);
        setSelectedFleetId(null);
      } else if (type === 'fleet') { // Clicked another fleet or same fleet - cancel move mode
        setIsMovingFleet(false);
        setSelectedFleetId(null);
        toast({ title: "Movement Cancelled", description: "Fleet movement order cancelled." });
      }
    }
  };


  const currentPlayerForPanel = gameState.players.find(p => p.id === gameState.currentPlayerId);
  const selectedStarSystem = selectedStarSystemId ? gameState.starSystems.find(s => s.id === selectedStarSystemId) : undefined;

  const turnsUntilProduction = gameState.turn > 0 && !isCurrentTurnAProductionGameTurn ? PRODUCTION_TURN_INTERVAL - (gameState.turn % PRODUCTION_TURN_INTERVAL) : 0;

  if (!isClient || isAttemptingRejoin) {
    return <div className="flex items-center justify-center h-screen bg-background text-foreground"><Rocket className="w-12 h-12 animate-pulse text-primary" /> <p className="ml-4 text-xl">Loading Stellar Conquest...</p></div>;
  }

  if (gameState.gameId && (!localUserPlayerId || gameState.players.length === 0 || (gameState.gamePhase === 'playing' && !gameState.currentPlayerId) )) {
     return <div className="flex items-center justify-center h-screen bg-background text-foreground"><Rocket className="w-12 h-12 animate-pulse text-primary" /> <p className="ml-4 text-xl">Synchronizing Game Data...</p></div>;
  }


  const openMultiplayerPanelUI = (panel: 'create' | 'join') => {
    setActiveMultiplayerPanel(panel);
    setActiveManagementPanel(null);
    setSelectedStarSystemId(null);
    if (panel === 'join') {
        fetchPublicGames();
        setJoiningPlayerName('');
    }
  };


  return (
    <div className="flex h-screen bg-background text-foreground">
        <Sidebar className="border-r border-sidebar-border" collapsible="icon">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-2">
              <Rocket className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold group-data-[collapsible=icon]:hidden">Stellar Conquest</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
              {gameState.gamePhase === 'playing' && gameState.players.length > 0 && (
                <SidebarMenuItem>
                  <Card className="mb-4 bg-sidebar-accent/30">
                      <CardHeader className="p-3">
                          <CardTitle className="text-lg flex items-center justify-between">
                              <span>Game Turn: {gameState.turn}</span>
                              <History className="w-5 h-5 text-accent"/>
                          </CardTitle>
                          <CardDescription className="group-data-[collapsible=icon]:hidden">
                              Player: {currentPlayerForPanel?.name || 'N/A'}
                          </CardDescription>
                           <CardDescription className="group-data-[collapsible=icon]:hidden">
                              {isCurrentTurnAProductionGameTurn ? "Production Phase!" : (turnsUntilProduction > 0 ? `Turns until production: ${turnsUntilProduction}`: "Next turn is production!")}
                          </CardDescription>
                      </CardHeader>
                  </Card>
                </SidebarMenuItem>
              )}

              <SidebarGroup>
                <SidebarGroupLabel className="flex items-center gap-1"><Users className="w-4 h-4" />Players ({gameState.players.length}/4)</SidebarGroupLabel>
                {gameState.players.map(player => (
                  <SidebarMenuItem key={player.id} className="group-data-[collapsible=icon]:px-0">
                    <div className={`flex items-center justify-between p-2 rounded-md ${player.id === gameState.currentPlayerId ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'hover:bg-sidebar-accent'}`}>
                      <span className={`${player.color} group-data-[collapsible=icon]:hidden`}>{player.name}</span>
                      <Orbit className={`w-4 h-4 ${player.color} ${player.id !== gameState.currentPlayerId ? 'hidden md:hidden group-data-[collapsible=icon]:block group-data-[collapsible=icon]:mx-auto' : 'group-data-[collapsible=icon]:block group-data-[collapsible=icon]:mx-auto'}`} />
                    </div>
                  </SidebarMenuItem>
                ))}
                 {(gameState.players.length === 0 && (firestoreGameStatus === 'setup' || firestoreGameStatus === 'Cancelled')) && (
                    <SidebarMenuItem className="group-data-[collapsible=icon]:px-0">
                        <div className="p-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">No players yet. Create or join a game.</div>
                    </SidebarMenuItem>
                )}
              </SidebarGroup>

              {gameState.gamePhase === 'playing' && (
                <>
                  <Separator className="my-2 group-data-[collapsible=icon]:hidden"/>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => { setIsMovingFleet(prev => !prev); setSelectedFleetId(null); setSelectedStarSystemId(null); setActiveManagementPanel(null); }}
                        tooltip={isMovingFleet ? "Cancel Fleet Movement" : "Move Fleet"}
                        disabled={isCurrentTurnAProductionGameTurn}
                        variant={isMovingFleet ? "secondary" : "default"}
                    >
                      <Move className="w-5 h-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{isMovingFleet ? "Cancel Movement" : "Move Fleet"}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => { setActiveManagementPanel(activeManagementPanel === 'production' ? null : 'production'); setSelectedStarSystemId(null); setActiveMultiplayerPanel(null); setIsMovingFleet(false); setSelectedFleetId(null);}} tooltip="Manage Production">
                      <Warehouse className="w-5 h-5" />
                      <span className="group-data-[collapsible=icon]:hidden">Production</span>
                      <ChevronRight className={`ml-auto h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden ${activeManagementPanel === 'production' ? 'rotate-90' : ''}`} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => { setActiveManagementPanel(activeManagementPanel === 'fleet' ? null : 'fleet'); setSelectedStarSystemId(null); setActiveMultiplayerPanel(null); setIsMovingFleet(false); setSelectedFleetId(null);}}
                        tooltip="Manage Fleets"
                    >
                      <Ship className="w-5 h-5" />
                      <span className="group-data-[collapsible=icon]:hidden">Fleet Management</span>
                      <ChevronRight className={`ml-auto h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden ${activeManagementPanel === 'fleet' ? 'rotate-90' : ''}`} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => { setActiveManagementPanel(activeManagementPanel === 'colonies' ? null : 'colonies'); setSelectedStarSystemId(null); setActiveMultiplayerPanel(null); setIsMovingFleet(false); setSelectedFleetId(null);}} tooltip="Manage Colonies">
                      <Factory className="w-5 h-5" />
                      <span className="group-data-[collapsible=icon]:hidden">Colonies</span>
                      <ChevronRight className={`ml-auto h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden ${activeManagementPanel === 'colonies' ? 'rotate-90' : ''}`} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => {setActiveManagementPanel(activeManagementPanel === 'tech' ? null : 'tech'); setSelectedStarSystemId(null); setActiveMultiplayerPanel(null); setIsMovingFleet(false); setSelectedFleetId(null);}} tooltip="Research Tech">
                      <FlaskConical className="w-5 h-5" />
                      <span className="group-data-[collapsible=icon]:hidden">Technology</span>
                      <ChevronRight className={`ml-auto h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden ${activeManagementPanel === 'tech' ? 'rotate-90' : ''}`} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <Separator className="my-2 group-data-[collapsible=icon]:hidden"/>
                </>
              )}

              { gameState.gamePhase !== 'playing' && (
                <>
                <SidebarGroup>
                    <SidebarGroupLabel className="flex items-center gap-1"><Network className="w-4 h-4" />Multiplayer</SidebarGroupLabel>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => openMultiplayerPanelUI('create')}
                            tooltip="Create Game"
                            disabled={!!gameState.gameId && (firestoreGameStatus === 'In Progress' || firestoreGameStatus === 'Awaiting Players')}
                        >
                            <PlusSquare className="w-5 h-5" />
                            <span className="group-data-[collapsible=icon]:hidden">Create Game</span>
                            <ChevronRight className={`ml-auto h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden ${activeMultiplayerPanel === 'create' ? 'rotate-90' : ''}`} />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => openMultiplayerPanelUI('join')}
                            tooltip="Join Game"
                            disabled={!!gameState.gameId && firestoreGameStatus !== 'setup' && firestoreGameStatus !== 'Cancelled'}
                        >
                            <LogIn className="w-5 h-5" />
                            <span className="group-data-[collapsible=icon]:hidden">Join Game</span>
                            <ChevronRight className={`ml-auto h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden ${activeMultiplayerPanel === 'join' ? 'rotate-90' : ''}`} />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarGroup>
                <Separator className="my-2 group-data-[collapsible=icon]:hidden"/>
                </>
              )}


              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setIsTutorialOpen(true)} tooltip="Tutorial Assistant">
                  <Bot className="w-5 h-5" />
                  <span className="group-data-[collapsible=icon]:hidden">Tutorial AI</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setShowFogOfWar(!showFogOfWar)} tooltip={showFogOfWar ? "Disable Detailed Fog" : "Enable Detailed Fog"}>
                  {showFogOfWar ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  <span className="group-data-[collapsible=icon]:hidden">Detailed Fog</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4">
            {gameState.gamePhase === 'playing' && gameState.players.length > 0 && (
              <Button
                onClick={handleEndTurn}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground group-data-[collapsible=icon]:px-2"
                disabled={
                  !localUserPlayerId ||
                  gameState.currentPlayerId !== localUserPlayerId ||
                  isEndingTurn ||
                  gameState.gamePhase !== 'playing'
                }
              >
                {isEndingTurn ? (
                  <Loader2 className="w-5 h-5 mr-1 animate-spin group-data-[collapsible=icon]:mr-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 mr-1 group-data-[collapsible=icon]:mr-0" />
                )}
                <span className="group-data-[collapsible=icon]:hidden">
                  {isEndingTurn ? 'Ending...' : (isCurrentTurnAProductionGameTurn ? 'End Production Actions' : 'End Player Turn')}
                </span>
              </Button>
            )}
          </SidebarFooter>
        </Sidebar>

      <SidebarInset className="flex-1 flex flex-col overflow-hidden">
        <header className="p-4 border-b border-border flex items-center justify-between bg-background">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden">
                <PanelLeft />
            </SidebarTrigger>
            <h2 className="text-xl font-semibold text-foreground">
                {isMovingFleet ? `Moving Fleet: ${selectedFleetId ? '...' + selectedFleetId.slice(-4) : 'Select Destination'}` : (isCurrentTurnAProductionGameTurn ? 'Galactic Production Phase' : 'Galactic Map')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer" />
          </div>
        </header>

        <main className="flex-1 flex p-1 md:p-2 gap-1 md:gap-2 overflow-hidden">
            <div
              className="flex-1 h-full rounded-lg shadow-inner overflow-auto bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url('https://i.imgur.com/75lZ0EJ.jpeg')" }}
            >
                 <StarMap
                    starSystems={gameState.starSystems}
                    fleets={gameState.fleets}
                    commandPosts={gameState.commandPosts}
                    dustClouds={gameState.dustClouds}
                    entryPoints={gameState.entryPoints}
                    visualMapLabels={gameState.visualMapLabels}
                    mapSettings={gameState.mapSettings}
                    showFogOfWar={showFogOfWar}
                    currentPlayerId={gameState.currentPlayerId || ''}
                    players={gameState.players}
                    selectedStarSystemId={selectedStarSystemId}
                    onStarSystemClick={handleStarSystemClick}
                    onMapElementClick={handleMapElementClick}
                    isProductionTurn={isCurrentTurnAProductionGameTurn}
                    selectedFleetId={selectedFleetId}
                    isMovingFleet={isMovingFleet}
                  />
            </div>

            {activeMultiplayerPanel && !selectedStarSystemId && gameState.gamePhase !== 'playing' && (
              <MultiplayerPanel
                activePanel={activeMultiplayerPanel}
                setActivePanel={setActiveMultiplayerPanel}
                createdGameCode={createdGameCode}
                hostName={hostName}
                setHostName={setHostName}
                isPrivateGame={isPrivateGame}
                setIsPrivateGame={setIsPrivateGame}
                joinGameCode={joinGameCode}
                setJoinGameCode={setJoinGameCode}
                joiningPlayerName={joiningPlayerName}
                setJoiningPlayerName={setJoiningPlayerName}
                publicGamesList={publicGamesList}
                isLoadingPublicGames={isLoadingPublicGames}
                firestoreGameStatus={firestoreGameStatus}
                localPlayers={gameState.players}
                handleCreateGameSession={handleCreateGameSession}
                handleJoinGame={handleJoinGame}
                handleJoinListedGame={handleJoinListedGame}
                handleStartGame={handleStartGame}
                handleCancelGame={handleCancelGame}
              />
            )}

            {!activeMultiplayerPanel && activeManagementPanel && !selectedStarSystemId && gameState.gamePhase === 'playing' && (
              <ManagementInfoPanel
                activePanel={activeManagementPanel}
                gameState={gameState}
                currentPlayer={currentPlayerForPanel}
                onClose={() => setActiveManagementPanel(null)}
                isProductionTurn={isCurrentTurnAProductionGameTurn}
                onBuildItem={handleBuildItem}
                onAllocateResearch={handleAllocateResearch}
                onCreateFleet={handleCreateFleet}
              />
            )}

            {!activeMultiplayerPanel && selectedStarSystem && gameState.gamePhase === 'playing' &&
             !((isCurrentTurnAProductionGameTurn && activeManagementPanel === 'production') || (isCurrentTurnAProductionGameTurn && activeManagementPanel === 'tech')) &&
            (
              <StarSystemDetailsPanel
                selectedStarSystem={selectedStarSystem}
                players={gameState.players}
                showFogOfWar={showFogOfWar}
                onClose={() => setSelectedStarSystemId(null)}
                isProductionTurn={isCurrentTurnAProductionGameTurn}
              />
            )}

        </main>
      </SidebarInset>
      <TutorialAssistantDialog open={isTutorialOpen} onOpenChange={setIsTutorialOpen} />
    </div>
  );
};

export default GameClient;
