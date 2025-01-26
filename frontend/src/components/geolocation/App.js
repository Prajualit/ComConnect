import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import MapComponent from './Map';

const Geo = () => {
    const [location, setLocation] = useState(null);
    const [accuracy, setAccuracy] = useState(null);
    const [otherUsers, setOtherUsers] = useState(new Map());
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const socketRef = useRef(null);
    const watchIdRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    // Initialize socket connection
    const initializeSocket = useCallback(() => {
        const apiUrl = process.env.REACT_APP_API_URL;
        socketRef.current = io(apiUrl, {
            reconnection: true,
            reconnectionAttempts: maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        // Socket event handlers
        socketRef.current.on('connect', () => {
            console.log('Socket connected');
            setConnectionStatus('connected');
            reconnectAttempts.current = 0;
            
            // Re-setup user data after reconnection
            const userData = JSON.parse(localStorage.getItem('userInfo'));
            if (userData) {
                socketRef.current.emit('setup', userData);
            }
        });

        socketRef.current.on('disconnect', () => {
            console.log('Socket disconnected');
            setConnectionStatus('disconnected');
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('Connection error:', error);
            if (reconnectAttempts.current < maxReconnectAttempts) {
                reconnectAttempts.current += 1;
                setTimeout(() => {
                    socketRef.current.connect();
                }, 1000 * reconnectAttempts.current);
            }
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Start location watching
    const startLocationWatch = useCallback(() => {
        if (navigator.geolocation) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    const locationData = {
                        latitude,
                        longitude,
                        accuracy,
                        timestamp: Date.now()
                    };
                    
                    setLocation(locationData);
                    setAccuracy(accuracy);
                    
                    // Emit location only if socket is connected
                    if (socketRef.current?.connected) {
                        socketRef.current.emit('location-update', locationData);
                    }
                },
                (error) => console.error('Location error:', error),
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        }
    }, []);

    useEffect(() => {
        const cleanup = initializeSocket();
        startLocationWatch();

        // Setup socket event listeners
        if (socketRef.current) {
            socketRef.current.on('initial-locations', (locations) => {
                const usersMap = new Map();
                locations.forEach(loc => {
                    if (loc.userId !== socketRef.current.id) {
                        usersMap.set(loc.userId, loc);
                    }
                });
                setOtherUsers(usersMap);
            });

            socketRef.current.on('location-update', (data) => {
                if (data.userId !== socketRef.current.id) {
                    setOtherUsers(prev => new Map(prev.set(data.userId, data)));
                }
            });

            socketRef.current.on('user-disconnected', (userId) => {
                setOtherUsers(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(userId);
                    return newMap;
                });
            });
        }

        // Cleanup function
        return () => {
            cleanup();
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [initializeSocket, startLocationWatch]);

    return (
        <div>
            <h1>Real-Time Map</h1>
            <div className="connection-status">
                Status: {connectionStatus}
            </div>
            {accuracy && (
                <div>
                    Current Accuracy: {Math.round(accuracy)} meters
                </div>
            )}
            <MapComponent 
                location={location} 
                accuracy={accuracy} 
                otherUsers={Array.from(otherUsers.values())}
            />
        </div>
    );
};

export default Geo;
