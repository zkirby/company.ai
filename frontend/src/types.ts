export interface AgentState {
  x: number;
  y: number;
  color: string;
  type?: string;
  targetX?: number;
  targetY?: number;
  isMoving?: boolean;
  activity?: {
    message: string;
    timestamp: number;
  };
}
