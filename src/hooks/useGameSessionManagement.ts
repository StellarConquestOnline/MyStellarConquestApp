'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  type Unsubscribe,
  deleteDoc,
  getDoc,
  type FirebaseError,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { GameState, Player, GameSessionData, PlayerResources } from '@/types/game';
import {
  initialEntryPoints,
  playerConfigs as basePlayerConfigs,
  PRODUCTION_TURN_INTERVAL,
  INITIAL_TURN_0_PRODUCTION_POINTS,
  initialGameState as baseInitialGameState,
  MIN_PLAYERS_TO_START,
} from '@/data/game-init-data';
import { useToast } from '@/hooks/use-toast';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface UseGameSessionManagementProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  initialGameStateRef: React.MutableRefObject<GameState>;
}

const LOCAL_STORAGE_GAME_ID_KEY = 'stellarConquestGameId';
const LOCAL_STORAGE_PLAYER_ID_KEY = 'stellarConquestPlayerId';

export const useGameSessionManagement = ({ gameState, setGameState, initialGameStateRef }: UseGameSessionManagementProps) => {
  const { toast } = useToast();

  const [createdGameCode, setCreatedGameCode] = useState<string | null>(null);
  const [hostName, setHostName] = useState<string>(basePlayerConfigs[0]?.namePrefix || 'Player 1');
  const [isPrivateGame, setIsPrivateGame] = useState<boolean>(false);
  const [joinGameCode, setJoinGameCode] = useState('');
  const [joiningPlayerName, setJoiningPlayerName] = useState<string>('');
  const [publicGamesList, setPublicGamesList] = useState<GameSessionData[]>([]);
  const [isLoadingPublicGames, setIsLoadingPublicGames] = useState<boolean>(false);
  const [firestoreGameStatus, setFirestoreGameStatus] = useState<string>('setup');
  const [localUserPlayerId, setLocalUserPlayerId] = useState<string | null>(null);
  const [isEndingTurn, setIsEndingTurn] = useState(false);
  const [isAttemptingRejoin, setIsAttemptingRejoin] = useState<boolean>(true);

  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  // Attempt to rejoin based on localStorage (on app load)
  useEffect(() => {
    const attemptRejoin = async () => {
      if (typeof window === 'undefined') {
        setIsAttemptingRejoin(false);
        return;
      }

      const storedGameId = localStorage.getItem(LOCAL_STORAGE_GAME_ID_KEY);
      const storedPlayerId = localStorage.getItem(LOCAL_STORAGE_PLAYER_ID_KEY);

      if (storedGameId && storedPlayerId) {
        try {
          const gameDocRef = doc(db, "gameSessions", storedGameId);
          const docSnap = await getDoc(gameDocRef);

          if (docSnap.exists()) {
            const gameData = { id: docSnap.id, ...docSnap.data() } as GameSessionData;
            const playerInGame = gameData.players.some(p => p.playerId === storedPlayerId);

            if ((gameData.status === 'In Progress' || gameData.status === 'Awaiting Players') && playerInGame) {
              setLocalUserPlayerId(storedPlayerId);
              setGameState(prev => ({ ...prev, gameId: gameData.id, gameDataItems: baseInitialGameState.gameDataItems }));
              if (gameData.hostPlayerId === storedPlayerId) {
                setCreatedGameCode(gameData.gameCode);
              }
            } else {
              localStorage.removeItem(LOCAL_STORAGE_GAME_ID_KEY);
              localStorage.removeItem(LOCAL_STORAGE_PLAYER_ID_KEY);
              if (gameData.status !== 'Awaiting Players' && gameData.status !== 'In Progress') {
                 toast({ title: "Rejoin Failed", description: "Previous game session has ended or was cancelled.", variant: "default" });
              } else if (!playerInGame) {
                 toast({ title: "Rejoin Failed", description: "Your player ID was not found in the previous game.", variant: "destructive" });
              }
            }
          } else {
            localStorage.removeItem(LOCAL_STORAGE_GAME_ID_KEY);
            localStorage.removeItem(LOCAL_STORAGE_PLAYER_ID_KEY);
          }
        } catch (error) {
          console.error("[useGameSessionManagement] Error attempting to rejoin game:", error);
          localStorage.removeItem(LOCAL_STORAGE_GAME_ID_KEY);
          localStorage.removeItem(LOCAL_STORAGE_PLAYER_ID_KEY);
          toast({ title: "Rejoin Error", description: "An error occurred while trying to rejoin.", variant: "destructive" });
        }
      }
      setIsAttemptingRejoin(false);
    };

    attemptRejoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPublicGames = useCallback(async () => {
    setIsLoadingPublicGames(true);
    try {
      const q = query(
        collection(db, "gameSessions"),
        where("isPrivate", "==", false),
        where("status", "==", "Awaiting Players")
      );
      const querySnapshot = await getDocs(q);
      const games: GameSessionData[] = [];
      querySnapshot.forEach((docSnap) => {
        games.push({ id: docSnap.id, ...(docSnap.data() as Omit<GameSessionData, 'id'>) });
      });
      setPublicGamesList(games);
    } catch (error) {
      console.error("[useGameSessionManagement] Error fetching public games:", error);
      let description = "Could not retrieve public game list.";
      if (error instanceof Error && (error as FirebaseError).code) {
        description += ` Error: ${(error as FirebaseError).code}`;
      }
      toast({ title: "Error Fetching Games", description, variant: "destructive" });
      setPublicGamesList([]);
    } finally {
      setIsLoadingPublicGames(false);
    }
  }, [toast]);

  const handleCreateGameSession = useCallback(async () => {
    if (!hostName.trim()) {
      toast({ title: "Name Required", description: "Please enter your name to host a game.", variant: "destructive" });
      return;
    }

    const hostBaseConfig = basePlayerConfigs[0];
    const newShareableCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const assignedPlayerId = hostBaseConfig.idPrefix;

    try {
      const gameSessionFirestoreData: Omit<GameSessionData, 'id' | 'createdAt'> & { createdAt: any } = {
        gameCode: newShareableCode,
        hostPlayerId: assignedPlayerId,
        status: 'Awaiting Players',
        players: [{ playerId: assignedPlayerId, name: hostName, color: hostBaseConfig.colorValue, originalConfigId: hostBaseConfig.idPrefix }],
        isPrivate: isPrivateGame,
        createdAt: serverTimestamp(),
        playerOrder: [],
        turn: 0,
        currentPlayerId: assignedPlayerId,
      };

      const docRef = await addDoc(collection(db, "gameSessions"), gameSessionFirestoreData);

      localStorage.setItem(LOCAL_STORAGE_GAME_ID_KEY, docRef.id);
      localStorage.setItem(LOCAL_STORAGE_PLAYER_ID_KEY, assignedPlayerId);
      setLocalUserPlayerId(assignedPlayerId);

      setCreatedGameCode(newShareableCode);
      setGameState(prev => ({ ...prev, gameId: docRef.id, gamePhase: 'Awaiting Players', gameDataItems: baseInitialGameState.gameDataItems }));
      toast({ title: "Game Session Created!", description: `Share code: ${newShareableCode}`});
    } catch (error) {
      console.error("[useGameSessionManagement] Error creating game session:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({ title: "Error Creating Game", description: `Could not save game session. Details: ${errorMessage}`, variant: "destructive" });
    }
  }, [hostName, isPrivateGame, toast, setGameState]);

  const _processJoinAttempt = useCallback(async (gameSessionDocId: string, playerName: string) => {
    if (!gameSessionDocId || typeof gameSessionDocId !== 'string') {
      console.error("[useGameSessionManagement] Invalid gameSessionDocId passed to _processJoinAttempt:", gameSessionDocId);
      toast({ title: "Internal Error", description: "Invalid game session identifier provided (dev).", variant: "destructive" });
      return false;
    }
    if (!playerName.trim()) {
      toast({ title: "Name Required (Join)", description: "Please enter your name to join.", variant: "destructive" });
      return false;
    }

    let gameSessionData: GameSessionData | null = null;
    const gameDocRef = doc(db, "gameSessions", gameSessionDocId);
    try {
      const docSnap = await getDoc(gameDocRef);
      if (docSnap.exists()) {
        gameSessionData = { id: docSnap.id, ...docSnap.data() } as GameSessionData;
      }
    } catch (fetchError) {
      console.error("[useGameSessionManagement] Error fetching game document for join:", fetchError);
      let description = "Could not verify game session.";
      if (fetchError instanceof Error) {
        description += ` Details: ${fetchError.message} ${(fetchError as FirebaseError).code ? `(${(fetchError as FirebaseError).code})` : '' }`;
      }
      toast({ title: "Error Verifying Session", description, variant: "destructive" });
      return false;
    }

    if (!gameSessionData) {
      toast({ title: "Game Not Found (Post-Verification)", description: "The game session could not be found after verification attempt.", variant: "destructive" });
      return false;
    }

    if (gameSessionData.players.length >= 4) {
      toast({ title: "Game Full", description: "This game session is already full.", variant: "destructive" });
      return false;
    }
    if (gameSessionData.status !== 'Awaiting Players') {
      toast({ title: "Game Not Available", description: `This game is currently ${gameSessionData.status} and cannot be joined.`, variant: "destructive" });
      return false;
    }

    const nextPlayerConfigIndex = gameSessionData.players.length;
    const newPlayerBaseConfig = basePlayerConfigs[nextPlayerConfigIndex];

    if (!newPlayerBaseConfig) {
      toast({ title: "Error Joining Game (Config)", description: "No more player slots available (configuration issue).", variant: "destructive" });
      return false;
    }
    if (gameSessionData.players.some(p => p.originalConfigId === newPlayerBaseConfig.idPrefix)) {
      toast({ title: "Error Joining Game (Slot Taken)", description: `Player slot for ${newPlayerBaseConfig.namePrefix} seems to be taken.`, variant: "destructive" });
      return false;
    }

    const assignedPlayerId = newPlayerBaseConfig.idPrefix;
    const newPlayerFirestoreData = {
      playerId: assignedPlayerId,
      name: playerName,
      color: newPlayerBaseConfig.colorValue,
      originalConfigId: newPlayerBaseConfig.idPrefix,
    };

    try {
      await updateDoc(gameDocRef, {
        players: arrayUnion(newPlayerFirestoreData)
      });

      localStorage.setItem(LOCAL_STORAGE_GAME_ID_KEY, gameSessionData!.id);
      localStorage.setItem(LOCAL_STORAGE_PLAYER_ID_KEY, assignedPlayerId);
      setLocalUserPlayerId(assignedPlayerId);

      setGameState(prev => ({ ...prev, gameId: gameSessionData!.id, gamePhase: 'Awaiting Players', gameDataItems: baseInitialGameState.gameDataItems }));
      setJoinGameCode('');
      toast({ title: "Game Joined!", description: `${playerName} has joined game ${gameSessionData.gameCode}. Waiting for host to start...`, variant: "default" });
      return true;
    } catch (error) {
      console.error("[useGameSessionManagement] Error updating game session with new player:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({ title: "Error Finalizing Join", description: `Failed to update game session. ${errorMessage}`, variant: "destructive" });
      return false;
    }
  }, [toast, setGameState]);

  const handleJoinGame = useCallback(async () => {
    if (!joiningPlayerName.trim()) {
      toast({ title: "Name Required (Join)", description: "Please enter your name to join a game.", variant: "destructive" });
      return false;
    }
    if (!joinGameCode.trim()) {
      toast({ title: "Game Code Required (Join)", description: "Please enter a game code.", variant: "destructive" });
      return false;
    }

    try {
      const q = query(collection(db, "gameSessions"), where("gameCode", "==", joinGameCode.toUpperCase()));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        toast({ title: "Game Not Found", description: "No game was found with that code.", variant: "destructive" });
        return false;
      }
      const docSnap = querySnapshot.docs[0];
      return await _processJoinAttempt(docSnap.id, joiningPlayerName);
    } catch (error) {
      console.error("[useGameSessionManagement] Error searching for game to join:", error);
      toast({ title: "Error Joining Game", description: "An error occurred while trying to find the game.", variant: "destructive" });
      return false;
    }
  }, [joinGameCode, joiningPlayerName, _processJoinAttempt, toast]);

  const handleJoinListedGame = useCallback(async (game: GameSessionData) => {
    if (!game || !game.id) {
      toast({ title: "Invalid Game", description: "Selected game is invalid.", variant: "destructive" });
      return false;
    }
    return await _processJoinAttempt(game.id, joiningPlayerName || (basePlayerConfigs[0]?.namePrefix ?? 'Player'));
  }, [_processJoinAttempt, joiningPlayerName, toast]);

  // Subscribe to real-time updates for the active game session
  useEffect(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    if (!gameState.gameId) {
      setFirestoreGameStatus('setup');
      return;
    }

    const gameSessionRef = doc(db, "gameSessions", gameState.gameId);
    unsubscribeRef.current = onSnapshot(gameSessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const gameSessionData = { id: docSnap.id, ...docSnap.data() } as GameSessionData;

        // local user restore
        if (!localUserPlayerId && gameSessionData.id && typeof window !== 'undefined') {
          const storedGameId = localStorage.getItem(LOCAL_STORAGE_GAME_ID_KEY);
          const storedPlayerId = localStorage.getItem(LOCAL_STORAGE_PLAYER_ID_KEY);
          if (storedGameId === gameSessionData.id && storedPlayerId) {
            if (gameSessionData.players.some(p => p.playerId === storedPlayerId)) {
              setLocalUserPlayerId(storedPlayerId);
            } else {
              localStorage.removeItem(LOCAL_STORAGE_PLAYER_ID_KEY);
            }
          }
        }

        setFirestoreGameStatus(gameSessionData.status);

        const reconstructPlayers = (fsPlayers: GameSessionData['players'], playerOrderFromFS?: string[]): Player[] => {
          const orderedFsPlayers: GameSessionData['players'] = [];
          if (playerOrderFromFS && playerOrderFromFS.length > 0) {
            playerOrderFromFS.forEach(orderedPlayerId => {
              const p = fsPlayers.find(fp => fp.playerId === orderedPlayerId);
              if (p) orderedFsPlayers.push(p);
            });
            fsPlayers.forEach(fp => {
              if (!orderedFsPlayers.some(op => op.playerId === fp.playerId)) {
                orderedFsPlayers.push(fp);
              }
            });
          } else {
            orderedFsPlayers.push(...fsPlayers);
          }

          return orderedFsPlayers.map(fsPlayer => {
            const pConf = basePlayerConfigs.find(pc => pc.idPrefix === fsPlayer.originalConfigId);
            const currentLocalPlayer = gameState.players.find(p => p.id === fsPlayer.playerId);

            let playerResources: PlayerResources;
            if (currentLocalPlayer) {
              playerResources = currentLocalPlayer.resources;
            } else if (pConf) {
              playerResources = { ...pConf.initialResources, productionPoints: (gameSessionData.turn === 0 ? INITIAL_TURN_0_PRODUCTION_POINTS : 0) };
            } else {
              playerResources = { productionPoints: (gameSessionData.turn === 0 ? INITIAL_TURN_0_PRODUCTION_POINTS : 0), unassignedScouts: 0, unassignedCorvettes: 0, unassignedColonyTransports: 0 };
            }

            let assignedEntryPointId: string | undefined;
            if (gameSessionData.status === 'In Progress' && playerOrderFromFS && playerOrderFromFS.length > 0) {
              const playerIndexInOrder = playerOrderFromFS.indexOf(fsPlayer.playerId);
              if (playerIndexInOrder !== -1 && playerIndexInOrder < initialEntryPoints.length) {
                assignedEntryPointId = initialEntryPoints[playerIndexInOrder].id;
              } else {
                const originalConfigIndex = basePlayerConfigs.findIndex(bc => bc.idPrefix === fsPlayer.originalConfigId);
                if (originalConfigIndex !== -1 && originalConfigIndex < initialEntryPoints.length) {
                  assignedEntryPointId = initialEntryPoints[originalConfigIndex].id;
                }
              }
            } else {
              const originalConfigIndex = basePlayerConfigs.findIndex(bc => bc.idPrefix === fsPlayer.originalConfigId);
              if (originalConfigIndex !== -1 && originalConfigIndex < initialEntryPoints.length) {
                assignedEntryPointId = initialEntryPoints[originalConfigIndex].id;
              }
            }

            return {
              id: fsPlayer.playerId,
              name: fsPlayer.name,
              color: fsPlayer.color,
              originalConfigId: fsPlayer.originalConfigId,
              resources: playerResources,
              entryPointId: assignedEntryPointId,
              researchedTechIds: (currentLocalPlayer && currentLocalPlayer.researchedTechIds) ? currentLocalPlayer.researchedTechIds : [],
              researchProgress: (currentLocalPlayer && currentLocalPlayer.researchProgress) ? currentLocalPlayer.researchProgress : {},
              // preserve any other runtime-only fields you maintain in Player type
            } as Player;
          });
        };

        if (gameSessionData.status === 'Awaiting Players') {
          const updatedLocalPlayersFromFS = reconstructPlayers(gameSessionData.players, gameSessionData.playerOrder);
          setGameState(prevGameState => ({
            ...prevGameState,
            players: updatedLocalPlayersFromFS,
            gamePhase: 'Awaiting Players',
            gameDataItems: prevGameState.gameDataItems.length > 0 ? prevGameState.gameDataItems : baseInitialGameState.gameDataItems,
            turn: gameSessionData.turn !== undefined ? gameSessionData.turn : prevGameState.turn,
            currentPlayerId: gameSessionData.currentPlayerId || prevGameState.currentPlayerId,
          }));
        } else if (gameSessionData.status === 'In Progress') {
          const updatedPlayersFromFS = reconstructPlayers(gameSessionData.players, gameSessionData.playerOrder);
          setGameState(prev => ({
            ...prev,
            gameId: gameSessionData.id,
            gamePhase: 'playing',
            gameDataItems: prev.gameDataItems.length > 0 ? prev.gameDataItems : baseInitialGameState.gameDataItems,
            currentPlayerId: gameSessionData.currentPlayerId || (updatedPlayersFromFS.length > 0 ? updatedPlayersFromFS[0].id : null),
            turn: gameSessionData.turn !== undefined ? gameSessionData.turn : 0,
            players: updatedPlayersFromFS,
          }));
          if (!isAttemptingRejoin && !gameState.gameId) {
            toast({ title: "Game Started!", description: "The battle for the galaxy begins!" });
          }
        } else if (gameSessionData.status === 'Cancelled' || gameSessionData.status === 'Ended') {
          // if the server cancelled/ended the game, clear local session for players that were in it
          if (typeof window !== 'undefined') {
            const storedGameId = localStorage.getItem(LOCAL_STORAGE_GAME_ID_KEY);
            if (storedGameId === gameSessionData.id) {
              localStorage.removeItem(LOCAL_STORAGE_GAME_ID_KEY);
              localStorage.removeItem(LOCAL_STORAGE_PLAYER_ID_KEY);
            }
          }
          setGameState(initialGameStateRef.current);
        }
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
    // Intentionally only depend on gameState.gameId to re-subscribe when game changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.gameId, localUserPlayerId, isAttemptingRejoin]);

  /**
   * Start game:
   *  - verify minimum players,
   *  - shuffle player order,
   *  - assign playerOrder/currentPlayerId/turn/status,
   *  - create initial colony for each player at their starting entry (orbit 1, barren, mineralRich false, pop 0, defenses 0, production 0, commandPost true)
   */
  const handleStartGame = useCallback(async () => {
    const gameId = gameState.gameId;
    if (!gameId) {
      toast({ title: "Start Failed", description: "No active game to start.", variant: "destructive" });
      return;
    }

    const gameSessionRef = doc(db, "gameSessions", gameId);
    let currentFsGameData: GameSessionData | null = null;

    try {
      const docSnap = await getDoc(gameSessionRef);
      if (docSnap.exists()) {
        currentFsGameData = docSnap.data() as GameSessionData;
      } else {
        toast({ title: "Error Starting Game (Not Found)", description: "Game session not found for start.", variant: "destructive" });
        return;
      }
    } catch (error) {
      toast({ title: "Error Starting Game (Fetch Data)", description: "Could not fetch current game data to start game.", variant: "destructive" });
      return;
    }

    if (!currentFsGameData || currentFsGameData.players.length < MIN_PLAYERS_TO_START) {
      toast({ title: "Not Enough Players to Start", description: `Need at least ${MIN_PLAYERS_TO_START} players to start. Current: ${currentFsGameData?.players?.length || 0}`, variant: "destructive" });
      return;
    }

    try {
      // shuffle player order
      const playerIdsInSession = currentFsGameData.players.map(p => p.playerId);
      const shuffledPlayerIds = shuffleArray(playerIdsInSession);

      // Build updated players array including colonies for starting entry systems
      const updatedPlayersForFS = currentFsGameData.players.map((p) => {
        // Determine this player's index in the shuffled order
        const indexInOrder = shuffledPlayerIds.indexOf(p.playerId);
        let assignedEntry = undefined;

        if (indexInOrder !== -1 && indexInOrder < initialEntryPoints.length) {
          assignedEntry = initialEntryPoints[indexInOrder];
        } else {
          // fallback: use player's original config index
          const originalConfigIndex = basePlayerConfigs.findIndex(bc => bc.idPrefix === p.originalConfigId);
          if (originalConfigIndex !== -1 && originalConfigIndex < initialEntryPoints.length) {
            assignedEntry = initialEntryPoints[originalConfigIndex];
          }
        }

        // create colony only if we have an assigned entry point
        const colonies = p.colonies && Array.isArray(p.colonies) ? [...p.colonies] : [];

        if (assignedEntry) {
          const colony = {
            starSystem: `Entry ${indexInOrder + 1}`,  // Always populated
            orbit: 1,
            planetType: 'Barren',
            mineralRich: false,
            population: 0,
            defenses: {
              missileDefense: 0,
              advancedMissileDefense: 0,
              planetaryShield: false,
            },
            production: {
              factory: 0,
              roboticFactory: 0,
            },
            commandPost: true,
            createdAt: Date.now(),
          };
          // push initial colony
          colonies.push(colony);
        }

        return {
          ...p,
          colonies, // either new array or existing plus colony
        };
      });

      // write single update to set In Progress state + playerOrder + players (with colonies)
      await updateDoc(gameSessionRef, {
        status: "In Progress",
        playerOrder: shuffledPlayerIds,
        currentPlayerId: shuffledPlayerIds[0],
        turn: 0,
        players: updatedPlayersForFS,
      });

      toast({ title: "Game Started", description: "Player order set and starting colonies created.", variant: "default" });
    } catch (error) {
      console.error("[useGameSessionManagement] Error starting game:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({ title: "Error Starting Game (Update Status)", description: `Could not update game status. ${errorMessage}`, variant: "destructive" });
    }
  }, [gameState.gameId, toast]);

  /**
   * Cancel the game (local or server initiated)
   */
  const handleCancelGame = useCallback(async (isServerInitiated = false) => {
    const gameIdToCancel = gameState.gameId;

    if (typeof window !== 'undefined' && !isServerInitiated) {
      localStorage.removeItem(LOCAL_STORAGE_GAME_ID_KEY);
      localStorage.removeItem(LOCAL_STORAGE_PLAYER_ID_KEY);
      setLocalUserPlayerId(null);
    } else if (isServerInitiated && gameIdToCancel && typeof window !== 'undefined') {
      const storedGameId = localStorage.getItem(LOCAL_STORAGE_GAME_ID_KEY);
      if (storedGameId === gameIdToCancel) {
        localStorage.removeItem(LOCAL_STORAGE_GAME_ID_KEY);
        localStorage.removeItem(LOCAL_STORAGE_PLAYER_ID_KEY);
        setLocalUserPlayerId(null);
      }
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setCreatedGameCode(null);
    setGameState(initialGameStateRef.current);
    setHostName(basePlayerConfigs[0]?.namePrefix || 'Player 1 (Host)');
    setIsPrivateGame(false);
    setFirestoreGameStatus('setup');

    if (!gameIdToCancel) {
      if (!isServerInitiated) toast({ title: "Game Creation Cancelled (Local)", description: "The game setup was reset locally." });
      return;
    }

    try {
      const gameDocRef = doc(db, "gameSessions", gameIdToCancel);
      const gameDocSnap = await getDoc(gameDocRef);

      if (gameDocSnap.exists()) {
        if (gameDocSnap.data().status !== "In Progress" && !isServerInitiated) {
          await deleteDoc(gameDocRef);
          toast({ title: "Game Session Cancelled & Deleted", description: "The game has been removed from the server." });
        } else if (!isServerInitiated) {
          await updateDoc(gameDocRef, { status: "Cancelled" });
          toast({ title: "Game Session Cancelled", description: "The game in progress has been marked as cancelled." });
        }
      }
    } catch (error) {
      console.error("[useGameSessionManagement] Error cancelling game:", error);
      toast({ title: "Error Cancelling Game", description: "Could not update or delete game session.", variant: "destructive" });
    }
  }, [gameState.gameId, setGameState]);

  /**
   * End turn (basic rotation): advances currentPlayerId to next player in playerOrder and optionally increments turn.
   * Kept intentionally minimal — production logic handled elsewhere in your app.
   */
  const handleEndTurn = useCallback(async () => {
    if (!gameState.gameId) return;
    setIsEndingTurn(true);
    try {
      const gameDocRef = doc(db, "gameSessions", gameState.gameId);
      const docSnap = await getDoc(gameDocRef);
      if (!docSnap.exists()) {
        toast({ title: "End Turn Failed", description: "Game session not found.", variant: "destructive" });
        setIsEndingTurn(false);
        return;
      }
      const fsData = docSnap.data() as GameSessionData;
      const currentOrder = fsData.playerOrder && fsData.playerOrder.length > 0 ? fsData.playerOrder : (fsData.players ? fsData.players.map(p => p.playerId) : []);
      const currentPlayer = fsData.currentPlayerId;
      let nextIndex = 0;
      if (currentPlayer && currentOrder && currentOrder.length > 0) {
        const idx = currentOrder.indexOf(currentPlayer);
        nextIndex = (idx + 1) % currentOrder.length;
      } else {
        nextIndex = 0;
      }

      let newTurn = fsData.turn ?? 0;
      // if we've wrapped around to index 0, increment turn
      if (fsData.currentPlayerId && currentOrder.indexOf(fsData.currentPlayerId) === currentOrder.length - 1) {
        newTurn = (newTurn ?? 0) + 1;
      }

      await updateDoc(gameDocRef, {
        currentPlayerId: currentOrder[nextIndex],
        turn: newTurn,
      });

      setIsEndingTurn(false);
    } catch (error) {
      console.error("[useGameSessionManagement] Error ending turn:", error);
      toast({ title: "Error Ending Turn", description: "Could not complete end-turn action.", variant: "destructive" });
      setIsEndingTurn(false);
    }
  }, [gameState.gameId, toast]);

  return {
    createdGameCode,
    hostName,
    setHostName,
    isPrivateGame,
    setIsPrivateGame,
    joinGameCode,
    setJoinGameCode,
    joiningPlayerName,
    setJoiningPlayerName,
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
  };
};
