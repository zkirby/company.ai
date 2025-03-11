import { useEffect, useState } from "react";
import styled from "styled-components";
import { useWebSocket } from "./WebSocketProvider";

interface AgentInfoProps {
  id: string;
}

interface AgentStats {
  cost: number;
  model: string;
  input_tokens: number;
  output_tokens: number;
}

const InfoContainer = styled.div`
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin: 8px 0;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 4px 0;
`;

const Label = styled.span`
  font-weight: 500;
  color: #666;
`;

const Value = styled.span`
  color: #333;
`;

const ChatContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const ChatInput = styled.input`
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #c1c1c1;
  border-radius: 5px;
`;

const ChatButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #ffab91;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  &:hover {
    background-color: #ff8a65;
  }
`;

const AgentInfo: React.FC<AgentInfoProps> = ({ id }) => {
  const [info, setInfo] = useState<AgentStats | null>(null);
  const [error, setError] = useState<string>("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  const { subscribe, unsubscribe, sendMessage } = useWebSocket();

  useEffect(() => {
    setMessages([]);
  }, [id]);

  useEffect(() => {
    subscribe("message_stream", id, (agent, payload) => {
      console.log(payload);
      setMessages((prevMessages) => {
        if (prevMessages.length % 2 === 0) {
          const last = prevMessages[prevMessages.length - 1];
          return [...prevMessages.slice(0, -1), last + payload];
        }
        return [...prevMessages, payload];
      });
    });
    return () => {
      unsubscribe("message_stream", id);
    };
  }, []);

  useEffect(() => {
    const fetchAgentInfo = async () => {
      try {
        const [key, type] = id.split("/");
        const urlFriendlyId = `${type}|${key}`;
        const response = await fetch(
          `http://localhost:8000/info/${urlFriendlyId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch agent info");
        }
        const data = await response.json();
        setInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    };

    fetchAgentInfo();
  }, [id]);

  const sendChatMessage = () => {
    if (input.trim()) {
      sendMessage("conversation", id, input);
      setInput("");
      setMessages((prevMessages) => {
        return [...prevMessages, input];
      });
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!info) {
    return <div>Loading...</div>;
  }

  return (
    <InfoContainer>
      <h1>About {id}</h1>
      <InfoRow>
        <Label>Model:</Label>
        <Value>{info.model}</Value>
      </InfoRow>
      <InfoRow>
        <Label>Cost:</Label>
        <Value>${info.cost}</Value>
      </InfoRow>
      <InfoRow>
        <Label>Input Tokens:</Label>
        <Value>{info.input_tokens}</Value>
      </InfoRow>
      <InfoRow>
        <Label>Output Tokens:</Label>
        <Value>{info.output_tokens}</Value>
      </InfoRow>

      <ChatContainer>
        <ChatInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Chat with agent..."
          onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
        />
        <ChatButton onClick={sendChatMessage}>Send</ChatButton>
      </ChatContainer>
      <div>
        {messages.map((message, ix) => (
          <div key={ix}>{message}</div>
        ))}
      </div>
    </InfoContainer>
  );
};

export default AgentInfo;
