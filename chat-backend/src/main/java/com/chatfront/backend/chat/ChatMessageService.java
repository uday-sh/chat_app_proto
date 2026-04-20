package com.chatfront.backend.chat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class ChatMessageService {

    private final ChatMessageStore store;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatMessageService(ChatMessageStore store, SimpMessagingTemplate messagingTemplate) {
        this.store = store;
        this.messagingTemplate = messagingTemplate;
    }

    public ChatMessage submit(ChatMessageRequest request) {
        List<ChatAttachment> attachments = request.attachments() == null ? List.of() : request.attachments();
        String text = request.text() == null ? "" : request.text().trim();
        String sender = request.sender() == null ? "" : request.sender().trim();

        if (sender.isBlank()) {
            throw new IllegalArgumentException("Sender is required.");
        }

        if (text.isBlank() && attachments.isEmpty()) {
            throw new IllegalArgumentException("Send a message or attach a file.");
        }

        ChatMessage message = new ChatMessage(
                UUID.randomUUID().toString(),
                normalizeRoomId(request.roomId()),
                sender,
                text,
                attachments,
                Instant.now()
        );

        store.save(message);
        messagingTemplate.convertAndSend("/topic/rooms/" + message.roomId(), message);
        return message;
    }

    private String normalizeRoomId(String roomId) {
        return roomId == null || roomId.isBlank() ? "general" : roomId.trim().toLowerCase();
    }
}
