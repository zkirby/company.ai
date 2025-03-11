import { AgentState } from "./types";
import { lightenColor } from "./utils";

// Function to draw a chat bubble with specified direction and offset
export const drawChatBubble = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  message: string,
  color: string,
  direction = "right",
  offset = 0
) => {
  const bubbleWidth = 120;
  const bubbleHeight = 50;

  // Position bubble based on direction
  const bubbleX = direction === "right" ? x + 25 : x - bubbleWidth - 25;
  const bubbleY = y - 10 - offset; // Apply offset to avoid collision

  // Create a lighter version of the agent color for the bubble
  ctx.fillStyle = lightenColor(color, 0.7);

  // Calculate displayed text based on message length
  const displayText =
    message.length > 60 ? message.substring(0, 57) + "..." : message;

  // Draw bubble background
  ctx.beginPath();

  // Draw pointer from the correct side
  if (direction === "right") {
    ctx.moveTo(x + 10, y - offset); // Start from agent
  } else {
    ctx.moveTo(x - 10, y - offset); // Start from agent
  }

  // Bubble border with rounded corners
  const radius = 5;

  if (direction === "right") {
    // Right-side bubble
    ctx.lineTo(bubbleX - radius, bubbleY);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX, bubbleY + radius);
    ctx.lineTo(bubbleX, bubbleY + bubbleHeight - radius);
    ctx.quadraticCurveTo(
      bubbleX,
      bubbleY + bubbleHeight,
      bubbleX + radius,
      bubbleY + bubbleHeight
    );
    ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
    ctx.quadraticCurveTo(
      bubbleX + bubbleWidth,
      bubbleY + bubbleHeight,
      bubbleX + bubbleWidth,
      bubbleY + bubbleHeight - radius
    );
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + radius);
    ctx.quadraticCurveTo(
      bubbleX + bubbleWidth,
      bubbleY,
      bubbleX + bubbleWidth - radius,
      bubbleY
    );
    ctx.lineTo(bubbleX + radius, bubbleY);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX, bubbleY + radius);
  } else {
    // Left-side bubble
    ctx.lineTo(bubbleX + bubbleWidth + radius, bubbleY);
    ctx.quadraticCurveTo(
      bubbleX + bubbleWidth,
      bubbleY,
      bubbleX + bubbleWidth,
      bubbleY + radius
    );
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
    ctx.quadraticCurveTo(
      bubbleX + bubbleWidth,
      bubbleY + bubbleHeight,
      bubbleX + bubbleWidth - radius,
      bubbleY + bubbleHeight
    );
    ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
    ctx.quadraticCurveTo(
      bubbleX,
      bubbleY + bubbleHeight,
      bubbleX,
      bubbleY + bubbleHeight - radius
    );
    ctx.lineTo(bubbleX, bubbleY + radius);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
    ctx.quadraticCurveTo(
      bubbleX + bubbleWidth,
      bubbleY,
      bubbleX + bubbleWidth,
      bubbleY + radius
    );
  }

  ctx.fill();

  // Draw the text
  ctx.fillStyle = "black";
  ctx.font = "10px Arial";
  ctx.textAlign = "left";

  // Wrap text
  const words = displayText.split(" ");
  let line = "";
  let lineY = bubbleY + 15;

  words.forEach((word) => {
    const testLine = line + word + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > bubbleWidth - 10 && line !== "") {
      ctx.fillText(line, bubbleX + 5, lineY);
      line = word + " ";
      lineY += 12;

      // Check if we've exceeded the max height
      if (lineY > bubbleY + bubbleHeight - 5) {
        return; // Stop adding more lines
      }
    } else {
      line = testLine;
    }
  });

  // Draw the last line
  if (lineY <= bubbleY + bubbleHeight - 5) {
    ctx.fillText(line, bubbleX + 5, lineY);
  }
};

// Function to calculate optimal bubble placements
export const calculateBubblePlacements = (
  agents: Record<string, AgentState>,
  canvasRef: React.RefObject<HTMLCanvasElement>
) => {
  const placements: Record<string, { direction: string; offset: number }> = {};
  const canvas = canvasRef.current;
  if (!canvas) return placements;

  const canvasWidth = canvas.width;
  const bubbleWidth = 120;
  const bubbleHeight = 50;

  // Get a list of agents with active messages
  const activeAgents = Object.entries(agents).filter(
    ([, agent]) =>
      agent.activity && Date.now() - agent.activity.timestamp < 10000
  );

  // Canvas center point for reference
  const centerX = canvasWidth / 2;

  // Calculate placements for each agent
  activeAgents.forEach(([name, agent]) => {
    // Default placement direction
    let direction;

    // Determine direction based on position relative to center
    if (agent.x < centerX) {
      direction = "left"; // Agent is on the left side of canvas, put bubble on left
    } else {
      direction = "right"; // Agent is on the right side, put bubble on right
    }

    // Calculate vertical offset to avoid collision with other agents
    let offset = 0;

    // Check for potential collisions with other agents and their bubbles
    activeAgents.forEach(([otherName, otherAgent]) => {
      if (name === otherName) return; // Skip self

      // Calculate the bubble area for both agents
      const thisX =
        direction === "right" ? agent.x + 25 : agent.x - 25 - bubbleWidth;
      const otherX =
        otherAgent.x < centerX
          ? otherAgent.x - 25 - bubbleWidth
          : otherAgent.x + 25;

      // Check if bubbles would horizontally overlap
      const horizontalOverlap =
        thisX < otherX + bubbleWidth && thisX + bubbleWidth > otherX;

      // Check if agents are within vertical collision range
      const verticalProximity =
        Math.abs(agent.y - otherAgent.y) < bubbleHeight + 20;

      // If there's potential for collision, adjust the offset
      if (horizontalOverlap && verticalProximity) {
        offset = Math.max(offset, bubbleHeight);
      }
    });

    // Store the optimal placement
    placements[name] = { direction, offset };
  });

  return placements;
};
