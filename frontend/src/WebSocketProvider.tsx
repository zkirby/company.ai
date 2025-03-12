import { createContext, useContext, useEffect, useState } from "react";

const ws = new WebSocket("ws://localhost:8000/ws");

const WebSocketContext = createContext<{
  subscribe: (
    topic: string,
    id: string,
    callback: (agent: string, payload: any) => void
  ) => void;
  unsubscribe: (topic: string, id: string) => void;
  sendMessage: (topic: string, id: string, message: string) => void;
}>({
  subscribe: () => {},
  unsubscribe: () => {},
  sendMessage: () => {},
});

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};

export const WebSocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [subscribers, setSubscriptions] = useState<{
    [key: string]: {
      [id: string]: (agent: string, payload: string) => void;
    };
  }>({});
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (messages.length === 0) return;

    const { agent, type, payload } = messages[0];

    if (subscribers[type]) {
      Object.values(subscribers[type]).forEach((callback) =>
        callback(agent, payload)
      );
    }

    setMessages((prevMessages) => prevMessages.slice(1));
  }, [subscribers, messages]);

  useEffect(() => {
    // Create WebSocket connection
    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const [agent, type, payload] = event.data.split("[$]");
      setMessages((prevMessages) => [
        ...prevMessages,
        { agent, type, payload },
      ]);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error: ", error);
    };

    // Cleanup on unmount
    return () => {
      // if (ws) ws.close();
    };
  }, []);

  // Function to subscribe to a topic with a callback
  const subscribe = (
    topic: string,
    id: string,
    callback: (agent: string, payload: string) => void
  ) => {
    setSubscriptions((prevSubscriptions) => {
      const newSubscriptions = { ...prevSubscriptions };
      if (!newSubscriptions[topic]) {
        newSubscriptions[topic] = {};
      }
      newSubscriptions[topic][id] = callback;
      return newSubscriptions;
    });
  };

  // Function to unsubscribe from a topic
  const unsubscribe = (topic: string, id: string) => {
    setSubscriptions((prevSubscriptions) => {
      const newSubscriptions = { ...prevSubscriptions };
      if (newSubscriptions[topic]) {
        delete newSubscriptions[topic][id];
      }
      return newSubscriptions;
    });
  };

  const sendMessage = (topic: string, id: string, message: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(`${topic}[$]${id}[$]${message}`);
    }
  };

  return (
    <WebSocketContext.Provider value={{ subscribe, unsubscribe, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};
