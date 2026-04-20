package com.chatfront.backend.chat;

import java.time.Instant;
import java.util.List;

public record ChatMessage(
        String id,
        String roomId,
        String sender,
        String text,
        List<ChatAttachment> attachments,
        Instant createdAt
) {
}
