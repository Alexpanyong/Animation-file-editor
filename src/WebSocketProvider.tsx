// WebSocketProvider.tsx

import React, { createContext, useEffect, useRef, useState } from 'react';

export const WebSocketContext = createContext<WebSocket | null>(null);

interface WebSocketProviderProps {
    children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
    const [ws, setWs] = useState<WebSocket | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const newWs = new WebSocket('ws://localhost:8080');

        newWs.onopen = () => {
            console.log('WebSocket connection opened');
        };

        newWs.onclose = () => {
            console.log('WebSocket connection closed');
            setWs(null);
        };

        wsRef.current = newWs;
        setWs(newWs);

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    return (
        <WebSocketContext.Provider value={ws}>
            {children}
        </WebSocketContext.Provider>
    );
};
