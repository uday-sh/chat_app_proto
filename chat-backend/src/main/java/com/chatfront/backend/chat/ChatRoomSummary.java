package com.chatfront.backend.chat;

public record ChatRoomSummary(
        String roomId,
        String name,
        int messageCount
) {
}
