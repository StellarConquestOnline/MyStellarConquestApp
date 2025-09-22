
# Stellar Conquest - Project Context & History

## 1. Project Overview

**Project Name:** Stellar Conquest

**Core Objective:** To develop a turn-based multiplayer space strategy game featuring exploration, colonization, technological advancement, and fleet management.

**Tech Stack:**
*   NextJS (App Router, Server Components by default)
*   React (Functional Components, Hooks)
*   ShadCN UI Components
*   Tailwind CSS
*   Genkit (for AI features, specifically `googleai/gemini-2.0-flash`)
*   Firebase (Firestore for game session management)
*   TypeScript

**Key PRD Features:**
*   **Star Map UI:** Interactive map with star systems, dust clouds, player positions.
*   **Turn Management:** Turn-based flow, production phases every N turns (currently N=5, starting with Turn 0 as a production turn).
*   **Multiplayer Support:** 2-4 players online.
*   **Fog of War:** Hiding unexplored systems and opponent fleet compositions.
*   **Colony and Tech Management:** View colonies, manage production, fleets, research technology.
*   **Tutorial AI Assistant:** Genkit-powered tool for game mechanic explanations.

**Style Guidelines (from PRD):**
*   Primary Color: Deep space purple (`#4A148C`)
*   Background Color: Dark grey (`#212121`)
*   Accent Color: Electric blue (`#007BFF`)
*   Font: Modern, sans-serif (Geist Sans/Mono implemented).
*   Icons: Minimalist, geometric (using `lucide-react`).
*   Interface: Clean, intuitive, subtle animations.
*   Theme: Implemented via HSL CSS variables in `src/app/globals.css`.

## 2. Completed Milestones & Key Decisions

*   **Initial Setup:**
    *   Next.js project initialized with TypeScript.
    *   ShadCN UI components and Tailwind CSS configured.
    *   Firebase initialized (`src/firebase/config.ts`).
    *   Genkit initialized for AI (`src/ai/genkit.ts`, `src/ai/flows/tutorial-assistant.ts`).
*   **UI & Styling:**
    *   Global theme implemented in `src/app/globals.css` based on PRD.
    *   `RootLayout` (`src/app/layout.tsx`) and `HomePage` (`src/app/page.tsx`) set up.
    *   `GameClient.tsx` created as the main interactive component.
    *   Collapsible Sidebar (`components/ui/sidebar.tsx`) implemented with menu items for core game functions.
    *   Responsive panels for Star System Details, Management Info, and Multiplayer.
*   **Core Game Logic & State:**
    *   Game state managed in `GameClient.tsx` using `useState` and refined with `useGameSessionManagement.ts`.
    *   Type definitions in `src/types/game.ts`.
    *   Initial game data (star systems, dust clouds, entry points, game items, research) in `src/data/game-init-data.ts`.
*   **Star Map (`StarMap.tsx`):**
    *   Renders hex grid, star systems, dust clouds, entry point labels, visual map labels, fleets, and command posts.
    *   Handles star system selection.
    *   `isHexVisible` function implemented to control map boundaries.
    *   `parseAlphanumericCoordinate` utility for hex math.
    *   Player-specific colors for map elements.
    *   "Start X" labels for player starting positions, color changed to black.
    *   Visual "Entry X" labels at specified hexes.
*   **Multiplayer (`useGameSessionManagement.ts`, `MultiplayerPanel.tsx`):**
    *   Firestore (`gameSessions` collection) for creating and joining game sessions.
    *   Game code generation and sharing.
    *   Listing public games.
    *   Player name input for host and joining players.
    *   Minimum players to start game logic (`MIN_PLAYERS_TO_START`).
    *   Local storage used for game ID and player ID persistence for rejoin attempts.
    *   `playerOrder` established upon game start and used for turn progression.
*   **Turn Management (`GameClient.tsx`, `useGameSessionManagement.ts`):**
    *   Turn counter implemented.
    *   Current player tracking.
    *   Production turns implemented (Turn 0 and every `PRODUCTION_TURN_INTERVAL`).
    *   Initial Production Points (PP) for Turn 0, and regular PP for subsequent production turns.
    *   End turn logic, advancing to the next player in `playerOrder`.
*   **Gameplay Features:**
    *   **Star System Exploration (`GameClient.tsx`):**
        *   Revealing system details upon a player's fleet entering.
        *   Assigning ownership.
        *   Generating planets based on star color.
        *   Exploration hazards (e.g., scout/colony transport loss on anomaly roll).
    *   **Production (`ManagementInfoPanel.tsx`, `GameClient.tsx`):**
        *   UI for building units (Scouts, Corvettes, Colony Transports) and structures.
        *   UI for allocating PP to research.
        *   PP cost calculation, including discounts.
        *   Research prerequisite checks.
        *   Turn 0 build restrictions implemented.
    *   **Fleet Management (`ManagementInfoPanel.tsx`, `GameClient.tsx`):**
        *   UI for creating new fleets (Task Forces) from unassigned ships.
        *   Assigning ships to fleets from player resources.
        *   Target hex input for fleet creation.
    *   **Command Posts (`GameClient.tsx`, `StarMap.tsx`, `types/game.ts`, `data/game-init-data.ts`):**
        *   `CommandPost` type defined.
        *   Initial command posts created for each player at their starting `entryPointId` when the game starts.
        *   Rendered on `StarMap.tsx` as `Flag` icons in player color.
*   **Tutorial AI Assistant (`TutorialAssistantDialog.tsx`, `src/ai/flows/tutorial-assistant.ts`):**
    *   Dialog implemented to ask for game explanations.
    *   Genkit flow set up to provide explanations and strategic tips.

## 3. Current Focus & Next Steps (As of last interaction)

*   **Currently Working On:**
    *   Designing and implementing a visualization for the 8-hex command post range to assist with unit movement. Options discussed: subtle range overlay (primary), dynamic path-based warning (secondary).
*   **Immediate Next Steps (Post-Visualization):**
    *   Implement unit movement logic.
*   **Further Planned Features (from PRD & discussions):**
    *   Full Fog of War mechanics (hiding unexplored systems, opponent fleet compositions).
    *   Detailed Colony Management (population growth, per-colony PP, building effects).
    *   Full Technology research effects and prerequisites implementation.
    *   Combat mechanics.
    *   Refine multiplayer synchronization for all game state aspects (fleets, system ownership, research, etc.).

## 4. Important Notes & Patterns

*   User prefers to review plans before code implementation for new features.
*   Use absolute paths for file modifications in the XML format.
*   Context persistence system (this set of files) is being established.
*   Avoid hydration errors by deferring browser-specific/random value generation to `useEffect`.
*   Utilize ShadCN components and Tailwind for UI.
*   Game data largely driven by `src/data/game-init-data.ts`.
*   Game session and high-level turn progression managed via Firestore in `useGameSessionManagement.ts`.
*   Detailed game state updates (like unit building, research progress) currently happen in local React state within `GameClient.tsx` and its child components, and are reflected in Firestore for turn/player changes.
