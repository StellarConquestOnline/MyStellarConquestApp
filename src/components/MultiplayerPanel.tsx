
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { GameSessionData, Player as PlayerType } from '@/types/game';
import { MIN_PLAYERS_TO_START } from '@/data/game-init-data';
import {
  XIcon,
  PlusSquare,
  LogIn,
  Copy,
  Lock,
  ListChecks,
  Loader2,
  UsersRound,
  Play,
} from 'lucide-react';

interface MultiplayerPanelProps {
  activePanel: 'create' | 'join' | null;
  setActivePanel: (panel: 'create' | 'join' | null) => void;
  createdGameCode: string | null;
  hostName: string;
  setHostName: (name: string) => void;
  isPrivateGame: boolean;
  setIsPrivateGame: (isPrivate: boolean) => void;
  joinGameCode: string;
  setJoinGameCode: (code: string) => void;
  joiningPlayerName: string;
  setJoiningPlayerName: (name: string) => void;
  publicGamesList: GameSessionData[];
  isLoadingPublicGames: boolean;
  firestoreGameStatus: string;
  localPlayers: PlayerType[];
  handleCreateGameSession: () => Promise<void>;
  handleJoinGame: () => Promise<boolean | undefined>;
  handleJoinListedGame: (game: GameSessionData) => Promise<boolean | undefined>;
  handleStartGame: () => Promise<void>;
  handleCancelGame: () => Promise<void>;
}

const MultiplayerPanel: React.FC<MultiplayerPanelProps> = ({
  activePanel,
  setActivePanel,
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
  localPlayers,
  handleCreateGameSession,
  handleJoinGame,
  handleJoinListedGame,
  handleStartGame,
  handleCancelGame,
}) => {
  const { toast } = useToast();

  if (!activePanel) return null;

  return (
    <Card className="w-full md:w-1/3 lg:w-1/4 xl:w-1/5 h-full flex flex-col shadow-lg">
      <CardHeader>
        <CardTitle className="capitalize flex items-center justify-between">
          {activePanel === 'create' ? 'Create Game Session' : 'Join Game Session'}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActivePanel(null)}>
            <XIcon className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="space-y-4">
          {activePanel === 'create' && !createdGameCode && (
            <>
              <p className="text-sm text-muted-foreground">Configure your new game session.</p>
              <div data-ai-hint="network game setup" className="w-full h-32 bg-muted rounded-md flex items-center justify-center mb-4">
                <Image src="https://placehold.co/300x200.png" alt="Create game placeholder" width={150} height={100} className="rounded" />
              </div>
              <div>
                <Label htmlFor="hostName" className="text-xs">Your Name</Label>
                <Input
                  id="hostName"
                  placeholder="Enter your name"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center space-x-2 mt-3">
                <Checkbox
                  id="isPrivateGame"
                  checked={isPrivateGame}
                  onCheckedChange={(checked) => setIsPrivateGame(checked as boolean)}
                />
                <Label htmlFor="isPrivateGame" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Private Game
                </Label>
              </div>
              <Button className="w-full mt-3" onClick={handleCreateGameSession} disabled={!hostName.trim()}>Create Game Session</Button>
            </>
          )}
          {activePanel === 'create' && createdGameCode && (
            <>
              <p className="text-lg font-semibold text-primary">Game Session Created!</p>
              <p className="text-sm text-muted-foreground mt-2 mb-1">Share this code with your friends:</p>
              <Card className="p-3 mb-4 bg-muted border-border">
                <p className="text-2xl font-mono font-bold text-center text-accent">{createdGameCode}</p>
              </Card>
              <Button className="w-full mb-2" variant="outline" onClick={() => {
                if (createdGameCode) {
                  navigator.clipboard.writeText(createdGameCode);
                  toast({ title: "Code Copied!", description: "Game code copied to clipboard." });
                }
              }}>
                <Copy className="w-4 h-4 mr-2" /> Copy Code
              </Button>

              {firestoreGameStatus === 'Awaiting Players' && (
                <Button
                  className="w-full mb-2"
                  onClick={handleStartGame}
                  disabled={localPlayers.length < MIN_PLAYERS_TO_START}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Game ({localPlayers.length}/{MIN_PLAYERS_TO_START} min)
                </Button>
              )}
              {firestoreGameStatus === 'In Progress' && (
                <p className="text-sm text-center text-green-500 font-semibold py-2">Game In Progress!</p>
              )}
               {firestoreGameStatus !== 'In Progress' && (
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={handleCancelGame}
                >
                  Cancel Game
                </Button>
               )}
            </>
          )}
          {activePanel === 'join' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="joiningPlayerName" className="text-xs">Your Name</Label>
                <Input
                  id="joiningPlayerName"
                  placeholder="Enter your name"
                  value={joiningPlayerName}
                  onChange={(e) => setJoiningPlayerName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><ListChecks className="w-4 h-4" /> Public Games</h4>
                {isLoadingPublicGames && <div className="flex items-center justify-center p-2"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> <span className="ml-2 text-sm text-muted-foreground">Loading games...</span></div>}
                {!isLoadingPublicGames && publicGamesList.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No public games available.</p>
                )}
                {!isLoadingPublicGames && publicGamesList.length > 0 && (
                  <ScrollArea className="max-h-48 pr-1">
                    <div className="space-y-2">
                      {publicGamesList.map(game => (
                        <Card key={game.id} className="p-3 bg-muted/50 hover:bg-muted/80 transition-colors">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs font-semibold">Host: {game.players[0]?.name || 'Unknown Host'}</p>
                              <p className="text-xs text-muted-foreground">Code: {game.gameCode}</p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <UsersRound className="w-3 h-3" /> {game.players.length}/4
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            variant="secondary"
                            onClick={async () => {
                              const success = await handleJoinListedGame(game);
                              if (success) setActivePanel(null);
                            }}
                            disabled={!joiningPlayerName.trim() || game.players.length >= 4 || firestoreGameStatus === 'In Progress' || game.status !== 'Awaiting Players'}
                          >
                            Join Game
                          </Button>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
              <Separator />
              <div>
                <Label htmlFor="joinGameCode" className="text-xs">Join by Code</Label>
                <Input
                  id="joinGameCode"
                  placeholder="Enter Game Code"
                  value={joinGameCode}
                  onChange={(e) => setJoinGameCode(e.target.value.toUpperCase())}
                  className="mt-1"
                />
                <Button
                  className="w-full mt-2"
                  onClick={async () => {
                    const success = await handleJoinGame();
                    if (success) setActivePanel(null);
                  }}
                  disabled={!joiningPlayerName.trim() || !joinGameCode.trim() || firestoreGameStatus === 'In Progress'}
                >
                  Join Game by Code
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default MultiplayerPanel;
