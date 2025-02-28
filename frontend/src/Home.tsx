import { useEffect, useState, useRef } from "react";
import styled from "styled-components";

const ws = new WebSocket("ws://localhost:8000/ws");

function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [agents, setAgents] = useState({});
  const canvasRef = useRef(null);

  useEffect(() => {
    ws.onmessage = (event) => {
      const data = event.data;

      // Check if it's an interaction message
      if (data.includes("interact:")) {
        const [agentName, interactMessage] = data.split("[$]");
        const targetAgent = interactMessage.replace("interact:", "").trim();

        // Update agent position to move towards target
        handleInteraction(agentName, targetAgent);
      } else {
        // Regular message
        const [agent, message] = data.split("[$]");

        // Add agent to the list if it doesn't exist yet
        if (!agents[agent]) {
          setAgents((prev) => ({
            ...prev,
            [agent]: {
              x: Math.random() * 380 + 10, // Random initial position
              y: Math.random() * 380 + 10,
              color: getRandomColor(),
            },
          }));
        }

        // Update messages
        setMessages((prev) => [[agent, message], ...prev]);
      }
    };

    // Animation loop for canvas rendering
    const intervalId = setInterval(() => {
      renderCanvas();
    }, 30);

    return () => clearInterval(intervalId);
  }, [agents]);

  const handleInteraction = (sourceAgent, targetAgent) => {
    if (agents[sourceAgent] && agents[targetAgent]) {
      setAgents((prev) => {
        const updatedAgents = { ...prev };

        // Set movement destination to target agent's position
        updatedAgents[sourceAgent] = {
          ...updatedAgents[sourceAgent],
          targetX: updatedAgents[targetAgent].x,
          targetY: updatedAgents[targetAgent].y,
          isMoving: true,
        };

        return updatedAgents;
      });
    }
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each agent and update positions
    setAgents((prev) => {
      const updatedAgents = { ...prev };

      Object.entries(updatedAgents).forEach(([name, agent]) => {
        // If the agent is moving, update its position
        if (agent.isMoving && agent.targetX !== undefined) {
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
          }
        }

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

      return updatedAgents;
    });
  };

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
