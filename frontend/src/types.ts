export interface AgentState {
  x: number;
  y: number;
  color: string;
  type?: string;
  firstName?: string;
  lastName?: string;
  targetX?: number;
  targetY?: number;
  isMoving?: boolean;
  isSitting?: boolean;
  cubicleIndex?: number;
  activity?: {
    message: string;
    timestamp: number;
  };
  interactingWith?: string;
  interactionState?: 'moving-out' | 'moving-to-target' | 'interacting' | 'returning';
}

export interface ViewportState {
  scale: number;
  position: {
    x: number;
    y: number;
  };
}
