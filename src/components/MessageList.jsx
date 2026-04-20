import { useEffect, useRef } from "react";

function formatMessageTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(value) {
  return (value || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function AttachmentBlock({ attachment }) {
  const kind = (attachment.kind || "FILE").toLowerCase();

  return (
    <div className={`attachment-card ${kind}`}>
      {kind === "image" && (
        <img src={attachment.url} alt={attachment.name} className="attachment-image" />
      )}

      {kind === "video" && (
        <video
          src={attachment.url}
          className="attachment-video"
          controls
          playsInline
          preload="metadata"
        />
      )}

      {kind === "audio" && (
        <div className="attachment-audio">
          <span className="attachment-tag">Voice / Audio</span>
          <audio src={attachment.url} controls preload="metadata" />
        </div>
      )}

      {kind === "file" && (
        <div className="attachment-file">
          <span className="attachment-tag">Document</span>
          <strong>{attachment.name}</strong>
          <span>{formatFileSize(attachment.size || 0)}</span>
        </div>
      )}

      <a href={attachment.url} download={attachment.name} className="attachment-download">
        Download
      </a>
    </div>
  );
}

function EmptyState({ isLoading }) {
  return (
    <div className="empty-state">
      <span className="section-label">{isLoading ? "Syncing room" : "Ready to collaborate"}</span>
      <h3>
        {isLoading
          ? "Pulling the latest message history..."
          : "Start with a message, video, or voice note."}
      </h3>
      <p>
        This chat runs on Spring Boot with websocket delivery, room history, and hosted uploads
        for media and documents.
      </p>
    </div>
  );
}

function MessageList({ messages, currentUser, isLoading }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (isLoading || messages.length === 0) {
    return (
      <div className="messages-container empty">
        <EmptyState isLoading={isLoading} />
      </div>
    );
  }

  return (
    <div className="messages-container">
      {messages.map((message, index) => {
        const isMe = message.sender === currentUser;
        const hasText = Boolean(message.text?.trim());
        const hasAttachments = (message.attachments?.length || 0) > 0;

        return (
          <article
            key={message.id || index}
            className={`message-wrapper ${isMe ? "message-right" : "message-left"}`}
          >
            {!isMe && <div className="message-avatar">{getInitials(message.sender)}</div>}

            <div className={`message-bubble ${isMe ? "my-message" : "other-message"}`}>
              <div className="message-topline">
                <span className="message-sender">{isMe ? "You" : message.sender}</span>
                <time className="message-time">{formatMessageTime(message.createdAt)}</time>
              </div>

              {hasText && <p className="message-content">{message.text}</p>}

              {hasAttachments && (
                <div className="attachment-grid">
                  {message.attachments.map((attachment) => (
                    <AttachmentBlock
                      key={attachment.id || `${attachment.name}-${attachment.size}`}
                      attachment={attachment}
                    />
                  ))}
                </div>
              )}
            </div>

            {isMe && <div className="message-avatar mine">{getInitials(currentUser)}</div>}
          </article>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

export default MessageList;
