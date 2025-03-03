import { useEffect, useState, useRef, useCallback } from "react";
import styled from "styled-components";
import AgentInfo from "./AgentInfo";

const ws = new WebSocket("ws://localhost:8000/ws");

// Add these constants at the top of the file, after imports
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const AGENT_RADIUS = 10;
const MARGIN = 10;
const INTERACTION_DISTANCE = 60; // Distance between interacting agents

interface Project {
  id: number;
  name: string;
}

function Home() {
  const [input, setInput] = useState("");
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

  // Fetch projects and usage stats on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch usage stats when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchUsageStats();
    }
  }, [selectedProject]);

  const fetchUsageStats = async () => {
    if (!selectedProject) return;

    try {
      const response = await fetch(`http://localhost:8000/projects/active`);
      const data = await response.json();
      setTotalTokens(data.total_tokens);
      setTotalCost(data.total_cost);
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

      console.log(await response.json());

      if (response.ok) {
        await fetchUsageStats();
      }
    } catch (error) {
      console.error("Error activating project:", error);
    }
  };

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

            // Calculate positions for the interaction
            const centerX =
              (updatedAgents[agent].x + updatedAgents[payload].x) / 2;
            const centerY =
              (updatedAgents[agent].y + updatedAgents[payload].y) / 2;

            // Position agents on either side of the center point
            updatedAgents[agent] = {
              ...updatedAgents[agent],
              targetX: centerX - INTERACTION_DISTANCE / 2,
              targetY: centerY,
              isMoving: true,
            };

            updatedAgents[payload] = {
              ...updatedAgents[payload],
              targetX: centerX + INTERACTION_DISTANCE / 2,
              targetY: centerY,
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

        case "info": {
          try {
            const info = JSON.parse(payload);
            setTotalTokens(
              (prev) => prev + info.input_tokens + info.output_tokens
            );
            setTotalCost((prev) => prev + info.cost);
          } catch (error) {
            console.error("Error processing info message:", error);
          }
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

  // Handle canvas click events
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clickX = x * scaleX;
      const clickY = y * scaleY;

      // Check if click is within any agent's radius
      Object.entries(agents).forEach(([agentId, agent]) => {
        const distance = Math.sqrt(
          Math.pow(clickX - agent.x, 2) + Math.pow(clickY - agent.y, 2)
        );
        if (distance <= AGENT_RADIUS) {
          setSelectedAgent(agentId);
        }
      });
    },
    [agents]
  );

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
      <Container>
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
      </Container>
    );
  }

  return (
    <Container>
      <ProjectHeader>
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
      </ProjectHeader>

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

      <MainPanel>
        <CanvasContainer>
          <Canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={handleCanvasClick}
          />
        </CanvasContainer>
        <UsageStats>
          <div>Total Tokens: {totalTokens}</div>
          <div>Total Cost: ${totalCost.toFixed(4)}</div>
        </UsageStats>
        <ControlArea>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <Button onClick={sendMessage}>Submit</Button>
        </ControlArea>
      </MainPanel>

      <SidePanel>
        {selectedAgent ? (
          <div style={{ position: "relative" }}>
            <CloseButton onClick={() => setSelectedAgent(null)}>×</CloseButton>
            <AgentInfo id={selectedAgent} />
          </div>
        ) : (
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
        )}
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

const ProjectHeader = styled.div`
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  z-index: 1;
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
  text-align: center;
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
`;

const Canvas = styled.canvas`
  background-color: #f8f8f8;
  width: 100%;
  height: auto;
  aspect-ratio: ${CANVAS_WIDTH} / ${CANVAS_HEIGHT};
  cursor: pointer;
`;

const UsageStats = styled.div`
  display: flex;
  gap: 20px;
  font-weight: bold;
  padding: 0.5rem;
  background-color: #f0f0f0;
  border-radius: 5px;
  font-size: 0.9rem;
  color: #666;
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
