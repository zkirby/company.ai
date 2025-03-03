import { useEffect, useState } from "react";
import styled from "styled-components";

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

const AgentInfo: React.FC<AgentInfoProps> = ({ id }) => {
  const [info, setInfo] = useState<AgentStats | null>(null);
  const [error, setError] = useState<string>("");

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
        console.log(data);
        setInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    };

    fetchAgentInfo();
  }, [id]);

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
    </InfoContainer>
  );
};

export default AgentInfo;
