
'use client';

import type { StarSystem as StarSystemType, Fleet as FleetType, DustCloud as DustCloudType, EntryPoint as EntryPointType, Player as PlayerType, GameState, HexPosition, VisualMapLabel, CommandPost } from '@/types/game';
import { Rocket, Flag, MousePointerClick } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useMemo } from 'react';

// Helper function to convert offset coordinates (col, row) to axial coordinates (q, r, s)
// Assumes "odd-q" vertical layout (odd columns are shifted down)
const offsetToAxial = (hex: HexPosition): { q: number; r: number; s: number } => {
  const q = hex.col;
  const r = hex.row - (hex.col - (hex.col & 1)) / 2;
  return { q, r, s: -q - r };
};

// Helper function to calculate distance between two hexes using axial coordinates
export const hexDistance = (a: HexPosition, b: HexPosition): number => {
  const aAxial = offsetToAxial(a);
  const bAxial = offsetToAxial(b);
  return (Math.abs(aAxial.q - bAxial.q) + Math.abs(aAxial.r - bAxial.r) + Math.abs(aAxial.s - bAxial.s)) / 2;
};


interface StarMapProps {
  starSystems: StarSystemType[];
  fleets: FleetType[];
  commandPosts: CommandPost[];
  dustClouds: DustCloudType[];
  entryPoints: EntryPointType[];
  visualMapLabels: VisualMapLabel[];
  mapSettings: GameState['mapSettings'];
  showFogOfWar: boolean;
  currentPlayerId: string;
  players: PlayerType[];
  selectedStarSystemId: string | null;
  onStarSystemClick: (systemId: string) => void; // Kept for direct star system info
  onMapElementClick: (id: string | null, type: 'star-system' | 'fleet' | 'hex', position?: HexPosition) => void; // For fleet selection and hex targeting
  isProductionTurn?: boolean;
  selectedFleetId: string | null;
  isMovingFleet: boolean;
}

function getColumnLabel(colIndex: number): string {
  if (colIndex < 0) return '';
  let label = '';
  let num = colIndex;
  while (num >= 0) {
    label = String.fromCharCode((num % 26) + 'A'.charCodeAt(0)) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
}

export function parseAlphanumericCoordinate(alphanumCoord: string): HexPosition | null {
  const match = alphanumCoord.match(/^([A-Z]+)([0-9]+)/i);
  if (!match) {
    console.warn(`Invalid coordinate format: ${alphanumCoord}`);
    return null;
  }

  const colStr = match[1].toUpperCase();
  const rowStr = match[2];

  let col = -1;
  if (colStr.length === 1) {
    col = colStr.charCodeAt(0) - 'A'.charCodeAt(0);
  } else if (colStr.length === 2) {
    const char1Val = colStr.charCodeAt(0) - 'A'.charCodeAt(0);
    const char2Val = colStr.charCodeAt(1) - 'A'.charCodeAt(0);
    col = (char1Val + 1) * 26 + char2Val;
  } else {
    console.warn(`Invalid column string in coordinate (supports 1 or 2 letters): ${colStr}`);
    return null;
  }

  const row = parseInt(rowStr, 10) - 1;

  if (isNaN(row) || row < 0) {
    console.warn(`Invalid row number in coordinate: ${rowStr}`);
    return null;
  }

  return { col, row };
}

export function getStarSvgFillColor(colorName?: string): string {
  switch (colorName?.toLowerCase()) {
    case "red": return "rgb(206, 0, 0)";
    case "orange": return "rgb(247, 77, 0)";
    case "yellow": return "rgb(255, 235, 0)";
    case "green": return "rgb(0, 156, 0)";
    case "blue": return "rgb(0, 107, 237)";
	case "white": return "rgb(255, 255, 255)";
    default: return "rgb(220, 220, 220)";
  }
}

// Using the last known good version of isHexVisible
function isHexVisible(q: number, r: number, mapSettings: GameState['mapSettings']): boolean {
    if (q === 0) {
        return false;
    }
    if (r === 0 && q % 2 == 0) {
        return false;
    }
    if (q === 1 && r > 0 && r < 21) {
        return false;
    }
    if (r === 0 && q > 1 && q < 34) {
        return false;
    }
    if (q === 34 && r > 1 && r < 21) {
        return false;
    }
    if (r === 21 && q == 1) {
        return true;
    }
    if (r === 21 && q % 2 !== 0) {
        return false;
    }
    return true;
  
}


const Hexagon: React.FC<{
  q: number;
  r: number;
  hexSize: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  children?: React.ReactNode;
  onClick?: () => void;
  tooltip?: string | React.ReactNode;
  coordinateLabel?: string;
  isClickable?: boolean;
  showMoveTargetIndicator?: boolean;
}> = ({ q, r, hexSize, fill = 'transparent', stroke = 'hsl(var(--muted-foreground))', strokeWidth = 0.5, children, onClick, tooltip, coordinateLabel, isClickable = true, showMoveTargetIndicator = false }) => {
  const W_FLAT = 2 * hexSize;
  const H_FLAT = Math.sqrt(3) * hexSize;
  const mapPadding = hexSize * 0.5;

  const centerX = mapPadding + (W_FLAT / 2) + q * (W_FLAT * 0.75);
  let centerY = mapPadding + (H_FLAT / 2) + r * H_FLAT;
  if (q % 2 !== 0) {
    centerY += H_FLAT / 2;
  }

  const points = Array.from({ length: 6 })
    .map((_, i) => {
      const angleDeg = 60 * i;
      const angleRad = Math.PI / 180 * angleDeg;
      return `${centerX + hexSize * Math.cos(angleRad)},${centerY + hexSize * Math.sin(angleRad)}`;
    })
    .join(' ');

  const polygon = (
    <polygon
      points={points}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      onClick={isClickable ? onClick : undefined}
      className={isClickable && onClick ? 'cursor-pointer hover:stroke-ring hover:stroke-2' : 'cursor-default'}
      style={{ pointerEvents: 'all' }}
    />
  );

  const textElement = coordinateLabel ? (
    <text
      x={centerX}
      y={centerY - H_FLAT * 0.40 }
      fontSize={hexSize * 0.3}
      fill="hsla(var(--foreground), 0.5)"
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      {coordinateLabel}
    </text>
  ) : null;

  const childrenElement = children ? (
    <g transform={`translate(${centerX}, ${centerY})`} style={{ pointerEvents: 'none' }}>
      {children}
    </g>
  ) : null;
  
  const moveTargetIndicatorElement = showMoveTargetIndicator ? (
     <MousePointerClick x={centerX - hexSize * 0.25} y={centerY - hexSize * 0.25} width={hexSize*0.5} height={hexSize*0.5} color="hsl(var(--ring))" />
  ) : null;

  const gContent = (
    <g>
      {polygon}
      {textElement}
      {childrenElement}
      {moveTargetIndicatorElement}
    </g>
  );

  if (tooltip && typeof tooltip === 'string' && !onClick) {
    return <g title={tooltip}>{gContent}</g>;
  }

  return gContent;
};


const StarMap: React.FC<StarMapProps> = ({
  starSystems,
  fleets,
  commandPosts,
  dustClouds,
  entryPoints,
  visualMapLabels,
  mapSettings,
  showFogOfWar,
  currentPlayerId,
  players,
  selectedStarSystemId,
  onStarSystemClick,
  onMapElementClick,
  isProductionTurn = false,
  selectedFleetId,
  isMovingFleet,
}) => {
  const { cols, rowsEven, rowsOdd, hexSize } = mapSettings;

  const dustCloudCoordinatesSet = useMemo(() => {
    const set = new Set<string>();
    dustClouds.forEach(cloud => {
      if (isHexVisible(cloud.position.col, cloud.position.row, mapSettings)) {
        set.add(`${cloud.position.col}_${cloud.position.row}`);
      }
    });
    return set;
  }, [dustClouds, mapSettings]);

  const starSystemCoordinatesSet = useMemo(() => {
    const set = new Set<string>();
    starSystems.forEach(system => {
      if (isHexVisible(system.position.col, system.position.row, mapSettings)) {
        set.add(`${system.position.col}_${system.position.row}`);
      }
    });
    return set;
  }, [starSystems, mapSettings]);

  const currentPlayerCommandPosts = useMemo(() => {
    return commandPosts.filter(cp => cp.owner === currentPlayerId);
  }, [commandPosts, currentPlayerId]);

  const inRangeHexes = useMemo(() => {
    const rangeSet = new Set<string>();
    if (currentPlayerCommandPosts.length === 0) return rangeSet;

    for (let q_iter = 0; q_iter < cols; q_iter++) {
      const maxRows = q_iter % 2 !== 0 ? rowsOdd : rowsEven;
      for (let r_iter = 0; r_iter < maxRows; r_iter++) {
        if (isHexVisible(q_iter, r_iter, mapSettings)) {
          const currentHexPos: HexPosition = { col: q_iter, row: r_iter };
          for (const cp of currentPlayerCommandPosts) {
            if (hexDistance(currentHexPos, cp.position) <= 8) {
              rangeSet.add(`${q_iter}_${r_iter}`);
              break; 
            }
          }
        }
      }
    }
    return rangeSet;
  }, [cols, rowsOdd, rowsEven, mapSettings, currentPlayerCommandPosts]);


  const hexGridCellWidth = 2 * hexSize * 0.75;
  const hexGridCellHeight = Math.sqrt(3) * hexSize;
  const mapPadding = hexSize * 0.5;

  let gridContentWidth = 0;
  if (cols > 0) {
    gridContentWidth = ( (cols -1) * hexGridCellWidth ) + (2 * hexSize) ;
  }

  let gridContentHeight = 0;
  if (cols > 0) {
    let hasEvenCols = false;
    let hasOddCols = false;
    for(let i = 0; i < cols; i++) {
        if (i % 2 === 0) hasEvenCols = true;
        else hasOddCols = true;
    }
    if (hasOddCols && hasEvenCols) {
        gridContentHeight = Math.max(rowsEven * hexGridCellHeight, (rowsOdd * hexGridCellHeight) + (hexGridCellHeight / 2));
    } else if (hasEvenCols) {
        gridContentHeight = rowsEven * hexGridCellHeight;
    } else if (hasOddCols) {
        gridContentHeight = (rowsOdd * hexGridCellHeight) + (hexGridCellHeight / 2);
    }
    if (gridContentHeight > 0) gridContentHeight += hexGridCellHeight * 0.25;
  }


  if (cols === 0 || (rowsEven === 0 && rowsOdd === 0)) {
      gridContentWidth = 0;
      gridContentHeight = 0;
  }

  const totalViewBoxWidth = gridContentWidth + 2 * mapPadding;
  const totalViewBoxHeight = gridContentHeight + 2 * mapPadding;

  return (
    <Card
      className={`shadow-xl inline-block bg-transparent ${isProductionTurn && !isMovingFleet ? 'cursor-not-allowed opacity-75' : ''}`}
    >
      <CardContent className="p-0 relative">
        <svg
          viewBox={`0 0 ${totalViewBoxWidth || (2 * hexSize + 2*mapPadding)} ${totalViewBoxHeight || (Math.sqrt(3) * hexSize + 2*mapPadding)}`}
          width={totalViewBoxWidth || (2 * hexSize + 2*mapPadding)}
          height={totalViewBoxHeight || (Math.sqrt(3) * hexSize + 2*mapPadding)}
          style={{
              minWidth: totalViewBoxWidth || (2 * hexSize + 2*mapPadding),
              minHeight: totalViewBoxHeight || (Math.sqrt(3) * hexSize + 2*mapPadding),
              display: 'block'
          }}
        >
          {Array.from({ length: cols }).map((_, q) =>
            Array.from({ length: q % 2 !== 0 ? rowsOdd : rowsEven }).map((_, r) => {
              if (!isHexVisible(q, r, mapSettings)) {
                return null;
              }
              const colLabel = getColumnLabel(q);
              const rowLabel = r + 1;
              const coordinate = `${colLabel}${rowLabel}`;
              const hexKey = `${q}_${r}`;
              let baseHexFill = 'transparent';
              if (!isProductionTurn && inRangeHexes.has(hexKey) && !starSystemCoordinatesSet.has(hexKey) && !dustCloudCoordinatesSet.has(hexKey)) {
                baseHexFill = 'hsla(var(--accent), 0.1)'; 
              }
              const currentHexPos: HexPosition = {col: q, row: r};
              return (
                <Hexagon
                  key={`hex-${q}-${r}`}
                  q={q}
                  r={r}
                  hexSize={hexSize}
                  fill={baseHexFill}
                  stroke={'hsl(var(--muted-foreground))'}
                  strokeWidth={0.5}
                  coordinateLabel={coordinate}
                  isClickable={!isProductionTurn || isMovingFleet}
                  onClick={isMovingFleet && !isProductionTurn ? () => onMapElementClick(null, 'hex', currentHexPos) : undefined}
                  showMoveTargetIndicator={isMovingFleet && !isProductionTurn}
                />
              );
            })
          )}

          {dustClouds.map((cloud) => {
            if (!isHexVisible(cloud.position.col, cloud.position.row, mapSettings)) {
                return null;
            }
            return (
                <Hexagon
                  key={cloud.id}
                  q={cloud.position.col}
                  r={cloud.position.row}
                  hexSize={hexSize}
                  fill="hsla(0, 0%, 44.3%, 0.6)"
                  stroke="hsla(var(--muted-foreground), 0.5)"
                  tooltip="Dust Cloud (Slows Movement)"
                  isClickable={!isProductionTurn || isMovingFleet}
                  onClick={isMovingFleet && !isProductionTurn ? () => onMapElementClick(null, 'hex', cloud.position) : undefined}
                  showMoveTargetIndicator={isMovingFleet && !isProductionTurn}
                />
            );
          })}

          {starSystems.map((system) => {
            if (!isHexVisible(system.position.col, system.position.row, mapSettings)) {
                return null;
            }
            const isSelected = system.id === selectedStarSystemId && !isProductionTurn;
            const isDustCloudLocation = dustCloudCoordinatesSet.has(`${system.position.col}_${system.position.row}`);
            
            let hexFill: string;
            if (isSelected) {
              hexFill = 'hsla(var(--ring), 0.15)';
            } else if (isDustCloudLocation) {
              hexFill = inRangeHexes.has(`${system.position.col}_${system.position.row}`) && !isProductionTurn ? 'hsla(var(--accent), 0.1)' : 'transparent';
            } else {
              hexFill = inRangeHexes.has(`${system.position.col}_${system.position.row}`) && !isProductionTurn ? 'hsla(var(--accent), 0.1)' : 'hsla(var(--muted), 0.05)';
            }

            const hexStroke = isSelected ? 'hsl(var(--ring))' : 'hsl(var(--muted-foreground))';
            const starIconFillColor = getStarSvgFillColor(system.starColor);

            return (
              <Hexagon
                key={system.id}
                q={system.position.col}
                r={system.position.row}
                hexSize={hexSize}
                fill={hexFill}
                stroke={hexStroke}
                strokeWidth={isSelected ? 1.5 : 0.5}
                onClick={() => {
                  if (isMovingFleet && !isProductionTurn) {
                    onMapElementClick(system.id, 'star-system', system.position);
                  } else if (!isProductionTurn) {
                    onStarSystemClick(system.id);
                  }
                }}
                isClickable={!isProductionTurn || isMovingFleet}
                showMoveTargetIndicator={isMovingFleet && !isProductionTurn && !selectedFleetId}
              >
                <g style={{ pointerEvents: 'none' }}>
                  <circle cx="0" cy="0" r={hexSize * 0.30} fill={starIconFillColor} />
                  <text
                    x="0"
                    y={hexSize * 0.55}
                    fontSize={hexSize * 0.22}
                    fill="hsl(var(--foreground))"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontWeight: 'bold', userSelect: 'none' }}
                  >
                    {system.name}
                  </text>
                </g>
              </Hexagon>
            );
          })}

          {fleets.map((fleet) => {
             if (!isHexVisible(fleet.position.col, fleet.position.row, mapSettings)) {
                return null;
            }
            const systemAtFleetPos = starSystems.find(s => s.position.col === fleet.position.col && s.position.row === fleet.position.row);
            
            let isVisibleToCurrentPlayer = fleet.owner === currentPlayerId;
            if (!isVisibleToCurrentPlayer && !showFogOfWar) { 
                isVisibleToCurrentPlayer = true; 
            }
            
            if (!isVisibleToCurrentPlayer && showFogOfWar && systemAtFleetPos?.isExplored && systemAtFleetPos.owner === currentPlayerId) {
                isVisibleToCurrentPlayer = true; 
            }

            if (!isVisibleToCurrentPlayer) return null;

            const player = players.find(p => p.id === fleet.owner);
            const tailwindColorClass = player?.color || 'text-gray-400';
            let fleetSvgColor = 'gray';
            if (tailwindColorClass.includes('sky')) fleetSvgColor = 'deepskyblue';
            if (tailwindColorClass.includes('rose')) fleetSvgColor = 'lightcoral';
            if (tailwindColorClass.includes('yellow')) fleetSvgColor = 'gold';
            if (tailwindColorClass.includes('green')) fleetSvgColor = 'limegreen';

            const W_FLAT = 2 * hexSize;
            const H_FLAT = Math.sqrt(3) * hexSize;
            const mapPaddingFleet = hexSize * 0.5;
            const centerX = mapPaddingFleet + (W_FLAT / 2) + fleet.position.col * (W_FLAT * 0.75);
            let centerY = mapPaddingFleet + (H_FLAT / 2) + fleet.position.row * H_FLAT;
            if (fleet.position.col % 2 !== 0) {
              centerY += H_FLAT / 2;
            }

            const fleetTooltip = `Fleet (${player?.name || 'Unknown'}) - ${fleet.ships.reduce((sum, s) => sum + s.count, 0)} ships`;
            const iconSize = hexSize * 0.6;
            const isSelectedFleet = fleet.id === selectedFleetId;

            return (
              <g 
                key={fleet.id} 
                transform={`translate(${centerX - iconSize/2}, ${centerY - iconSize/2})`} 
                title={fleetTooltip}
                onClick={() => !isProductionTurn && onMapElementClick(fleet.id, 'fleet', fleet.position)}
                className={!isProductionTurn ? "cursor-pointer" : "cursor-default"}
              >
                 <Rocket 
                    style={{ 
                        color: fleetSvgColor, 
                        width: `${iconSize}px`, 
                        height: `${iconSize}px`,
                    }} 
                    strokeWidth={isSelectedFleet ? 3 : 2}
                    className={isSelectedFleet ? 'stroke-ring' : ''}
                />
              </g>
            );
          })}

          {commandPosts.map((cp) => {
            if (!isHexVisible(cp.position.col, cp.position.row, mapSettings)) {
              return null;
            }
            const player = players.find(p => p.id === cp.owner);
            const tailwindColorClass = player?.color || 'text-gray-400';
            let commandPostSvgColor = 'gray'; 

            if (tailwindColorClass.includes('sky')) commandPostSvgColor = 'deepskyblue';
            else if (tailwindColorClass.includes('rose')) commandPostSvgColor = 'lightcoral';
            else if (tailwindColorClass.includes('yellow')) commandPostSvgColor = 'gold';
            else if (tailwindColorClass.includes('green')) commandPostSvgColor = 'limegreen';

            const W_FLAT = 2 * hexSize;
            const H_FLAT = Math.sqrt(3) * hexSize;
            const cpMapPadding = hexSize * 0.5;
            const centerX = cpMapPadding + (W_FLAT / 2) + cp.position.col * (W_FLAT * 0.75);
            let centerY = cpMapPadding + (H_FLAT / 2) + cp.position.row * H_FLAT;
            if (cp.position.col % 2 !== 0) {
              centerY += H_FLAT / 2;
            }

            const iconSize = hexSize * 0.5;
            const tooltipText = `${player?.name || 'Unknown Player'}'s Command Post`;

            return (
              <g key={cp.id} transform={`translate(${centerX - iconSize / 2}, ${centerY - iconSize / 2})`} title={tooltipText}>
                <Flag style={{ color: commandPostSvgColor, width: `${iconSize}px`, height: `${iconSize}px` }} />
              </g>
            );
          })}

          {entryPoints.map((ep) => {
              if (!isHexVisible(ep.position.col, ep.position.row, mapSettings)) {
                  return null;
              }
              const ep_mapPadding = hexSize * 0.5;
              const ep_W_UNIT = 2 * hexSize;
              const ep_H_UNIT = Math.sqrt(3) * hexSize;

              let ep_cx = ep_mapPadding + (ep_W_UNIT / 2) + ep.position.col * (ep_W_UNIT * 0.75);
              let ep_cy = ep_mapPadding + (ep_H_UNIT / 2) + ep.position.row * ep_H_UNIT;
              if (ep.position.col % 2 !== 0) {
                  ep_cy += ep_H_UNIT / 2;
              }

            return (
              <text
                key={ep.id}
                x={ep_cx}
                y={ep_cy}
                fontSize={hexSize * 0.45}
                fill="black"
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none font-semibold"
              >
                {ep.name}
              </text>
            );
          })}

          {visualMapLabels.map((label) => {
            if (!isHexVisible(label.position.col, label.position.row, mapSettings)) {
                return null;
            }
            const label_mapPadding = hexSize * 0.5;
            const label_W_UNIT = 2 * hexSize;
            const label_H_UNIT = Math.sqrt(3) * hexSize;

            let label_cx = label_mapPadding + (label_W_UNIT / 2) + label.position.col * (label_W_UNIT * 0.75);
            let label_cy = label_mapPadding + (label_H_UNIT / 2) + label.position.row * label_H_UNIT;
            if (label.position.col % 2 !== 0) {
                label_cy += label_H_UNIT / 2;
            }

            return (
              <text
                key={label.id}
                x={label_cx}
                y={label_cy}
                fontSize={hexSize * 0.40}
                fill="hsl(var(--muted-foreground))"
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none font-normal"
              >
                {label.text}
              </text>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
};

export default StarMap;

    
