const BACKEND_ORIGIN = import.meta.env.VITE_BACKEND_ORIGIN || "http://localhost:8081";
const API_BASE = `${BACKEND_ORIGIN}/api`;
const DEFAULT_ROOMS = [
  { roomId: "general", name: "General", messageCount: 0 },
  { roomId: "media-desk", name: "Media Desk", messageCount: 0 },
  { roomId: "product-notes", name: "Product Notes", messageCount: 0 },
];

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value);
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null
        ? payload.message || "Request failed."
        : payload || "Request failed.";
    throw new Error(message);
  }

  return payload;
}

export function getBackendOrigin() {
  return BACKEND_ORIGIN;
}

export function resolveBackendUrl(value) {
  if (!value) {
    return value;
  }

  return isAbsoluteUrl(value) ? value : `${BACKEND_ORIGIN}${value}`;
}

export function normalizeMessage(message) {
  return {
    id: message.id,
    roomId: message.roomId || "general",
    sender: message.sender || "Unknown",
    text: message.text || "",
    attachments: (message.attachments || []).map((attachment) => ({
      ...attachment,
      url: resolveBackendUrl(attachment.url),
    })),
    createdAt: message.createdAt || new Date().toISOString(),
  };
}

export function mergeRooms(remoteRooms = [], selectedRoom = "general") {
  const roomMap = new Map();

  [...DEFAULT_ROOMS, ...remoteRooms].forEach((room) => {
    roomMap.set(room.roomId, {
      roomId: room.roomId,
      name: room.name,
      messageCount: room.messageCount || 0,
    });
  });

  if (!roomMap.has(selectedRoom)) {
    roomMap.set(selectedRoom, {
      roomId: selectedRoom,
      name: selectedRoom.replace(/-/g, " "),
      messageCount: 0,
    });
  }

  return Array.from(roomMap.values());
}

export async function fetchRooms() {
  const data = await parseResponse(await fetch(`${API_BASE}/rooms`));
  return mergeRooms(data);
}

export async function fetchMessages(roomId) {
  const data = await parseResponse(
    await fetch(`${API_BASE}/messages?roomId=${encodeURIComponent(roomId)}`),
  );
  return data.map(normalizeMessage);
}

export async function sendMessage({ roomId, sender, text, attachments }) {
  const data = await parseResponse(
    await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId,
        sender,
        text,
        attachments,
      }),
    }),
  );

  return normalizeMessage(data);
}

export async function uploadAttachment(file) {
  const formData = new FormData();
  formData.append("file", file);

  const data = await parseResponse(
    await fetch(`${API_BASE}/uploads`, {
      method: "POST",
      body: formData,
    }),
  );

  return {
    ...data.attachment,
    url: resolveBackendUrl(data.attachment.url),
  };
}
