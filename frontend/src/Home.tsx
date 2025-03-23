import { useEffect, useState, useRef, useCallback } from "react";
import styled from "styled-components";
import AgentInfo from "./AgentInfo";
import { AgentState } from "./types";
import { useWebSocket } from "./WebSocketProvider";
import { Stage, Container, Graphics, Text, useApp } from "@pixi/react";
import * as PIXI from "pixi.js";

// Custom clickable container for Pixi v8 compatibility
const ClickableContainer = ({
  children,
  position,
  onClick,
  width = 40,
  height = 40,
  ...props
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Make container interactive
    container.eventMode = "static";
    container.cursor = "pointer";

    // Set hit area
    container.hitArea = new PIXI.Rectangle(
      -width / 2,
      -height / 2,
      width,
      height
    );

    // Add click handler
    const handleClick = () => {
      if (onClick) onClick();
    };

    container.on("pointerdown", handleClick);

    return () => {
      container.off("pointerdown", handleClick);
    };
  }, [onClick, width, height]);

  return (
    <Container ref={containerRef} position={position} {...props}>
      {children}
    </Container>
  );
};

// Define constants
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 1500;
const AGENT_RADIUS = 10;
const MARGIN = 50;

// Office layout constants
const DESK_WIDTH = 120;
const DESK_HEIGHT = 80;
const DESK_SPACING_X = 40;
const DESK_SPACING_Y = 60;
const CUBICLE_WIDTH = DESK_WIDTH + DESK_SPACING_X;
const CUBICLE_HEIGHT = DESK_HEIGHT + DESK_SPACING_Y;
const CUBICLES_PER_ROW = 5;
const OFFICE_START_X = 300;
const OFFICE_START_Y = 200;
const AISLE_WIDTH = 100; // Space between rows of cubicles

// Define office cubicle positions
const getCubiclePosition = (index: number) => {
  const row = Math.floor(index / CUBICLES_PER_ROW);
  const col = index % CUBICLES_PER_ROW;

  // Add an aisle after every two rows
  const aisleOffset = Math.floor(row / 2) * AISLE_WIDTH;

  return {
    x: OFFICE_START_X + col * CUBICLE_WIDTH,
    y: OFFICE_START_Y + row * CUBICLE_HEIGHT + aisleOffset,
    deskX: OFFICE_START_X + col * CUBICLE_WIDTH + DESK_SPACING_X / 2,
    deskY:
      OFFICE_START_Y + row * CUBICLE_HEIGHT + DESK_SPACING_Y / 2 + aisleOffset,
  };
};

interface Project {
  id: number;
  name: string;
}

// Convert hex color string to numeric color value
const hexToNumber = (hex: string) => parseInt(hex.replace("#", ""), 16);

// Agent component rendered in Pixi.js
const Agent = ({
  agent,
  name,
  onClick,
}: {
  agent: AgentState;
  name: string;
  onClick: () => void;
}) => {
  // Convert the color from hex string to number
  const colorValue = hexToNumber(agent.color);

  return (
    <ClickableContainer
      position={[agent.x, agent.y]}
      onClick={onClick}
      width={40}
      height={60}
    >
      {/* Draw agent body */}
      <Graphics
        draw={(g) => {
          g.clear();
          g.beginFill(colorValue);

          if (agent.isSitting) {
            // Sitting agent (smaller circle for head + rectangle for body)
            g.drawCircle(0, -5, AGENT_RADIUS - 2); // Head
            g.drawRoundedRect(-8, -3, 16, 15, 3); // Body
          } else {
            // Standing agent (just a circle)
            g.drawCircle(0, 0, AGENT_RADIUS);
          }

          g.endFill();
        }}
      />

      {/* Agent name label */}
      <Text
        text={
          agent.firstName && agent.lastName
            ? `${agent.firstName} ${agent.lastName}`
            : name
        }
        anchor={{ x: 0.5, y: 0.5 }}
        position={[0, -(AGENT_RADIUS + 10)]}
        style={{ fontSize: 12, fill: 0x000000 }}
      />

      {/* Agent type label */}
      {agent.type && (
        <Text
          text={agent.type}
          anchor={{ x: 0.5, y: 0.5 }}
          position={[0, -(AGENT_RADIUS + 25)]}
          style={{ fontSize: 12, fill: 0x000000 }}
        />
      )}

      {/* Message bubble */}
      {agent.activity && Date.now() - agent.activity.timestamp < 10000 && (
        <MessageBubble message={agent.activity.message} color={agent.color} />
      )}
    </ClickableContainer>
  );
};

// Message bubble component rendered in Pixi.js
const MessageBubble = ({
  message,
  color,
}: {
  message: string;
  color: string;
}) => {
  const displayText =
    message.length > 60 ? message.substring(0, 57) + "..." : message;
  const bubbleWidth = 120;
  const bubbleHeight = 50;
  const direction = "right"; // Could be made dynamic based on position

  // Create a lighter version of the agent color
  const getLighterColor = (hexColor: string) => {
    // Convert hex to numeric value
    const colorNum = parseInt(hexColor.replace("#", ""), 16);

    // Get RGB components
    const r = (colorNum >> 16) & 255;
    const g = (colorNum >> 8) & 255;
    const b = colorNum & 255;

    // Lighten each component
    const lighter_r = Math.min(255, r + Math.floor(0.7 * (255 - r)));
    const lighter_g = Math.min(255, g + Math.floor(0.7 * (255 - g)));
    const lighter_b = Math.min(255, b + Math.floor(0.7 * (255 - b)));

    // Convert back to numeric
    return (lighter_r << 16) | (lighter_g << 8) | lighter_b;
  };

  const lighterColor = getLighterColor(color);

  return (
    <Container position={[direction === "right" ? 25 : -bubbleWidth - 25, -10]}>
      <Graphics
        draw={(g) => {
          g.clear();
          g.beginFill(lighterColor);

          // Draw pointer
          g.moveTo(direction === "right" ? -15 : bubbleWidth + 15, 0);

          // Draw rounded rectangle
          const radius = 5;
          g.drawRoundedRect(0, 0, bubbleWidth, bubbleHeight, radius);
          g.endFill();
        }}
      />
      <Text
        text={displayText}
        style={{
          fontSize: 10,
          fill: 0x000000,
          wordWrap: true,
          wordWrapWidth: bubbleWidth - 10,
        }}
        position={[5, 5]}
      />
    </Container>
  );
};

// Office component
const Office = () => {
  // Draw office components (walls, cubicles, desks, etc.)
  return (
    <ClickableContainer
      position={[0, 0]}
      onClick={() => console.log("Office clicked")}
      width={CUBICLES_PER_ROW * CUBICLE_WIDTH + 400}
      height={Math.ceil(20 / CUBICLES_PER_ROW) * CUBICLE_HEIGHT + 400}
    >
      {/* Office floor */}
      <Graphics
        draw={(g) => {
          g.clear();

          // Draw office floor
          g.beginFill(0xeeeeee);
          g.drawRect(
            OFFICE_START_X - 100,
            OFFICE_START_Y - 100,
            CUBICLES_PER_ROW * CUBICLE_WIDTH + 200,
            Math.ceil(20 / CUBICLES_PER_ROW) * CUBICLE_HEIGHT + 300
          );
          g.endFill();

          // Draw office walls
          g.lineStyle(5, 0x999999, 1);
          g.drawRect(
            OFFICE_START_X - 100,
            OFFICE_START_Y - 100,
            CUBICLES_PER_ROW * CUBICLE_WIDTH + 200,
            Math.ceil(20 / CUBICLES_PER_ROW) * CUBICLE_HEIGHT + 300
          );

          // Draw entrance
          g.lineStyle(0);
          g.beginFill(0xdddddd);
          g.drawRect(
            OFFICE_START_X + (CUBICLES_PER_ROW * CUBICLE_WIDTH) / 2 - 50,
            OFFICE_START_Y - 100,
            100,
            20
          );
          g.endFill();
        }}
      />

      {/* Draw cubicles */}
      {Array.from({ length: 20 }).map((_, index) => {
        const cubicle = getCubiclePosition(index);
        return (
          <Graphics
            key={`cubicle-${index}`}
            draw={(g) => {
              // Draw desk
              g.beginFill(0x8b4513); // Brown for desk
              g.drawRect(cubicle.deskX, cubicle.deskY, DESK_WIDTH, DESK_HEIGHT);
              g.endFill();

              // Draw cubicle walls (3 sides, leaving one side open)
              g.lineStyle(3, 0xaaaaaa, 1);

              // Left wall
              g.moveTo(cubicle.x, cubicle.y);
              g.lineTo(cubicle.x, cubicle.y + CUBICLE_HEIGHT);

              // Back wall
              g.moveTo(cubicle.x, cubicle.y);
              g.lineTo(cubicle.x + CUBICLE_WIDTH, cubicle.y);

              // Right wall
              g.moveTo(cubicle.x + CUBICLE_WIDTH, cubicle.y);
              g.lineTo(cubicle.x + CUBICLE_WIDTH, cubicle.y + CUBICLE_HEIGHT);

              // Draw chair
              g.beginFill(0x333333);
              g.drawCircle(
                cubicle.deskX + DESK_WIDTH / 2,
                cubicle.deskY + DESK_HEIGHT + 15,
                10
              );
              g.endFill();

              // Draw computer
              g.beginFill(0x444444);
              g.drawRect(
                cubicle.deskX + DESK_WIDTH / 2 - 15,
                cubicle.deskY + 10,
                30,
                25
              );
              g.endFill();

              // Draw monitor stand
              g.beginFill(0x666666);
              g.drawRect(
                cubicle.deskX + DESK_WIDTH / 2 - 3,
                cubicle.deskY + 35,
                6,
                10
              );
              g.endFill();
            }}
          />
        );
      })}
    </ClickableContainer>
  );
};

// World component that contains all agents
const World = ({
  agents,
  onAgentClick,
}: {
  agents: Record<string, AgentState>;
  onAgentClick: (agentId: string) => void;
}) => {
  const app = useApp();

  useEffect(() => {
    if (!app || !app.stage) return;

    // Setup drag to pan functionality
    app.stage.eventMode = "static";

    // Center the view on the office
    const centerOfficeX =
      OFFICE_START_X + (CUBICLES_PER_ROW * CUBICLE_WIDTH) / 2;
    const centerOfficeY =
      OFFICE_START_Y + (Math.ceil(20 / CUBICLES_PER_ROW) * CUBICLE_HEIGHT) / 2;

    // Center the office in the viewport
    app.stage.position.x = app.screen.width / 2 - centerOfficeX;
    app.stage.position.y = app.screen.height / 2 - centerOfficeY;

    // Set initial scale
    app.stage.scale.x = 0.7;
    app.stage.scale.y = 0.7;

    // In Pixi v8, hitArea is replaced with different properties
    // Set the entire screen as interactive area
    app.stage.hitArea = {
      contains: (x: number, y: number) => true,
    };

    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (!e) return;
      isDragging = true;
      prevX = e.x;
      prevY = e.y;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!e || !app.stage) return;
      if (isDragging) {
        const dx = e.x - prevX;
        const dy = e.y - prevY;

        app.stage.position.x += dx;
        app.stage.position.y += dy;

        prevX = e.x;
        prevY = e.y;
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onPointerUpOutside = () => {
      isDragging = false;
    };

    // Add event listeners
    if (app.view != null) {
      app.view.addEventListener("pointerdown", onPointerDown);
      app.view.addEventListener("pointermove", onPointerMove);
      app.view.addEventListener("pointerup", onPointerUp);
      app.view.addEventListener("pointerupoutside", onPointerUpOutside);
    }

    // Zoom with mouse wheel
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const direction = e.deltaY < 0 ? 1 : -1;
      const factor = 1.1;
      const zoom = direction > 0 ? factor : 1 / factor;

      // Get view if it exists
      const view = app.view as HTMLCanvasElement;
      if (!view) return;

      // Get position before scaling
      const mouseX = e.clientX - view.getBoundingClientRect().left;
      const mouseY = e.clientY - view.getBoundingClientRect().top;
      const worldPos = {
        x: (mouseX - app.stage.position.x) / app.stage.scale.x,
        y: (mouseY - app.stage.position.y) / app.stage.scale.y,
      };

      // Scale stage
      app.stage.scale.x *= zoom;
      app.stage.scale.y *= zoom;

      // Limit min/max zoom
      app.stage.scale.x = Math.min(Math.max(0.1, app.stage.scale.x), 2);
      app.stage.scale.y = Math.min(Math.max(0.1, app.stage.scale.y), 2);

      // Get position after scaling
      const newScreenPos = {
        x: worldPos.x * app.stage.scale.x + app.stage.position.x,
        y: worldPos.y * app.stage.scale.y + app.stage.position.y,
      };

      // Update position to zoom at cursor position
      app.stage.position.x -= newScreenPos.x - mouseX;
      app.stage.position.y -= newScreenPos.y - mouseY;
    };

    // Get the canvas element
    const canvas = app.view as HTMLCanvasElement;
    if (canvas) {
      canvas.addEventListener("wheel", onWheel);
    }

    return () => {
      // Clean up event listeners
      if (app.view) {
        app.view.removeEventListener("pointerdown", onPointerDown);
        app.view.removeEventListener("pointermove", onPointerMove);
        app.view.removeEventListener("pointerup", onPointerUp);
        app.view.removeEventListener("pointerupoutside", onPointerUpOutside);
      }

      if (canvas) {
        canvas.removeEventListener("wheel", onWheel);
      }
    };
  }, [app]);

  return (
    <Container>
      {/* Background grid */}
      <Graphics
        draw={(g) => {
          g.clear();
          g.lineStyle(1, 0xdddddd, 0.5);

          // Draw grid lines
          for (let x = 0; x <= WORLD_WIDTH; x += 100) {
            g.moveTo(x, 0);
            g.lineTo(x, WORLD_HEIGHT);
          }

          for (let y = 0; y <= WORLD_HEIGHT; y += 100) {
            g.moveTo(0, y);
            g.lineTo(WORLD_WIDTH, y);
          }

          // Draw world boundary
          g.lineStyle(2, 0x000000, 0.5);
          g.drawRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        }}
      />

      {/* Render office environment */}
      <Office />

      {/* Render all agents */}
      {Object.entries(agents).map(([name, agent]) => (
        <Agent
          key={name}
          agent={agent}
          name={name}
          onClick={() => onAgentClick(name)}
        />
      ))}
    </Container>
  );
};

function Home() {
  const [messages, setMessages] = useState<[string, string, string][]>([]);
  const [agents, setAgents] = useState<Record<string, AgentState>>({});
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set()
  );
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [stageSize, setStageSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const animationFrameRef = useRef<number | null>(null);
  const pixiAppRef = useRef<PIXI.Application | null>(null);

  const { subscribe, unsubscribe, sendMessage } = useWebSocket();

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setStageSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Fetch projects and usage stats on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch usage stats when project changes
  useEffect(() => {
    if (selectedProject) {
      setAgents({});
      fetchUsageStats();
    }
  }, [selectedProject]);

  const fetchUsageStats = async () => {
    if (!selectedProject) return;

    try {
      const response = await fetch(`http://localhost:8000/projects/active`);
      const data = await response.json();
      setTotalTokens(data.totalTokens);
      setTotalCost(data.totalCost);
      setAgents((prev) => {
        const updatedAgents = { ...prev };
        data.agents.forEach((a) => {
          if (!updatedAgents[a.id]) {
            const cubicle = assignCubicle(a.id, updatedAgents);
            updatedAgents[a.id] = {
              x: cubicle.x,
              y: cubicle.y,
              color: getRandomColor(),
              cubicleIndex: cubicle.cubicleIndex,
              isSitting: true,
              firstName: a.firstName,
              lastName: a.lastName,
            };
          }
        });
        return updatedAgents;
      });
    } catch (error) {
      console.error("Error fetching usage stats:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("http://localhost:8000/projects/");
      const data = await response.json();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(data[0]);
        handleActivateProject(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const response = await fetch("http://localhost:8000/projects/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newProjectName }),
      });

      if (response.ok) {
        setNewProjectName("");
        setShowAddProject(false);
        await fetchProjects();
      }
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleActivateProject = async (projectId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8000/projects/${projectId}/activate`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        await fetchUsageStats();
      }
    } catch (error) {
      console.error("Error activating project:", error);
    }
  };

  // Helper function to assign available cubicles to agents
  const assignCubicle = (
    agentName: string,
    existingAgents: Record<string, AgentState>
  ) => {
    // Get all currently assigned cubicles
    const assignedCubicles = new Set<number>();
    Object.values(existingAgents).forEach((agent) => {
      if (agent.cubicleIndex !== undefined) {
        assignedCubicles.add(agent.cubicleIndex);
      }
    });

    // Find an available cubicle
    let cubicleIndex = 0;
    while (assignedCubicles.has(cubicleIndex) && cubicleIndex < 20) {
      cubicleIndex++;
    }

    // If we found a cubicle, return it
    if (cubicleIndex < 20) {
      const cubicle = getCubiclePosition(cubicleIndex);
      return {
        cubicleIndex,
        x: cubicle.deskX + DESK_WIDTH / 2,
        y: cubicle.deskY + DESK_HEIGHT + 15, // Position on the chair
      };
    }

    // If all cubicles are taken, return a random position outside the office
    return {
      cubicleIndex: undefined,
      x: Math.random() * (WORLD_WIDTH - 2 * MARGIN) + MARGIN,
      y: Math.random() * (WORLD_HEIGHT - 2 * MARGIN) + MARGIN,
    };
  };

  useEffect(() => {
    subscribe("INTERACT", "home", (agent, payload) => {
      setAgents((prev) => {
        const updatedAgents = { ...prev };

        // Create agents if they don't exist
        if (!updatedAgents[agent]) {
          const cubicle = assignCubicle(agent, updatedAgents);
          updatedAgents[agent] = {
            x: cubicle.x,
            y: cubicle.y,
            color: getRandomColor(),
            cubicleIndex: cubicle.cubicleIndex,
            isSitting: true,
          };

          // Fetch agent info to get name
          const fetchAgentInfo = async () => {
            try {
              const [key, type] = agent.split("/");
              const urlFriendlyId = `${type}|${key}`;
              const response = await fetch(
                `http://localhost:8000/info/${urlFriendlyId}`
              );
              if (response.ok) {
                const data = await response.json();
                if (data.firstName && data.lastName) {
                  setAgents((currentAgents) => ({
                    ...currentAgents,
                    [agent]: {
                      ...currentAgents[agent],
                      firstName: data.firstName,
                      lastName: data.lastName,
                    },
                  }));
                }
              }
            } catch (error) {
              console.error("Error fetching agent info:", error);
            }
          };
          fetchAgentInfo();
        }

        if (!updatedAgents[payload]) {
          const cubicle = assignCubicle(payload, updatedAgents);
          updatedAgents[payload] = {
            x: cubicle.x,
            y: cubicle.y,
            color: getRandomColor(),
            cubicleIndex: cubicle.cubicleIndex,
            isSitting: true,
          };

          // Fetch agent info to get name
          const fetchAgentInfo = async () => {
            try {
              const [key, type] = payload.split("/");
              const urlFriendlyId = `${type}|${key}`;
              const response = await fetch(
                `http://localhost:8000/info/${urlFriendlyId}`
              );
              if (response.ok) {
                const data = await response.json();
                if (data.firstName && data.lastName) {
                  setAgents((currentAgents) => ({
                    ...currentAgents,
                    [payload]: {
                      ...currentAgents[payload],
                      firstName: data.firstName,
                      lastName: data.lastName,
                    },
                  }));
                }
              }
            } catch (error) {
              console.error("Error fetching agent info:", error);
            }
          };
          fetchAgentInfo();
        }

        // Get the target agent's cubicle
        const targetAgent = updatedAgents[payload];

        // Start the interaction sequence by having the initiating agent stand up
        updatedAgents[agent] = {
          ...updatedAgents[agent],
          isSitting: false,
          interactionState: "moving-out",
          interactingWith: payload,
          targetX: updatedAgents[agent].x + 30, // First move out of the cubicle
          targetY: updatedAgents[agent].y + 30,
          isMoving: true,
        };

        return updatedAgents;
      });

      // Add interaction message
      setMessages((prev) => [
        [agent, "interact", `${agent} is going to talk with ${payload}`],
        ...prev,
      ]);
    });

    subscribe("CREATE", "home", (agent, payload) => {
      setAgents((prev) => {
        if (!prev[agent]) {
          const cubicle = assignCubicle(agent, prev);

          // Fetch agent info to get name
          const fetchAgentInfo = async () => {
            try {
              const [key, type] = agent.split("/");
              const urlFriendlyId = `${type}|${key}`;
              const response = await fetch(
                `http://localhost:8000/info/${urlFriendlyId}`
              );
              if (response.ok) {
                const data = await response.json();
                if (data.firstName && data.lastName) {
                  setAgents((currentAgents) => ({
                    ...currentAgents,
                    [agent]: {
                      ...currentAgents[agent],
                      firstName: data.firstName,
                      lastName: data.lastName,
                    },
                  }));
                }
              }
            } catch (error) {
              console.error("Error fetching agent info:", error);
            }
          };

          // Call the fetch function
          fetchAgentInfo();

          return {
            ...prev,
            [agent]: {
              x: cubicle.x,
              y: cubicle.y,
              color: getRandomColor(),
              type: payload,
              cubicleIndex: cubicle.cubicleIndex,
              isSitting: true,
            },
          };
        }
        return prev;
      });

      // Add creation message
      setMessages((prev) => [
        [agent, "create", `Agent created as ${payload}`],
        ...prev,
      ]);
    });

    subscribe("INFO", "home", (_, payload) => {
      try {
        const info = JSON.parse(payload);
        setTotalTokens((prev) => prev + info.inputTokens + info.outputTokens);
        setTotalCost((prev) => prev + info.cost);
      } catch (error) {
        console.error("Error processing info message:", error);
      }
    });

    subscribe("MESSAGE", "home", (agent, payload) => {
      // Add agent if it doesn't exist
      setAgents((prev) => {
        if (!prev[agent]) {
          // Assign a cubicle to the new agent
          const cubicle = assignCubicle(agent, prev);

          // Fetch agent info to get name
          const fetchAgentInfo = async () => {
            try {
              const [key, type] = agent.split("/");
              const urlFriendlyId = `${type}|${key}`;
              const response = await fetch(
                `http://localhost:8000/info/${urlFriendlyId}`
              );
              if (response.ok) {
                const data = await response.json();
                if (data.firstName && data.lastName) {
                  setAgents((currentAgents) => ({
                    ...currentAgents,
                    [agent]: {
                      ...currentAgents[agent],
                      firstName: data.firstName,
                      lastName: data.lastName,
                    },
                  }));
                }
              }
            } catch (error) {
              console.error("Error fetching agent info:", error);
            }
          };

          // Call the fetch function
          fetchAgentInfo();

          return {
            ...prev,
            [agent]: {
              x: cubicle.x,
              y: cubicle.y,
              color: getRandomColor(),
              cubicleIndex: cubicle.cubicleIndex,
              isSitting: true,
              activity: {
                message: payload,
                timestamp: Date.now(),
              },
            },
          };
        }
        return {
          ...prev,
          [agent]: {
            ...prev[agent],
            activity: {
              message: payload,
              timestamp: Date.now(),
            },
          },
        };
      });

      // Add message to list
      setMessages((prev) => [[agent, "message", payload], ...prev]);
    });

    subscribe("SYSTEM", "home", (agent, payload) => {
      setMessages((prev) => [[agent, "system", payload], ...prev]);
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      unsubscribe("interact", "home");
      unsubscribe("create", "home");
      unsubscribe("info", "home");
      unsubscribe("message", "home");
      unsubscribe("system", "home");
    };
  }, []);

  // Handle agent selection
  const handleAgentClick = useCallback((agentId: string) => {
    console.log("Agent clicked:", agentId);
    setSelectedAgent(agentId);
  }, []);

  // Special handler for click events
  useEffect(() => {
    // Create a global click handler
    const handleCanvasClick = (e: MouseEvent) => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return;

      // Get click coordinates relative to canvas
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      console.log("Canvas clicked at:", x, y);

      // Get agents positioned at or near the click point
      const clickedAgents = Object.entries(agents).filter(([_, agent]) => {
        // Apply the stage's transform to get screen coordinates
        const app = pixiAppRef.current;
        if (!app || !app.stage) return false;

        const stagePos = app.stage.position;
        const stageScale = app.stage.scale;

        const screenX = agent.x * stageScale.x + stagePos.x;
        const screenY = agent.y * stageScale.y + stagePos.y;

        // Check if click is within 30px of agent
        const distance = Math.sqrt(
          Math.pow(screenX - x, 2) + Math.pow(screenY - y, 2)
        );
        return distance < 30;
      });

      // If we clicked on an agent, select it
      if (clickedAgents.length > 0) {
        const [agentId] = clickedAgents[0];
        console.log("Clicked on agent:", agentId);
        setSelectedAgent(agentId);
      }
    };

    const canvas = document.querySelector("canvas");
    if (canvas) {
      canvas.addEventListener("click", handleCanvasClick);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("click", handleCanvasClick);
      }
    };
  }, [agents, setSelectedAgent]);

  // Set up animation loop for agent movement and interaction
  useEffect(() => {
    const updateAgentPositions = () => {
      setAgents((prev) => {
        const updatedAgents = { ...prev };
        let hasChanges = false;

        Object.entries(updatedAgents).forEach(([name, agent]) => {
          // If the agent is moving, update its position
          if (
            agent.isMoving &&
            agent.targetX !== undefined &&
            agent.targetY !== undefined
          ) {
            const dx = agent.targetX - agent.x;
            const dy = agent.targetY - agent.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 5) {
              // Move towards target
              updatedAgents[name] = {
                ...agent,
                x: agent.x + (dx / distance) * 3,
                y: agent.y + (dy / distance) * 3,
              };
              hasChanges = true;
            } else {
              // Arrived at destination - handle next step based on interaction state
              updatedAgents[name] = {
                ...agent,
                x: agent.targetX,
                y: agent.targetY,
                isMoving: false,
              };

              // Handle interaction state transitions
              if (agent.interactionState && agent.interactingWith) {
                const targetAgent = updatedAgents[agent.interactingWith];

                if (agent.interactionState === "moving-out") {
                  // Agent has moved out of cubicle, now go to target agent's location
                  if (targetAgent && targetAgent.cubicleIndex !== undefined) {
                    const targetCubicle = getCubiclePosition(
                      targetAgent.cubicleIndex
                    );
                    updatedAgents[name] = {
                      ...updatedAgents[name],
                      interactionState: "moving-to-target",
                      targetX: targetCubicle.x + CUBICLE_WIDTH / 2, // Stand in front of the cubicle
                      targetY: targetCubicle.y + CUBICLE_HEIGHT + 20,
                      isMoving: true,
                    };
                  }
                } else if (agent.interactionState === "moving-to-target") {
                  // Agent has arrived at target's cubicle, start interacting
                  updatedAgents[name] = {
                    ...updatedAgents[name],
                    interactionState: "interacting",
                    // Add message bubble
                    activity: {
                      message: `Hey ${agent.interactingWith}, let's chat!`,
                      timestamp: Date.now(),
                    },
                  };

                  // Have the target agent respond
                  if (targetAgent) {
                    updatedAgents[agent.interactingWith] = {
                      ...targetAgent,
                      activity: {
                        message: `Sure thing, ${name}! What's up?`,
                        timestamp: Date.now() + 500, // Slightly delayed response
                      },
                    };
                  }

                  // Set a timeout to return to cubicle
                  setTimeout(() => {
                    setAgents((prevAgents) => {
                      const agents = { ...prevAgents };
                      if (agents[name]) {
                        agents[name] = {
                          ...agents[name],
                          interactionState: "returning",
                          isMoving: true,
                          targetX:
                            agents[name].cubicleIndex !== undefined
                              ? getCubiclePosition(agents[name].cubicleIndex).x
                              : Math.random() * WORLD_WIDTH,
                          targetY:
                            agents[name].cubicleIndex !== undefined
                              ? getCubiclePosition(agents[name].cubicleIndex)
                                  .y +
                                CUBICLE_HEIGHT / 2
                              : Math.random() * WORLD_HEIGHT,
                        };
                      }
                      return agents;
                    });
                  }, 5000); // Wait 5 seconds before returning
                } else if (agent.interactionState === "returning") {
                  // Agent has returned to cubicle, sit back down
                  if (agent.cubicleIndex !== undefined) {
                    const cubicle = getCubiclePosition(agent.cubicleIndex);
                    updatedAgents[name] = {
                      ...updatedAgents[name],
                      interactionState: undefined,
                      interactingWith: undefined,
                      isSitting: true,
                      x: cubicle.deskX + DESK_WIDTH / 2,
                      y: cubicle.deskY + DESK_HEIGHT + 15,
                    };
                  } else {
                    updatedAgents[name] = {
                      ...updatedAgents[name],
                      interactionState: undefined,
                      interactingWith: undefined,
                    };
                  }
                }
              } else {
                // Regular movement completed
                updatedAgents[name] = {
                  ...updatedAgents[name],
                  targetX: undefined,
                  targetY: undefined,
                };
              }

              hasChanges = true;
            }
          }
        });

        return hasChanges ? updatedAgents : prev;
      });

      animationFrameRef.current = requestAnimationFrame(updateAgentPositions);
    };

    animationFrameRef.current = requestAnimationFrame(updateAgentPositions);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const getRandomColor = () => {
    const colors = [
      "#FF9AA2",
      "#FFB7B2",
      "#FFDAC1",
      "#E2F0CB",
      "#B5EAD7",
      "#C7CEEA",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const toggleMessageExpand = (messageId: string) => {
    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const messageNeedsExpand = (message: string) => {
    const dummyElement = document.createElement("div");
    dummyElement.style.whiteSpace = "pre-wrap";
    dummyElement.style.width = "100%";
    dummyElement.style.height = "100px";
    dummyElement.style.position = "absolute";
    dummyElement.style.visibility = "hidden";
    dummyElement.textContent = message;
    document.body.appendChild(dummyElement);
    const needsExpand = dummyElement.scrollHeight > 100;
    document.body.removeChild(dummyElement);
    return needsExpand;
  };

  if (!selectedProject) {
    return (
      <FullScreenContainer>
        <ProjectPrompt>
          <h2>Welcome! Please create a project to get started.</h2>
          <Button onClick={() => setShowAddProject(true)}>
            Create Project
          </Button>
          {showAddProject && (
            <Modal>
              <ModalContent>
                <h3>Create New Project</h3>
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                />
                <ButtonGroup>
                  <Button onClick={handleAddProject}>Create</Button>
                  <Button onClick={() => setShowAddProject(false)}>
                    Cancel
                  </Button>
                </ButtonGroup>
              </ModalContent>
            </Modal>
          )}
        </ProjectPrompt>
      </FullScreenContainer>
    );
  }

  return (
    <FullScreenContainer>
      {/* Full-screen canvas with Pixi.js */}
      <CanvasContainer>
        <Stage
          options={{
            backgroundColor: 0xf8f8f8,
            autoDensity: true,
            resolution: window.devicePixelRatio || 1,
            antialias: true,
          }}
          width={stageSize.width}
          height={stageSize.height}
          onMount={(app) => {
            pixiAppRef.current = app;
          }}
        >
          <World agents={agents} onAgentClick={handleAgentClick} />
        </Stage>
      </CanvasContainer>

      {/* Overlay UI elements */}
      <OverlayContainer>
        <TopBar>
          <ProjectSelect
            value={selectedProject.id}
            onChange={(e) => {
              const project = projects.find(
                (p) => p.id === Number(e.target.value)
              );
              if (project) {
                setSelectedProject(project);
                handleActivateProject(project.id);
              }
            }}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </ProjectSelect>
          <Button onClick={() => setShowAddProject(true)}>Add Project</Button>

          <UsageStats>
            <div>Total Tokens: {totalTokens}</div>
            <div>Total Cost: ${totalCost.toFixed(4)}</div>
          </UsageStats>
        </TopBar>

        {showAddProject && (
          <Modal>
            <ModalContent>
              <h3>Create New Project</h3>
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name..."
              />
              <ButtonGroup>
                <Button onClick={handleAddProject}>Create</Button>
                <Button onClick={() => setShowAddProject(false)}>Cancel</Button>
              </ButtonGroup>
            </ModalContent>
          </Modal>
        )}

        {/* Messages panel or agent info */}
        <SidePanelContainer>
          {selectedAgent ? (
            <InfoPanel>
              <CloseButton onClick={() => setSelectedAgent(null)}>
                ×
              </CloseButton>
              <AgentInfo id={selectedAgent} />
            </InfoPanel>
          ) : (
            <MessagesPanel>
              {messages.map(([name, type, say], index) => {
                const messageId = `${name}-${index}`;
                const isExpanded = expandedMessages.has(messageId);
                const needsExpand = messageNeedsExpand(say);
                return (
                  <MessageBlock key={messageId} className="message-display">
                    <MessageHeader>
                      <h5>{name}</h5>
                    </MessageHeader>
                    <MessageContent
                      $isSystem={type === "system"}
                      $isInteract={type === "interact"}
                      $isCreate={type === "create"}
                      $isExpanded={isExpanded}
                    >
                      <pre>{say}</pre>
                      {needsExpand && (
                        <ExpandButton
                          onClick={() => toggleMessageExpand(messageId)}
                        >
                          {isExpanded ? "Show Less" : "Show More"}
                        </ExpandButton>
                      )}
                    </MessageContent>
                  </MessageBlock>
                );
              })}
            </MessagesPanel>
          )}
        </SidePanelContainer>
      </OverlayContainer>
    </FullScreenContainer>
  );
}

const FullScreenContainer = styled.div`
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: Arial, sans-serif;
`;

const CanvasContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const OverlayContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Allow clicks to pass through to canvas */

  /* Child elements need pointer-events: auto to be interactive */
  & > * {
    pointer-events: auto;
  }
`;

const TopBar = styled.div`
  position: absolute;
  top: 1rem;
  left: 1rem;
  right: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 0.5rem;
  border-radius: 5px;
  backdrop-filter: blur(5px);
`;

const SidePanelContainer = styled.div`
  position: absolute;
  top: 5rem;
  right: 1rem;
  width: 350px;
  max-height: calc(100vh - 8rem);
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const MessagesPanel = styled.div`
  padding: 1rem;
  overflow-y: auto;
  max-height: calc(100vh - 8rem);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const InfoPanel = styled.div`
  position: relative;
  padding: 1rem;
  overflow-y: auto;
  max-height: calc(100vh - 8rem);
`;

const ProjectSelect = styled.select`
  padding: 0.5rem;
  border-radius: 5px;
  border: 1px solid #c1c1c1;
  font-size: 1rem;
`;

const ProjectPrompt = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  width: 100%;
  height: 100%;
  text-align: center;
  background-color: #f8f8f8;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 10px;
  width: 400px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const UsageStats = styled.div`
  display: flex;
  gap: 20px;
  font-weight: bold;
  padding: 0.5rem 1rem;
  background-color: rgba(240, 240, 240, 0.5);
  border-radius: 5px;
  font-size: 0.9rem;
  color: #666;
  margin-left: auto;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid #c1c1c1;
  border-radius: 5px;
  width: 100%;
  font-size: 1rem;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background-color: #ffab91; /* pastel orange */
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    background-color: #ff8a65; /* darker pastel orange */
  }
`;

const MessageBlock = styled.div`
  margin-bottom: 0.5rem;
  border: 1px solid #eee;
  border-radius: 10px;
  overflow: hidden;
`;

const MessageHeader = styled.div`
  background-color: #b2e6f2; /* pastel blue */
  padding: 5px 10px;
  h5 {
    margin: 0;
  }
`;

const MessageContent = styled.div<{
  $isSystem?: boolean;
  $isInteract?: boolean;
  $isCreate?: boolean;
  $isExpanded?: boolean;
}>`
  padding: 5px 10px;
  color: #333;
  background-color: ${(props) => {
    if (props.$isSystem) return "#ffebee"; // red
    if (props.$isInteract) return "#fff3cd"; // yellow
    if (props.$isCreate) return "#d4edda"; // green
    return "#e1f5fe"; // default light blue
  }};
  position: relative;

  pre {
    margin: 0;
    white-space: pre-wrap;
    max-height: ${(props) => (props.$isExpanded ? "none" : "100px")};
    overflow: hidden;
    font-size: 0.9rem;
  }
`;

const ExpandButton = styled.button`
  position: absolute;
  bottom: 0;
  right: 0;
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 2px 5px;
  font-size: 12px;

  &:hover {
    text-decoration: underline;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  line-height: 1;
  z-index: 1;

  &:hover {
    color: #333;
  }
`;

export default Home;
