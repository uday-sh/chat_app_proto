import { useEffect, useRef, useState } from "react";

const MAX_ATTACHMENTS = 4;
const MAX_TOTAL_ATTACHMENT_BYTES = 24 * 1024 * 1024;
const ACCEPTED_FILES = "image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar";

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRecordingTime(seconds) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function createDraftFile(file) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

function getDraftKind(file) {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  return "file";
}

function MessageInput({ sendMessage, isConnected }) {
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const draftFilesRef = useRef([]);
  const recorderRef = useRef(null);
  const recorderChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const [text, setText] = useState("");
  const [draftFiles, setDraftFiles] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [supportsRecording, setSupportsRecording] = useState(false);

  const totalAttachmentSize = draftFiles.reduce((sum, item) => sum + item.file.size, 0);

  useEffect(() => {
    setSupportsRecording(Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder));
  }, []);

  useEffect(() => {
    draftFilesRef.current = draftFiles;
  }, [draftFiles]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, 180);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 180 ? "auto" : "hidden";
  }, [text]);

  useEffect(() => {
    return () => {
      draftFilesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const clearDraftFiles = () => {
    draftFilesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setDraftFiles([]);
  };

  const appendFiles = (incomingFiles) => {
    const freshFiles = Array.from(incomingFiles || []);
    if (freshFiles.length === 0) {
      return;
    }

    setError("");
    setDraftFiles((current) => {
      const combined = [...current];

      for (const file of freshFiles) {
        if (combined.length >= MAX_ATTACHMENTS) {
          setError(`Attach up to ${MAX_ATTACHMENTS} files per message.`);
          break;
        }

        combined.push(createDraftFile(file));
      }

      const combinedSize = combined.reduce((sum, item) => sum + item.file.size, 0);
      if (combinedSize > MAX_TOTAL_ATTACHMENT_BYTES) {
        combined.forEach((item) => {
          if (!current.find((existing) => existing.id === item.id)) {
            URL.revokeObjectURL(item.previewUrl);
          }
        });
        setError("Attachments are too large. Keep the total upload under 24 MB.");
        return current;
      }

      return combined;
    });
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const startRecording = async () => {
    if (!supportsRecording || isRecording) {
      return;
    }

    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderChunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recorderChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(recorderChunksRef.current, { type: finalMimeType });
        const extension = finalMimeType.includes("mp4") ? "m4a" : "webm";
        const voiceFile = new File([blob], `voice-note-${Date.now()}.${extension}`, {
          type: finalMimeType,
        });

        appendFiles([voiceFile]);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        recorderChunksRef.current = [];
        setIsRecording(false);
        setRecordingSeconds(0);

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((value) => value + 1);
      }, 1000);
    } catch {
      setError("Microphone access was blocked, so voice recording could not start.");
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();

    if ((!text.trim() && draftFiles.length === 0) || isSending) {
      return;
    }

    setError("");
    setIsSending(true);

    const result = await sendMessage({
      text,
      files: draftFiles.map((item) => item.file),
    });

    setIsSending(false);

    if (result.ok) {
      setText("");
      clearDraftFiles();
      return;
    }

    setError(result.error || "Message could not be sent.");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend(event);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    appendFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const removeDraftFile = (draftId) => {
    setDraftFiles((current) => {
      const target = current.find((item) => item.id === draftId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((item) => item.id !== draftId);
    });
  };

  return (
    <form
      className={`input-area ${isDragging ? "dragging" : ""}`}
      onSubmit={handleSend}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="composer-toolbar">
        <div className="composer-tool-group">
          <button
            type="button"
            className="composer-tool"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected || isSending}
          >
            Attach
          </button>

          {supportsRecording && (
            <button
              type="button"
              className={`composer-tool record-tool ${isRecording ? "live" : ""}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!isConnected || isSending}
            >
              {isRecording ? `Stop ${formatRecordingTime(recordingSeconds)}` : "Voice note"}
            </button>
          )}
        </div>

        <div className="composer-hint">
          <span>{draftFiles.length}/{MAX_ATTACHMENTS} files</span>
          <span>{formatFileSize(totalAttachmentSize)} of 24 MB</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILES}
        className="hidden-file-input"
        onChange={(event) => {
          appendFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {draftFiles.length > 0 && (
        <div className="draft-attachments">
          {draftFiles.map((item) => {
            const kind = getDraftKind(item.file);

            return (
              <article key={item.id} className="draft-card">
                <div className={`draft-preview ${kind}`}>
                  {kind === "image" && <img src={item.previewUrl} alt={item.file.name} />}
                  {kind === "video" && <video src={item.previewUrl} muted playsInline />}
                  {kind === "audio" && <span className="draft-badge">Audio</span>}
                  {kind === "file" && <span className="draft-badge">File</span>}
                </div>

                <div className="draft-meta">
                  <strong>{item.file.name}</strong>
                  <span>{formatFileSize(item.file.size)}</span>
                </div>

                <button
                  type="button"
                  className="draft-remove"
                  onClick={() => removeDraftFile(item.id)}
                >
                  Remove
                </button>
              </article>
            );
          })}
        </div>
      )}

      <div className="composer-main">
        <textarea
          ref={textareaRef}
          value={text}
          placeholder={
            isConnected
              ? "Write a message, drop a video, or record a quick voice note..."
              : "Waiting for backend connection..."
          }
          disabled={!isConnected || isSending}
          rows={1}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button
          type="submit"
          className="send-button"
          disabled={(!text.trim() && draftFiles.length === 0) || !isConnected || isSending}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>

      <div className="composer-footer">
        <span>Enter to send. Shift + Enter for a new line.</span>
        <span>Video, images, voice notes, audio, and documents supported.</span>
      </div>

      {error && <p className="composer-error">{error}</p>}
    </form>
  );
}

export default MessageInput;
