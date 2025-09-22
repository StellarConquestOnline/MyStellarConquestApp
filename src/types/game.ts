export interface HexPosition {
  col: number;
  row: number;
}

export type PlanetTypeShort =
  | 'Terran'
  | 'Barren'
  | 'Sub Terran'
  | 'Minimal Terran';

export interface CommandPost {
  id: string; // Unique ID, e.g., `cmd_post_player1_initial`
  owner: string; // Player ID
  position: HexPosition;
}

export interface Colony {
  id: string; // e.g., colony_sol_3_player1
  playerId: string;
  planetId: string; // The ID of the planet this colony is on
  name: string; // e.g., "Sol III Main Colony"
  population: number; // in millions
  productionPoints: number; // PP available at this colony
  factoriesCount: number;

  // New fields
  defenses: {
    missileDefense: number;
    advancedMissileDefense: number;
    planetaryShield: boolean;
  };
  productionBuildings: {
    factory: number;
    roboticFactory: number;
  };
  commandPost: boolean;
  createdAt?: any; // Firestore timestamp
}

export interface Planet {
  id: string; // e.g. planet_sol_3
  name: string; // e.g. Earth
  type: PlanetTypeShort;
  orbit: number;
  maxPopulation: number; // in millions
  isMineralRich: boolean;
  colony?: Colony; // A planet can have one colony
}

export interface PlayerResources {
  productionPoints: number;
  unassignedScouts: number;
  unassignedCorvettes: number;
  unassignedColonyTransports: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  resources: PlayerResources;
  entryPointId?: string;
  originalConfigId: string;
  researchedTechIds: string[];
  researchProgress: Record<string, number>;

  // New
  startingSystem?: string;
  colonies?: Colony[];
}

export interface Fleet {
  id: string;
  owner: string; // Player ID
  ships: { type: string; count: number }[];
  position: HexPosition;
}

export interface GameDataItem {
  id: string;
  PurchaseType: string;
  Level?: number | string;
  Quantity?: number | string;
  Name: string;
  IPCost: number;
  ResearchPrerequisite?: string;
  DiscountPrerequisit?: string;
  DiscountPrice?: number | string;
  ShipSpeedBonus?: number | string;
  Note?: string;
}

export interface ResearchData extends GameDataItem {
  category: 'Ship Speed' | 'Weapon' | 'Technology' | 'Unknown';
  level: number;
}

export interface PurchasableItem extends GameDataItem {}

export interface StarSystem {
  id: string;
  name: string;
  position: HexPosition;
  isExplored: boolean;
  owner?: string; // Player ID
  planets: Planet[];
  starColor?: string;
  starCardNo?: string;
}

export interface DustCloud {
  id: string;
  position: HexPosition;
}

export interface EntryPoint {
  id: string;
  name: string;
  position: HexPosition;
}

export interface VisualMapLabel {
  id: string;
  text: string;
  position: HexPosition;
}

export interface GameState {
  gameId: string | null;
  turn: number;
  players: Player[];
  currentPlayerId: string | null;
  starSystems: StarSystem[];
  fleets: Fleet[];
  commandPosts: CommandPost[];
  gameDataItems: GameDataItem[];
  dustClouds: DustCloud[];
  entryPoints: EntryPoint[];
  visualMapLabels: VisualMapLabel[];
  mapSettings: {
    cols: number;
    rowsEven: number;
    rowsOdd: number;
    hexSize: number;
  };
  gamePhase: 'setup' | 'playing' | 'ended' | 'Awaiting Players';
}

export type GameSessionData = {
  id: string;
  gameCode: string;
  hostPlayerId: string;
  status: string;
  players: {
    playerId: string;
    name: string;
    color: string;
    originalConfigId: string;
    colonies?: Colony[];
    startingSystem?: string;
  }[];
  isPrivate: boolean;
  createdAt: any;
  playerOrder?: string[];
  turn?: number;
  currentPlayerId?: string | null;
};
