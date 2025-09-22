
import type { GameState, Player, StarSystem as StarSystemType, PlayerResources, GameDataItem, Planet as PlanetType, ResearchData, VisualMapLabel, CommandPost } from '@/types/game';
																   

// --- RAW GAME DATA (Ships, Research, Planetary Items) ---
export const rawGameDataItems: GameDataItem[] = [
  { "PurchaseType": "Ship", "Level": "", "Quantity": 1, "Name": "Colony Transport", "IPCost": 1, "ResearchPrerequisite": "", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Ship", "Level": "", "Quantity": 1, "Name": "Scout", "IPCost": 3, "ResearchPrerequisite": "", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Ship", "Level": "", "Quantity": 2, "Name": "Scout", "IPCost": 5, "ResearchPrerequisite": "", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Ship", "Level": "", "Quantity": 1, "Name": "Corvette", "IPCost": 8, "ResearchPrerequisite": "", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Ship", "Level": "", "Quantity": 1, "Name": "Fighter", "IPCost": 20, "ResearchPrerequisite": "Fighter Ship", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Ship", "Level": "", "Quantity": 1, "Name": "Death Star", "IPCost": 40, "ResearchPrerequisite": "Death Star", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Planetary", "Level": "", "Quantity": 1, "Name": "Factory", "IPCost": 4, "ResearchPrerequisite": "Industrial Tech", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Planetary", "Level": "", "Quantity": 1, "Name": "Robotic Factory", "IPCost": 3, "ResearchPrerequisite": "Robotic Industrialization", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Planetary", "Level": "", "Quantity": 1, "Name": "Missle Base", "IPCost": 4, "ResearchPrerequisite": "Missle Base", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Planetary", "Level": "", "Quantity": 1, "Name": "Advanced Missle Base", "IPCost": 10, "ResearchPrerequisite": "Advanced Missle Base", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Planetary", "Level": "", "Quantity": 1, "Name": "Planetary Shield", "IPCost": 30, "ResearchPrerequisite": "Planet Shield", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "Only 1 planetary shield can be purchased for each colony" },
  { "PurchaseType": "Ship Speed Research", "Level": 1, "Quantity": "", "Name": "3 Hex Speed", "IPCost": 15, "ResearchPrerequisite": "", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": 1, "Note": "" },
  { "PurchaseType": "Ship Speed Research", "Level": 1, "Quantity": "", "Name": "4 Hex Speed", "IPCost": 40, "ResearchPrerequisite": "", "DiscountPrerequisit": "3 Hex Speed", "DiscountPrice": 30, "ShipSpeedBonus": 2, "Note": "" },
  { "PurchaseType": "Ship Speed Research", "Level": 2, "Quantity": "", "Name": "5 Hex Speed", "IPCost": 55, "ResearchPrerequisite": "", "DiscountPrerequisit": "4 Hex Speed", "DiscountPrice": 40, "ShipSpeedBonus": 3, "Note": "" },
  { "PurchaseType": "Ship Speed Research", "Level": 2, "Quantity": "", "Name": "6 Hex Speed", "IPCost": 65, "ResearchPrerequisite": "", "DiscountPrerequisit": "5 Hex Speed", "DiscountPrice": 50, "ShipSpeedBonus": 4, "Note": "" },
  { "PurchaseType": "Ship Speed Research", "Level": 3, "Quantity": "", "Name": "7 Hex Speed", "IPCost": 75, "ResearchPrerequisite": "", "DiscountPrerequisit": "6 Hex Speed", "DiscountPrice": 60, "ShipSpeedBonus": 5, "Note": "" },
  { "PurchaseType": "Ship Speed Research", "Level": 3, "Quantity": "", "Name": "8 Hex Speed", "IPCost": 80, "ResearchPrerequisite": "", "DiscountPrerequisit": "7 Hex Speed", "DiscountPrice": 70, "ShipSpeedBonus": 6, "Note": "" },
  { "PurchaseType": "Weapon Research", "Level": 1, "Quantity": "", "Name": "Missle Base", "IPCost": 25, "ResearchPrerequisite": "", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Weapon Research", "Level": 1, "Quantity": "", "Name": "Fighter Ship", "IPCost": 35, "ResearchPrerequisite": "", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Weapon Research", "Level": 2, "Quantity": "", "Name": "Advanced Missle Base", "IPCost": 55, "ResearchPrerequisite": "", "DiscountPrerequisit": "Missle Base", "DiscountPrice": 40, "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Weapon Research", "Level": 2, "Quantity": "", "Name": "Death Star", "IPCost": 90, "ResearchPrerequisite": "", "DiscountPrerequisit": "Fighter Ship", "DiscountPrice": 75, "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Weapon Research", "Level": 3, "Quantity": "", "Name": "Improved Ship Weaponry", "IPCost": 100, "ResearchPrerequisite": "", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Weapon Research", "Level": 3, "Quantity": "", "Name": "Planet Shield", "IPCost": 130, "ResearchPrerequisite": "", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Technology Research", "Level": 1, "Quantity": "", "Name": "Controller Climate Tech", "IPCost": 25, "ResearchPrerequisite": "", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Technology Research", "Level": 1, "Quantity": "", "Name": "Industrial Tech", "IPCost": 25, "ResearchPrerequisite": "", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Technology Research", "Level": 2, "Quantity": "", "Name": "Improved Industrial Tech", "IPCost": 55, "ResearchPrerequisite": "", "DiscountPrerequisit": "Industrial Tech", "DiscountPrice": 40, "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Technology Research", "Level": 2, "Quantity": "", "Name": "Unlimited Ship Range", "IPCost": 60, "ResearchPrerequisite": "", "DiscountPrerequisit": "5 Hex Speed", "DiscountPrice": 40, "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Technology Research", "Level": 3, "Quantity": "", "Name": "Unlimited Ship Communication", "IPCost": 70, "ResearchPrerequisite": "", "DiscountPrerequisit": "", "DiscountPrice": "", "ShipSpeedBonus": "", "Note": "" },
  { "PurchaseType": "Technology Research", "Level": 3, "Quantity": "", "Name": "Robotic Industrialization", "IPCost": 100, "ResearchPrerequisite": "", "DiscountPrerequisit": "Industrial Tech", "DiscountPrice": 85, "ShipSpeedBonus": "", "Note": "" }
];


// --- DUST CLOUD DATA ---
const rawDustCloudLocations = [
  { "Location": { q: 2, r: 10 } },
  { "Location": { q: 2, r: 11 } },
  { "Location": { q: 2, r: 12 } },
  { "Location": { q: 2, r: 13 } },
  { "Location": { q: 3, r: 10 } },
  { "Location": { q: 3, r: 11 } },
  { "Location": { q: 3, r: 12 } },
  { "Location": { q: 4, r: 11 } },
  { "Location": { q: 10, r: 7 } },  
  { "Location": { q: 10, r: 8 } },  
  { "Location": { q: 11, r: 6 } },  
  { "Location": { q: 11, r: 7 } },  
  { "Location": { q: 11, r: 8 } },  
  { "Location": { q: 12, r: 6 } },  
  { "Location": { q: 12, r: 7 } },  
  { "Location": { q: 13, r: 5 } },  
  { "Location": { q: 14, r: 5 } },  
  { "Location": { q: 14, r: 6 } }, 
  { "Location": { q: 10, r: 13 } },  
  { "Location": { q: 10, r: 14 } },  
  { "Location": { q: 11, r: 12 } },  
  { "Location": { q: 11, r: 13 } },  
  { "Location": { q: 11, r: 14 } },  
  { "Location": { q: 12, r: 14 } },  
  { "Location": { q: 12, r: 15 } },  
  { "Location": { q: 12, r: 16 } },  
  { "Location": { q: 13, r: 15 } },  
  { "Location": { q: 14, r: 16 } }, 
  { "Location": { q: 16, r: 1 } },  
  { "Location": { q: 17, r: 1 } },  
  { "Location": { q: 18, r: 1 } },  
  { "Location": { q: 18, r: 2 } },  
  { "Location": { q: 19, r: 1 } },  
  { "Location": { q: 19, r: 2 } }, 
  { "Location": { q: 16, r: 20 } },  
  { "Location": { q: 17, r: 19 } },  
  { "Location": { q: 17, r: 20 } },  
  { "Location": { q: 18, r: 20 } },  
  { "Location": { q: 19, r: 19 } },   
  { "Location": { q: 22, r: 6 } },  
  { "Location": { q: 23, r: 5 } },  
  { "Location": { q: 23, r: 6 } }, 
  { "Location": { q: 24, r: 6 } },  
  { "Location": { q: 24, r: 7 } },  
  { "Location": { q: 25, r: 6 } },  
  { "Location": { q: 25, r: 7 } },  
  { "Location": { q: 25, r: 8 } },  
  { "Location": { q: 23, r: 14 } },  
  { "Location": { q: 23, r: 15 } },  
  { "Location": { q: 24, r: 15 } }, 
  { "Location": { q: 25, r: 13 } },  
  { "Location": { q: 25, r: 14 } },  
  { "Location": { q: 26, r: 12 } },  
  { "Location": { q: 26, r: 13 } },  
  { "Location": { q: 26, r: 14 } },  
  { "Location": { q: 31, r: 7 } },  
  { "Location": { q: 32, r: 8 } },  
  { "Location": { q: 32, r: 9 } }, 
  { "Location": { q: 32, r: 11 } },  
  { "Location": { q: 33, r: 8 } },  
  { "Location": { q: 33, r: 9 } },  
  { "Location": { q: 33, r: 10 } },  
  { "Location": { q: 33, r: 11 } }
];

export const parsedDustClouds: GameState['dustClouds'] = rawDustCloudLocations.map((dc, index) => {
  return {
    id: `dc_${index}`,
    position: { col: dc.Location.q, row: dc.Location.r },
  };
}) as GameState['dustClouds'];


// --- STAR SYSTEM DATA ---
const rawStarSystemData: Omit<StarSystemType, 'planets' | 'owner' | 'isExplored' | 'id' | 'position'> & { Location: string, SystemName: string, Color: string, StarCardNo?: string}[] = [
  { "SystemName": "Hamal", "Location": { q: 28, r: 15 }, "Color": "Orange", "StarCardNo": "" },
  { "SystemName": "Scorpii", "Location": { q: 28, r: 19 }, "Color": "Yellow", "StarCardNo": "" }, 
  { "SystemName": "Wezen", "Location": { q: 28, r: 9 }, "Color": "Orange", "StarCardNo": "" },
  { "SystemName": "Bootis", "Location": { q: 29, r: 5 }, "Color": "Yellow", "StarCardNo": "" }, 
  { "SystemName": "Dubhe", "Location": { q: 30, r: 12 }, "Color": "Yellow", "StarCardNo": "" },
  { "SystemName": "Barnard", "Location": { q: 30, r: 17 }, "Color": "Red", "StarCardNo": "" }, 
  { "SystemName": "Polaris", "Location": { q: 32, r: 10 }, "Color": "Green", "StarCardNo": "" },
  { "SystemName": "Sirius", "Location": { q: 3, r: 11 }, "Color": "Blue", "StarCardNo": "" }, 
  { "SystemName": "Lalande", "Location": { q: 3, r: 18 }, "Color": "Orange", "StarCardNo": "" },
  { "SystemName": "Luyten", "Location": { q: 5, r: 13 }, "Color": "Orange", "StarCardNo": "" }, 
  { "SystemName": "Indi", "Location": { q: 5, r: 4 }, "Color": "Orange", "StarCardNo": "" },
  { "SystemName": "Ceti", "Location": { q: 6, r: 17 }, "Color": "Yellow", "StarCardNo": "" }, 
  { "SystemName": "Kapetyu", "Location": { q: 6, r: 7 }, "Color": "Red", "StarCardNo": "" },
  { "SystemName": "Diphda", "Location": { q: 7, r: 9 }, "Color": "Yellow", "StarCardNo": "" }, 
  { "SystemName": "Canis", "Location": { q: 8, r: 5 }, "Color": "Yellow", "StarCardNo": "" },
  { "SystemName": "Eridani", "Location": { q: 9, r: 12 }, "Color": "Green", "StarCardNo": "" }, 
  { "SystemName": "Mira", "Location": { q: 9, r: 18 }, "Color": "Red", "StarCardNo": "" },
  { "SystemName": "Ophiuchi", "Location": { q: 9, r: 2 }, "Color": "Red", "StarCardNo": "" }, 
  { "SystemName": "Ross", "Location": { q: 10, r: 10 }, "Color": "Red", "StarCardNo": "" },
  { "SystemName": "Rastaban", "Location": { q: 10, r: 16 }, "Color": "Orange", "StarCardNo": "" }, 
  { "SystemName": "Deneb", "Location": { q: 10, r: 8 }, "Color": "Blue", "StarCardNo": "" },
  { "SystemName": "Pherda", "Location": { q: 11, r: 14 }, "Color": "Blue", "StarCardNo": "" }, 
  { "SystemName": "Alphard", "Location": { q: 13, r: 10 }, "Color": "Orange", "StarCardNo": "" },
  { "SystemName": "Lyrae", "Location": { q: 13, r: 13 }, "Color": "Yellow", "StarCardNo": "" }, 
  { "SystemName": "Alcor", "Location": { q: 13, r: 18 }, "Color": "Yellow", "StarCardNo": "" },
  { "SystemName": "Cephei", "Location": { q: 13, r: 3 }, "Color": "Red", "StarCardNo": "" }, 
  { "SystemName": "Mirfak", "Location": { q: 13, r: 6 }, "Color": "Green", "StarCardNo": "" },
  { "SystemName": "Kochab", "Location": { q: 15, r: 6 }, "Color": "Orange", "StarCardNo": "" }, 
  { "SystemName": "Capella", "Location": { q: 15, r: 8 }, "Color": "Yellow", "StarCardNo": "" },
  { "SystemName": "Lacaille", "Location": { q: 16, r: 13 }, "Color": "Red", "StarCardNo": "" }, 
  { "SystemName": "Sadir", "Location": { q: 16, r: 16 }, "Color": "Green", "StarCardNo": "" },
  { "SystemName": "Schedar", "Location": { q: 16, r: 4 }, "Color": "Yellow", "StarCardNo": "" }, 
  { "SystemName": "Canopus", "Location": { q: 17, r: 10 }, "Color": "Green", "StarCardNo": "" },
  { "SystemName": "Hydrae", "Location": { q: 17, r: 18 }, "Color": "Orange", "StarCardNo": "" }, 
  { "SystemName": "Draconis", "Location": { q: 18, r: 11 }, "Color": "Yellow", "StarCardNo": "" },
  { "SystemName": "Mizar", "Location": { q: 18, r: 2 }, "Color": "Blue", "StarCardNo": "" }, 
  { "SystemName": "Zosca", "Location": { q: 18, r: 20 }, "Color": "Blue", "StarCardNo": "" },
  { "SystemName": "Crucis", "Location": { q: 18, r: 8 }, "Color": "Red", "StarCardNo": "" }, 
  { "SystemName": "Lupi", "Location": { q: 19, r: 14 }, "Color": "Orange", "StarCardNo": "" },
  { "SystemName": "Caph", "Location": { q: 19, r: 6 }, "Color": "Green", "StarCardNo": "" }, 
  { "SystemName": "Almach", "Location": { q: 20, r: 10 }, "Color": "Orange", "StarCardNo": "" },
  { "SystemName": "Scheat", "Location": { q: 21, r: 12 }, "Color": "Red", "StarCardNo": "" }, 
  { "SystemName": "Aurigae", "Location": { q: 21, r: 16 }, "Color": "Yellow", "StarCardNo": "" },
  { "SystemName": "Antares", "Location": { q: 21, r: 4 }, "Color": "Red", "StarCardNo": "" }, 
  { "SystemName": "Spica", "Location": { q: 22, r: 8 }, "Color": "Yellow", "StarCardNo": "" },
  { "SystemName": "Procyou", "Location": { q: 23, r: 19 }, "Color": "Green", "StarCardNo": "" }, 
  { "SystemName": "Tauri", "Location": { q: 23, r: 2 }, "Color": "Yellow", "StarCardNo": "" },
  { "SystemName": "Mirach", "Location": { q: 24, r: 11 }, "Color": "Red", "StarCardNo": "" }, 
  { "SystemName": "Cygni", "Location": { q: 24, r: 13 }, "Color": "Yellow", "StarCardNo": "" },
  { "SystemName": "Kruger", "Location": { q: 25, r: 18 }, "Color": "Red", "StarCardNo": "" }, 
  { "SystemName": "Arcturus", "Location": { q: 25, r: 5 }, "Color": "Orange", "StarCardNo": "" },
  { "SystemName": "Vega", "Location": { q: 25, r: 8 }, "Color": "Blue", "StarCardNo": "" }, 
  { "SystemName": "Wolf", "Location": { q: 26, r: 3 }, "Color": "Red", "StarCardNo": "" },
  { "SystemName": "Altair", "Location": { q: 26, r: 14 }, "Color": "Blue", "StarCardNo": "" },
  { "SystemName": "Entry 1", "Location": { q: 34, r: 21 }, "Color": "White", "StarCardNo": "100" },
  { "SystemName": "Entry 2", "Location": { q: 1, r: 21 }, "Color": "White", "StarCardNo": "101" },
  { "SystemName": "Entry 3", "Location": { q: 1, r: 0 }, "Color": "White", "StarCardNo": "102" },
  { "SystemName": "Entry 4", "Location": { q: 34, r: 1 }, "Color": "White", "StarCardNo": "103" }
];

export const initialStarSystems: StarSystemType[] = rawStarSystemData.map((star, index) => {
  return {
    id: `star_${star.SystemName.toLowerCase().replace(/\s/g, '_')}_${index}`,
    name: star.SystemName,
    position: { col: star.Location.q, row: star.Location.r },
    starColor: star.Color,
    isExplored: false,
    planets: [],
    starCardNo: star.StarCardNo || undefined,
    owner: undefined,
  };
}) as StarSystemType[];



// --- PLAYER CONFIGS & ENTRY POINTS ---
export const initialEntryPoints: GameState['entryPoints'] = [
  { id: 'ep1', name: '', position: { col: 34, row: 21 } }, // Player 1: AI21
  { id: 'ep2', name: '', position: { col: 1, row: 21 } },  // Player 2: B20
  { id: 'ep3', name: '', position: { col: 1, row: 0 } },   // Player 3: B1
 { id: 'ep4', name: '', position: { col: 34, row: 1 } },  // Player 4: AI1
];

export const playerConfigs: Omit<Player, 'id' | 'name' | 'color' | 'entryPointId' | 'researchedTechIds' | 'researchProgress'> & { idPrefix: string, namePrefix: string, colorValue: string, initialResources: PlayerResources }[] = [
  { idPrefix: 'player1', namePrefix: 'Player 1', colorValue: 'text-sky-400', initialResources: { productionPoints: 0, unassignedScouts: 4, unassignedCorvettes: 4, unassignedColonyTransports: 35 } },
  { idPrefix: 'player2', namePrefix: 'Player 2', colorValue: 'text-rose-400', initialResources: { productionPoints: 0, unassignedScouts: 4, unassignedCorvettes: 4, unassignedColonyTransports: 35 } },
  { idPrefix: 'player3', namePrefix: 'Player 3', colorValue: 'text-yellow-400', initialResources: { productionPoints: 0, unassignedScouts: 4, unassignedCorvettes: 4, unassignedColonyTransports: 35 } },
  { idPrefix: 'player4', namePrefix: 'Player 4', colorValue: 'text-green-500', initialResources: { productionPoints: 0, unassignedScouts: 4, unassignedCorvettes: 4, unassignedColonyTransports: 35 } },
];

// --- VISUAL MAP LABELS (e.g., for off-map entry points before moving to "Start X") ---
export const initialVisualMapLabels: VisualMapLabel[] = [
  { id: 'vml1', text: '', position: { col: 33, row: 19 } }, // AH20
  { id: 'vml2', text: '', position: { col: 2, row: 20 } },  // C21
  { id: 'vml3', text: '', position: { col: 2, row: 0 } },   // C1
  { id: 'vml4', text: '', position: { col: 33, row: 0 } },  // AH1
];


// --- INITIAL GAME STATE ---
export const initialGameState: GameState = {
  gameId: null,
  turn: 0, 
  players: [],
  currentPlayerId: null,
  starSystems: initialStarSystems,
  fleets: [],
  commandPosts: [], 
  gameDataItems: rawGameDataItems.map((item, index) => ({
    ...item,
    id: `${item.Name.toLowerCase().replace(/\s+/g, '-')}_${item.Quantity || 'qGen'}_${item.IPCost}_${index}`
  })),
  dustClouds: parsedDustClouds,
  entryPoints: initialEntryPoints,
  visualMapLabels: initialVisualMapLabels,
  mapSettings: {
    cols: 35, 
    rowsEven: 22, 
    rowsOdd: 22,  
    hexSize: 20,
  },
  gamePhase: 'setup',
};

// --- GAME CONSTANTS ---
export const MIN_PLAYERS_TO_START = 2;
export const INITIAL_TURN_0_PRODUCTION_POINTS = 25;
export const REGULAR_PRODUCTION_POINTS = 5;
export const PRODUCTION_TURN_INTERVAL = 5; 


    
