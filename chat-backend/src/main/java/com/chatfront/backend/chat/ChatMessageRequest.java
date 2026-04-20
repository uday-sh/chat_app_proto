package com.chatfront.backend.chat;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record ChatMessageRequest(
        String roomId,
        @NotBlank(message = "Sender is required") String sender,
        String text,
        List<ChatAttachment> attachments
) {
}
