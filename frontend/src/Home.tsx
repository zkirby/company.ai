import { useEffect, useState, useRef, useCallback } from "react";
import styled from "styled-components";

const ws = new WebSocket("ws://localhost:8000/ws");

// Add these constants at the top of the file, after imports
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const AGENT_RADIUS = 10;
const MARGIN = 10;

function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<[string, string, string][]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [agents, setAgents] = useState<Record<string, AgentState>>({});
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set()
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  interface AgentState {
    x: number;
    y: number;
    color: string;
    type?: string;
    targetX?: number;
    targetY?: number;
    isMoving?: boolean;
  }

  // Handle WebSocket messages
  useEffect(() => {
    ws.onmessage = (event) => {
      const data = event.data;

      // Check message type
      const [agent, type, payload] = data.split("[$]");

      switch (type) {
        case "interact": {
          // Create agents if they don't exist
          setAgents((prev) => {
            const updatedAgents = { ...prev };
            if (!updatedAgents[agent]) {
              updatedAgents[agent] = {
                x: Math.random() * (CANVAS_WIDTH - 2 * MARGIN) + MARGIN,
                y: Math.random() * (CANVAS_HEIGHT - 2 * MARGIN) + MARGIN,
                color: getRandomColor(),
              };
            }
            if (!updatedAgents[payload]) {
              updatedAgents[payload] = {
                x: Math.random() * (CANVAS_WIDTH - 2 * MARGIN) + MARGIN,
                y: Math.random() * (CANVAS_HEIGHT - 2 * MARGIN) + MARGIN,
                color: getRandomColor(),
              };
            }

            updatedAgents[agent] = {
              ...updatedAgents[agent],
              targetX: updatedAgents[payload].x,
              targetY: updatedAgents[payload].y,
              isMoving: true,
            };
            return updatedAgents;
          });

          // Add interaction message
          setMessages((prev) => [
            [agent, type, `Interacting with ${payload}`],
            ...prev,
          ]);
          break;
        }
        case "create": {
          // Handle agent creation
          setAgents((prev) => {
            if (!prev[agent]) {
              return {
                ...prev,
                [agent]: {
                  x: Math.random() * (CANVAS_WIDTH - 2 * MARGIN) + MARGIN,
                  y: Math.random() * (CANVAS_HEIGHT - 2 * MARGIN) + MARGIN,
                  color: getRandomColor(),
                  type: payload,
                },
              };
            }
            return prev;
          });

          // Add creation message
          setMessages((prev) => [
            [agent, type, `Agent created as ${payload}`],
            ...prev,
          ]);
          break;
        }

        case "message": {
          // Handle regular messages
          try {
            // Add agent if it doesn't exist
            setAgents((prev) => {
              if (!prev[agent]) {
                return {
                  ...prev,
                  [agent]: {
                    x: Math.random() * (CANVAS_WIDTH - 2 * MARGIN) + MARGIN,
                    y: Math.random() * (CANVAS_HEIGHT - 2 * MARGIN) + MARGIN,
                    color: getRandomColor(),
                  },
                };
              }
              return prev;
            });

            // Add message to list
            setMessages((prev) => [[agent, type, payload], ...prev]);
          } catch (error) {
            console.error("Error processing message:", error);
          }
          break;
        }

        case "system": {
          // Only add message to list without creating new agent
          try {
            setMessages((prev) => [[agent, type, payload], ...prev]);
          } catch (error) {
            console.error("Error processing message:", error);
          }
          break;
        }
      }
    };

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Canvas rendering function that doesn't update state
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    Object.entries(agents).forEach(([name, agent]) => {
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, AGENT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = agent.color;
      ctx.fill();

      ctx.fillStyle = "black";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(name, agent.x, agent.y - (AGENT_RADIUS + 5));
      if (agent.type) {
        ctx.fillText(agent.type, agent.x, agent.y - (AGENT_RADIUS + 20));
      }
    });
  }, [agents]);

  // Set up animation loop for agent movement and rendering
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
              // Arrived at destination
              updatedAgents[name] = {
                ...agent,
                x: agent.targetX,
                y: agent.targetY,
                isMoving: false,
                targetX: undefined,
                targetY: undefined,
              };
              hasChanges = true;
            }
          }
        });

        return hasChanges ? updatedAgents : prev;
      });

      renderCanvas();
      animationFrameRef.current = requestAnimationFrame(updateAgentPositions);
    };

    animationFrameRef.current = requestAnimationFrame(updateAgentPositions);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderCanvas]);

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

  const sendMessage = () => {
    if (ws.readyState === WebSocket.OPEN && input.trim()) {
      ws.send(input);
      setInput("");
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
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

  return (
    <Container>
      <MainPanel>
        <CanvasContainer>
          <Canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
        </CanvasContainer>
        <ControlArea>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <Button onClick={sendMessage}>Submit</Button>
          <Button onClick={toggleCollapse}>
            {isCollapsed ? "Expand" : "Collapse"}
          </Button>
        </ControlArea>
      </MainPanel>

      <SidePanel>
        <MessagesContainer>
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
        </MessagesContainer>
      </SidePanel>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  gap: 2rem;
  padding: 2rem;
  font-family: Arial, sans-serif;
  height: 100vh;
`;

const MainPanel = styled.div`
  width: 66%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SidePanel = styled.div`
  width: 33%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
`;

const CanvasContainer = styled.div`
  border: 2px solid #ccc;
  border-radius: 5px;
  margin-bottom: 20px;
`;

const Canvas = styled.canvas`
  background-color: #f8f8f8;
  width: 100%;
  height: auto;
  aspect-ratio: ${CANVAS_WIDTH} / ${CANVAS_HEIGHT};
`;

const ControlArea = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const Input = styled.textarea`
  padding: 0.5rem;
  border: 1px solid #c1c1c1;
  border-radius: 5px;
  resize: vertical;
  min-height: 100px;
  width: 100%;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background-color: #ffab91; /* pastel orange */
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  &:hover {
    background-color: #ff8a65; /* darker pastel orange */
  }
`;

const MessagesContainer = styled.div`
  width: 100%;
  text-align: left;
  flex-grow: 1;
  overflow-y: auto;
`;

const MessageBlock = styled.div`
  margin-bottom: 0.5rem;
  border: 1px solid #eee;
  border-radius: 10px;
`;

const MessageHeader = styled.div`
  background-color: #b2e6f2; /* pastel blue */
  border-radius: 10px 10px 0 0;
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
  border-radius: 0 0 10px 10px;
  position: relative;

  pre {
    margin: 0;
    white-space: pre-wrap;
    max-height: ${(props) => (props.$isExpanded ? "none" : "100px")};
    overflow: hidden;
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

export default Home;
