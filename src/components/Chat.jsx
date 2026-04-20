import { useEffect, useMemo, useRef, useState } from "react";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import {
  fetchMessages,
  fetchRooms,
  getBackendOrigin,
  mergeRooms,
  normalizeMessage,
  sendMessage as sendMessageRequest,
  uploadAttachment,
} from "../utils/chatApi";

const WEBSOCKET_URL = `${getBackendOrigin()}/ws`;
const USERNAME_STORAGE_KEY = "chatfront.username.session";
const CHAT_SYNC_CHANNEL = "chatfront.live-sync";

function getStoredUsername() {
  try {
    return (
      sessionStorage.getItem(USERNAME_STORAGE_KEY) ||
      `User-${Math.floor(100 + Math.random() * 900)}`
    );
  } catch {
    return `User-${Math.floor(100 + Math.random() * 900)}`;
  }
}

function toRoomLabel(roomId) {
  return roomId.replace(/-/g, " ");
}

function formatCompactCount(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  }

  return `${count}`;
}

function getRoomPreview(room, isActive) {
  if (!room.messageCount) {
    return isActive ? "Ready for the first message" : "No messages yet";
  }

  return `${formatCompactCount(room.messageCount)} total messages`;
}

const Chat = () => {
  const clientRef = useRef(null);
  const subscriptionRef = useRef(null);
  const syncChannelRef = useRef(null);
  const selectedRoomRef = useRef("general");
  const [rooms, setRooms] = useState(() => mergeRooms([], "general"));
  const [selectedRoom, setSelectedRoom] = useState("general");
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState(getStoredUsername);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [statusText, setStatusText] = useState("Connecting to Spring Boot chat server...");

  const sanitizedUsername = useMemo(() => username.trim() || "Guest", [username]);
  const attachmentCount = useMemo(
    () => messages.reduce((count, message) => count + (message.attachments?.length || 0), 0),
    [messages],
  );
  const activeRoom = useMemo(
    () => rooms.find((room) => room.roomId === selectedRoom),
    [rooms, selectedRoom],
  );
  const helperText = isLoadingMessages
    ? "Loading recent messages..."
    : isConnected
      ? "Messages appear live across open windows."
      : "History still works while realtime reconnects.";

  const appendIncomingMessage = (incomingMessage) => {
    let added = false;

    setMessages((prev) => {
      if (prev.some((message) => message.id === incomingMessage.id)) {
        return prev;
      }

      added = true;
      return [...prev, incomingMessage];
    });

    if (!added) {
      return;
    }

    setRooms((current) =>
      mergeRooms(
        current.map((room) =>
          room.roomId === incomingMessage.roomId
            ? {
                ...room,
                messageCount: room.messageCount + 1,
              }
            : room,
        ),
        selectedRoomRef.current,
      ),
    );
  };

  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
  }, [selectedRoom]);

  useEffect(() => {
    try {
      sessionStorage.setItem(USERNAME_STORAGE_KEY, sanitizedUsername);
    } catch {
      // Ignore storage failures so each window can still keep its own temporary name.
    }
  }, [sanitizedUsername]);

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const roomList = await fetchRooms();
        setRooms((current) => mergeRooms(roomList, selectedRoom || current[0]?.roomId || "general"));
      } catch {
        setRooms((current) => mergeRooms(current, selectedRoom));
      }
    };

    loadRooms();
  }, [selectedRoom]);

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async (showLoader = true) => {
      if (showLoader) {
        setIsLoadingMessages(true);
      }

      try {
        const roomMessages = await fetchMessages(selectedRoom);
        if (cancelled) {
          return;
        }

        setMessages(roomMessages);
        setStatusText(`Connected to ${toRoomLabel(selectedRoom)}.`);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "Could not load room history.";
        setMessages([]);
        setStatusText(message);
      } finally {
        if (!cancelled && showLoader) {
          setIsLoadingMessages(false);
        }
      }
    };

    loadMessages();

    const intervalId = window.setInterval(() => {
      loadMessages(false);
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedRoom]);

  useEffect(() => {
    let isMounted = true;
    let activeClient = null;

    const connect = async () => {
      try {
        const [{ Client }, sockjsModule] = await Promise.all([
          import("@stomp/stompjs"),
          import("sockjs-client"),
        ]);

        const SockJS = sockjsModule.default;
        if (!isMounted) {
          return;
        }

        const client = new Client({
          reconnectDelay: 3000,
          webSocketFactory: () => new SockJS(WEBSOCKET_URL),
          onConnect: () => {
            setIsConnected(true);
            setStatusText(`Live on ${toRoomLabel(selectedRoomRef.current)}.`);
          },
          onDisconnect: () => {
            setIsConnected(false);
            setStatusText("Chat server disconnected.");
          },
          onStompError: (frame) => {
            setIsConnected(false);
            setStatusText(frame.headers.message || "Server connection failed.");
          },
          onWebSocketClose: () => {
            setIsConnected(false);
            setStatusText("Trying to reconnect...");
          },
        });

        client.debug = () => {};
        client.activate();
        clientRef.current = client;
        activeClient = client;
      } catch (error) {
        setIsConnected(false);
        setStatusText(
          error instanceof Error ? error.message : "Realtime client could not start.",
        );
      }
    };

    connect();

    return () => {
      isMounted = false;
      subscriptionRef.current?.unsubscribe();
      activeClient?.deactivate();
      clientRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return undefined;
    }

    const channel = new BroadcastChannel(CHAT_SYNC_CHANNEL);
    syncChannelRef.current = channel;

    channel.onmessage = (event) => {
      const incomingMessage = event.data;
      if (!incomingMessage || incomingMessage.roomId !== selectedRoomRef.current) {
        return;
      }

      appendIncomingMessage(incomingMessage);
    };

    return () => {
      channel.close();
      syncChannelRef.current = null;
    };
  }, [selectedRoom]);

  useEffect(() => {
    const client = clientRef.current;
    if (!client?.connected) {
      return undefined;
    }

    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = client.subscribe(`/topic/rooms/${selectedRoom}`, (frame) => {
      const receivedMessage = normalizeMessage(JSON.parse(frame.body));
      appendIncomingMessage(receivedMessage);
    });

    setStatusText(`Live on ${toRoomLabel(selectedRoom)}.`);

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [isConnected, selectedRoom]);

  const sendMessage = async ({ text, files }) => {
    try {
      setStatusText(files.length > 0 ? "Uploading attachments..." : "Sending message...");
      const attachments = await Promise.all(files.map(uploadAttachment));

      const createdMessage = await sendMessageRequest({
        roomId: selectedRoom,
        sender: sanitizedUsername,
        text: text.trim(),
        attachments,
      });

      appendIncomingMessage(createdMessage);
      syncChannelRef.current?.postMessage(createdMessage);

      setStatusText("Message sent.");
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Message could not be sent.";
      setStatusText(message);
      return { ok: false, error: message };
    }
  };

  return (
    <div className="chat-shell">
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <div>
            <p className="sidebar-kicker">Workspace chat</p>
            <h2>Messages</h2>
          </div>
          <div className={`presence-pill ${isConnected ? "online" : "offline"}`}>
            {isConnected ? "Live" : "Offline"}
          </div>
        </div>

        <label className="profile-panel">
          <span>Your name</span>
          <input
            className="username-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            maxLength={20}
            title="Change your display name"
          />
          <span className="profile-note">Each browser window can keep its own identity.</span>
        </label>

        <nav className="room-list">
          {rooms.map((room) => (
            <button
              key={room.roomId}
              type="button"
              className={`room-list-item ${room.roomId === selectedRoom ? "active" : ""}`}
              onClick={() => setSelectedRoom(room.roomId)}
            >
              <span className="room-avatar">{(room.name || room.roomId).slice(0, 1)}</span>
              <span className="room-copy">
                <span className="room-title-row">
                  <strong>{room.name || toRoomLabel(room.roomId)}</strong>
                  <span className="room-badge">
                    {room.roomId === selectedRoom ? "Open" : "Room"}
                  </span>
                </span>
                <small>{getRoomPreview(room, room.roomId === selectedRoom)}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>Realtime delivery</span>
          <span>Uploads and room history stay available</span>
        </div>
      </aside>

      <section className="chat-box">
        <header className="chat-header">
          <div className="header-copy">
            <h1>{activeRoom?.name || toRoomLabel(selectedRoom)}</h1>
            <p className="connection-subtext">{statusText}</p>
          </div>

          <div className="header-summary">
            <span>{messages.length} shown</span>
            <span>{attachmentCount} media</span>
          </div>
        </header>

        <div className="chat-context-bar">
          <span className="context-pill">Signed in as {sanitizedUsername}</span>
          <span className="context-pill subtle">{helperText}</span>
        </div>

        <MessageList
          messages={messages}
          currentUser={sanitizedUsername}
          isLoading={isLoadingMessages}
        />
        <MessageInput sendMessage={sendMessage} isConnected={true} />
      </section>
    </div>
  );
};

export default Chat;
