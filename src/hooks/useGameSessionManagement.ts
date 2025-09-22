
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/firebase/config';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, arrayUnion, onSnapshot, type Unsubscribe, deleteDoc, getDoc, type FirebaseError } from 'firebase/firestore';
import type { GameState, Player, GameSessionData, PlayerResources } from '@/types/game';
import { initialEntryPoints, playerConfigs as basePlayerConfigs, PRODUCTION_TURN_INTERVAL, INITIAL_TURN_0_PRODUCTION_POINTS, initialGameState as baseInitialGameState, MIN_PLAYERS_TO_START } from '@/data/game-init-data';
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
      querySnapshot.forEach((doc) => {
        games.push({ id: doc.id, ...(doc.data() as Omit<GameSessionData, 'id'>) });
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
            gameSessionData = {id: docSnap.id, ...docSnap.data()} as GameSessionData;
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
        toast({ title: "Game Not Found (Code)", description: "No game session found with that code.", variant: "destructive" });
        return false;
      }
      const gameDoc = querySnapshot.docs[0];
      return await _processJoinAttempt(gameDoc.id, joiningPlayerName);
    } catch (error) {
        console.error("[useGameSessionManagement] Error finding game by code:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast({ title: "Error Finding Game by Code", description: `Could not retrieve game session. ${errorMessage}`, variant: "destructive" });
        return false;
    }
  }, [joiningPlayerName, joinGameCode, toast, _processJoinAttempt]);

  const handleJoinListedGame = useCallback(async (gameToJoin: GameSessionData) => {
    if (!joiningPlayerName.trim()) {
      toast({ title: "Name Required (Listed Join)", description: "Please enter your name to join.", variant: "destructive" });
      return false;
    }
    return await _processJoinAttempt(gameToJoin.id, joiningPlayerName);
  }, [joiningPlayerName, toast, _processJoinAttempt]);

  const handleStartGame = useCallback(async () => {
    if (!gameState.gameId) {
        toast({ title: "Error Starting Game (No ID)", description: "No active game session to start.", variant: "destructive" });
        return;
    }

    const gameSessionRef = doc(db, "gameSessions", gameState.gameId);
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
        const playerIdsInSession = currentFsGameData.players.map(p => p.playerId);
        const shuffledPlayerIds = shuffleArray(playerIdsInSession);

        await updateDoc(gameSessionRef, {
            status: "In Progress",
            playerOrder: shuffledPlayerIds,
            currentPlayerId: shuffledPlayerIds[0],
            turn: 0,
        });
    } catch (error) {
        console.error("[useGameSessionManagement] Error updating game status to In Progress:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast({ title: "Error Starting Game (Update Status)", description: `Could not update game status. ${errorMessage}`, variant: "destructive" });
    }
  }, [gameState.gameId, toast]);

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
      } else if (!isServerInitiated) {
         toast({ title: "Game Already Removed", description: "The game session was not found on the server." });
      }
    } catch (error) {
      console.error("[useGameSessionManagement] Error cancelling/deleting game session in Firestore:", error);
      if (!isServerInitiated) toast({ title: "Cancellation Notice (Server Error)", description: "Local game state reset. Server interaction for cancellation failed.", variant: "destructive" });
    }
  }, [gameState.gameId, toast, setGameState, initialGameStateRef]);


  const handleEndTurn = useCallback(async () => {
    if (!gameState.gameId || !gameState.currentPlayerId || gameState.players.length === 0 || isEndingTurn) {
        if (!isEndingTurn) {
            toast({ title: "Cannot End Turn", description: "Game not ready or action already in progress.", variant: "destructive" });
        }
        return;
    }

    if (gameState.currentPlayerId !== localUserPlayerId) {
        toast({ title: "Not Your Turn", description: "You cannot end another player's turn.", variant: "destructive" });
        return;
    }

    setIsEndingTurn(true);

    try {
        const gameSessionRef = doc(db, "gameSessions", gameState.gameId);

        const currentSessionSnap = await getDoc(gameSessionRef);
        if (!currentSessionSnap.exists()) {
            throw new Error("Game session not found in Firestore during end turn.");
        }
        const currentSessionData = currentSessionSnap.data() as GameSessionData;
        const playerOrder = currentSessionData.playerOrder;

        if (!playerOrder || playerOrder.length === 0) {
             throw new Error("Player order not set in Firestore.");
        }

        const currentPlayerIndexInOrder = playerOrder.findIndex(pid => pid === currentSessionData.currentPlayerId);
        if (currentPlayerIndexInOrder === -1) {
            throw new Error("Current player ID from Firestore not found in playerOrder.");
        }

        let nextPlayerId: string;
        let nextTurn = currentSessionData.turn !== undefined ? currentSessionData.turn : 0;

        const currentLocalGameTurn = gameState.turn;
        const isCurrentTurnAProductionGameTurn = currentLocalGameTurn === 0 || (currentLocalGameTurn > 0 && currentLocalGameTurn % PRODUCTION_TURN_INTERVAL === 0);

        if (isCurrentTurnAProductionGameTurn && localUserPlayerId) {
            setGameState(prev => ({
                ...prev,
                players: prev.players.map(p =>
                    p.id === localUserPlayerId ? { ...p, resources: { ...p.resources, productionPoints: 0 } } : p
                ),
            }));
            toast({ title: "Production Actions Ended", description: "Unused Production Points lost." });
        }


        if (currentPlayerIndexInOrder + 1 < playerOrder.length) {
            nextPlayerId = playerOrder[currentPlayerIndexInOrder + 1];
        } else {
            nextPlayerId = playerOrder[0];
            nextTurn = nextTurn + 1;
        }

        await updateDoc(gameSessionRef, {
            currentPlayerId: nextPlayerId,
            turn: nextTurn,
        });

    } catch (error) {
        console.error("[useGameSessionManagement] Error ending turn:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast({ title: "Error Ending Turn", description: errorMessage, variant: "destructive" });
    } finally {
        setIsEndingTurn(false);
    }
  }, [gameState.gameId, gameState.currentPlayerId, gameState.players, gameState.turn, localUserPlayerId, isEndingTurn, toast, setGameState]);


  useEffect(() => {
    if (!gameState.gameId) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (!isAttemptingRejoin) {
        setFirestoreGameStatus('setup');
      }
      return;
    }

    if (unsubscribeRef.current) {
        unsubscribeRef.current();
    }

    const gameSessionRef = doc(db, "gameSessions", gameState.gameId);
    unsubscribeRef.current = onSnapshot(gameSessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const gameSessionData = { id: docSnap.id, ...docSnap.data() } as GameSessionData;

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
              researchedTechIds: currentLocalPlayer?.researchedTechIds || [],
              researchProgress: currentLocalPlayer?.researchProgress || {},
            };
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
           if (!isAttemptingRejoin && !gameState.gameId && prev.gamePhase !== 'playing') { // Check previous gamePhase
             toast({ title: "Game Started!", description: "The battle for the galaxy begins!" });
           }

        } else if (gameSessionData.status === 'Cancelled') {
            toast({ title: "Game Cancelled by Host", description: "This game session was cancelled."});
            handleCancelGame(true);
        }
      } else {
        toast({ title: "Game Session Ended/Removed", description: "The game session is no longer available.", variant: "destructive" });
        handleCancelGame(true);
      }
    }, (error) => {
        console.error("[useGameSessionManagement] Error in Firestore listener for gameId:", gameState.gameId, error);
        let description = "Lost connection to game session.";
        if (error instanceof Error && (error as FirebaseError).code) {
            description += ` Error Code: ${(error as FirebaseError).code}`;
        }
        toast({ title: "Connection Error to Game", description, variant: "destructive"});
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.gameId, toast, setGameState, handleCancelGame, initialGameStateRef, isAttemptingRejoin, localUserPlayerId]);

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

    