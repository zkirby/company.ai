import { useEffect, useState, useRef, useCallback } from "react";
import styled from "styled-components";

const ws = new WebSocket("ws://localhost:8000/ws");

function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<[string, string][]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [agents, setAgents] = useState<Record<string, AgentState>>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  interface AgentState {
    x: number;
    y: number;
    color: string;
    targetX?: number;
    targetY?: number;
    isMoving?: boolean;
  }

  // Parse interaction messages with proper error handling
  const parseInteraction = useCallback((data: string) => {
    try {
      if (data.includes("[$]interact:")) {
        const [agentName, message] = data.split("[$]");
        const targetAgent = message.replace("interact:", "").trim();
        return { agentName, targetAgent };
      }
      return null;
    } catch (error) {
      console.error("Error parsing interaction:", error);
      return null;
    }
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    ws.onmessage = (event) => {
      const data = event.data;

      // Check if it's an interaction message
      const interaction = parseInteraction(data);
      if (interaction) {
        const { agentName, targetAgent } = interaction;

        // Update agent position to move towards target
        setAgents((prev) => {
          // Only process if both agents exist
          if (!prev[agentName] || !prev[targetAgent]) return prev;

          const updatedAgents = { ...prev };
          updatedAgents[agentName] = {
            ...updatedAgents[agentName],
            targetX: updatedAgents[targetAgent].x,
            targetY: updatedAgents[targetAgent].y,
            isMoving: true,
          };

          return updatedAgents;
        });
      } else {
        // Regular message
        try {
          const [agent, message] = data.split("[$]");

          // Add agent to the list if it doesn't exist yet
          setAgents((prev) => {
            if (!prev[agent]) {
              return {
                ...prev,
                [agent]: {
                  x: Math.random() * 380 + 10, // Random initial position
                  y: Math.random() * 380 + 10,
                  color: getRandomColor(),
                },
              };
            }
            return prev;
          });

          // Update messages
          setMessages((prev) => [[agent, message], ...prev]);
        } catch (error) {
          console.error("Error processing message:", error);
        }
      }
    };

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [parseInteraction]);

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
  }, []);

  // Canvas rendering function that doesn't update state
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each agent without updating state
    Object.entries(agents).forEach(([name, agent]) => {
      // Draw the agent
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = agent.color;
      ctx.fill();

      // Draw agent name
      ctx.fillStyle = "black";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(name, agent.x, agent.y - 15);
    });
  }, [agents]);

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

  return (
    <Container>
      <CanvasContainer>
        <Canvas ref={canvasRef} width={400} height={400} />
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

      {!isCollapsed && (
        <MessagesContainer>
          {messages.map(([name, say], index) => (
            <MessageBlock key={`${name}-${index}`} className="message-display">
              <MessageHeader>
                <h5>{name}</h5>
              </MessageHeader>
              <MessageContent>
                <pre>{say}</pre>
              </MessageContent>
            </MessageBlock>
          ))}
        </MessagesContainer>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  font-family: Arial, sans-serif;
`;

const CanvasContainer = styled.div`
  border: 2px solid #ccc;
  border-radius: 5px;
  margin-bottom: 20px;
`;

const Canvas = styled.canvas`
  background-color: #f8f8f8;
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
  width: 400px;
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
  width: 60%;
  max-width: 600px;
  text-align: left;
`;

const MessageBlock = styled.div`
  margin-top: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
  transition: transform 0.2s ease-in-out;
  &:hover {
    transform: scale(1.02);
  }
`;

const MessageHeader = styled.div`
  background-color: #b2e6f2; /* pastel blue */
  border-radius: 10px 10px 0 0;
  display: flex;
  justify-content: space-between;
  padding: 10px;
  cursor: pointer;
`;

const MessageContent = styled.div`
  padding: 10px;
  color: #333;
  background-color: #e1f5fe; /* pastel light blue */
  border-radius: 0 0 10px 10px;
  max-height: 300px;
  overflow-y: auto;
`;

export default Home;
