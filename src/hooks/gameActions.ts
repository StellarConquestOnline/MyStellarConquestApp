import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GameSessionData, Colony, Player } from '../types/game';

const GAMES_COLLECTION = 'games';

// Create a new game
export async function createGame(
  hostPlayer: Omit<Player, 'resources' | 'colonies'>
): Promise<string> {
  const gamesRef = collection(db, GAMES_COLLECTION);

  const newGame: Omit<GameSessionData, 'id'> = {
    gameCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    hostPlayerId: hostPlayer.id,
    status: 'Awaiting Players',
    players: [
      {
        playerId: hostPlayer.id,
        name: hostPlayer.name,
        color: hostPlayer.color,
        originalConfigId: hostPlayer.originalConfigId,
      },
    ],
    isPrivate: false,
    createdAt: serverTimestamp(),
    playerOrder: [hostPlayer.id],
    turn: 0,
    currentPlayerId: hostPlayer.id,
  };

  const docRef = await addDoc(gamesRef, newGame);
  return docRef.id;
}

// Join an existing game
export async function joinGame(gameId: string, player: Player) {
  const gameRef = doc(db, GAMES_COLLECTION, gameId);
  const snap = await getDoc(gameRef);
  if (!snap.exists()) throw new Error('Game not found');

  const game = snap.data() as GameSessionData;
  const updatedPlayers = [
    ...game.players,
    {
      playerId: player.id,
      name: player.name,
      color: player.color,
      originalConfigId: player.originalConfigId,
    },
  ];

  await updateDoc(gameRef, {
    players: updatedPlayers,
    playerOrder: [...(game.playerOrder || []), player.id],
  });
}

// Start the game: assign entry points + create starting colony
export async function startGame(gameId: string) {
  const gameRef = doc(db, GAMES_COLLECTION, gameId);
  const snap = await getDoc(gameRef);
  if (!snap.exists()) throw new Error('Game not found');

  const game = snap.data() as GameSessionData;

  const updatedPlayers = game.players.map((p, index) => {
    const entrySystem = `Entry ${index + 1}`;

    const colony: Colony = {
      id: `colony_${entrySystem}_${p.playerId}`,
      playerId: p.playerId,
      planetId: `${entrySystem}_planet1`,
      name: `${entrySystem} Colony`,
      population: 0,
      productionPoints: 0,
      factoriesCount: 0,
      defenses: {
        missileDefense: 0,
        advancedMissileDefense: 0,
        planetaryShield: false,
      },
      productionBuildings: {
        factory: 0,
        roboticFactory: 0,
      },
      commandPost: true,
      createdAt: serverTimestamp(),
    };

    return {
      ...p,
      startingSystem: entrySystem,
      colonies: [colony],
    };
  });

  await updateDoc(gameRef, {
    players: updatedPlayers,
    status: 'In Progress',
    turn: 0,
    currentPlayerId: updatedPlayers[0].playerId,
  });
}

// Subscribe to game updates
export function subscribeToGame(
  gameId: string,
  callback: (game: GameSessionData | null) => void
) {
  const gameRef = doc(db, GAMES_COLLECTION, gameId);
  return onSnapshot(gameRef, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(snap.data() as GameSessionData);
  });
}

// List public games waiting for players
export async function listGames() {
  // NOTE: Could use a query for status + isPrivate
  const gamesRef = collection(db, GAMES_COLLECTION);
  // Filtering can be added here
  return gamesRef;
}
