
export interface HexPosition {
  col: number;
  row: number;
}

export type PlanetTypeShort = 'Terran' | 'Barren' | 'Sub Terran' | 'Minimal Terran';

export interface CommandPost {
  id: string;       // Unique ID, e.g., `cmd_post_player1_initial`
  owner: string;    // Player ID
  position: HexPosition;
}

export interface Colony {
  id: string; // e.g., colony_sol_3_player1
  playerId: string;
  planetId: string; // The ID of the planet this colony is on
  name: string; // e.g., "Sol III Main Colony" or "Ceti Alpha V Outpost"
  population: number; // in millions - current population
  productionPoints: number; // PP available at this colony for the current production turn
  factoriesCount: number;
  // Potentially other colony-specific structures or states
}

export interface Planet { // Renamed from PlanetType for clarity
  id: string; // e.g. planet_sol_3
  name: string; // e.g. Earth
  type: PlanetTypeShort;
  orbit: number;
  maxPopulation: number; // in millions
  isMineralRich: boolean;
  colony?: Colony; // A planet can have one colony
}

export interface PlayerResources {
  productionPoints: number; // For Turn 0, this is global. Later, PP is per-colony.
  unassignedScouts: number;
  unassignedCorvettes: number;
  unassignedColonyTransports: number;
  // Other global player resources if any
}

export interface Player {
  id: string;
  name: string;
  color: string;
  resources: PlayerResources; // Global resources like unassigned ships, overall PP for Turn 0.
  entryPointId?: string;
  originalConfigId: string;
  researchedTechIds: string[]; // IDs of fully researched technologies
  researchProgress: Record<string, number>; // Key: techId, Value: points accumulated
}

export interface Fleet {
  id: string;
  owner: string; // Player ID
  ships: { type: string; count: number }[]; // Use string for type to accommodate names from GameDataItem
  position: HexPosition;
}

// Generic type for items from the JSON data
export interface GameDataItem {
  id: string; // Derived from Name, Quantity, IPCost, and original index to ensure uniqueness
  PurchaseType: string; // "Ship", "Planetary", "Ship Speed Research", "Weapon Research", "Technology Research"
  Level?: number | string; // Can be number or empty string
  Quantity?: number | string; // Can be number or empty string
  Name: string;
  IPCost: number;
  ResearchPrerequisite?: string;
  DiscountPrerequisit?: string; // Note: Typo in original JSON "Prerequisit" -> Corrected to DiscountPrerequisit
  DiscountPrice?: number | string; // Can be number or empty string
  ShipSpeedBonus?: number | string; // Can be number or empty string
  Note?: string;
}

// Specific type for Research, derived from GameDataItem
export interface ResearchData extends GameDataItem {
  // id is inherited
  category: 'Ship Speed' | 'Weapon' | 'Technology' | 'Unknown';
  level: number; // Normalized level
}

// Specific type for Purchasable Ships/Planetary items
export interface PurchasableItem extends GameDataItem {
  // id is inherited
}

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
  gameDataItems: GameDataItem[]; // Holds all items from the JSON (includes research and purchasables)
  dustClouds: DustCloud[];
  entryPoints: EntryPoint[];
  visualMapLabels: VisualMapLabel[]; // For arbitrary text labels on the map
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
  status: string; // e.g., 'Awaiting Players', 'In Progress', 'Ended', 'Cancelled'
  players: { playerId: string; name: string; color: string; originalConfigId: string; }[];
  isPrivate: boolean;
  createdAt: any; // Firestore Timestamp
  playerOrder?: string[]; // Array of player IDs in turn order
  turn?: number;
  currentPlayerId?: string | null;
};
