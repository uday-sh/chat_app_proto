package com.chatfront.backend.chat;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ChatMessageStore {

    private final Map<String, List<ChatMessage>> rooms = new ConcurrentHashMap<>();
    private final int historyLimit;

    public ChatMessageStore(@Value("${app.chat.history-limit}") int historyLimit) {
        this.historyLimit = historyLimit;
    }

    public ChatMessage save(ChatMessage message) {
        List<ChatMessage> roomMessages = rooms.computeIfAbsent(
                message.roomId(),
                ignored -> new CopyOnWriteArrayList<>()
        );

        roomMessages.add(message);
        trimIfNeeded(roomMessages);
        return message;
    }

    public List<ChatMessage> findByRoom(String roomId) {
        List<ChatMessage> roomMessages = rooms.getOrDefault(roomId, List.of());
        return roomMessages.stream()
                .sorted(Comparator.comparing(ChatMessage::createdAt))
                .toList();
    }

    public List<ChatRoomSummary> roomSummaries() {
        List<ChatRoomSummary> summaries = new ArrayList<>();

        rooms.forEach((roomId, messages) -> summaries.add(new ChatRoomSummary(
                roomId,
                toRoomName(roomId),
                messages.size()
        )));

        if (summaries.isEmpty()) {
            summaries.add(new ChatRoomSummary("general", "General", 0));
        }

        return summaries.stream()
                .sorted(Comparator.comparing(ChatRoomSummary::roomId))
                .toList();
    }

    private void trimIfNeeded(List<ChatMessage> roomMessages) {
        while (roomMessages.size() > historyLimit) {
            roomMessages.remove(0);
        }
    }

    private String toRoomName(String roomId) {
        if (roomId == null || roomId.isBlank()) {
            return "General";
        }

        String normalized = roomId.replace("-", " ").trim();
        return normalized.substring(0, 1).toUpperCase() + normalized.substring(1);
    }
}
