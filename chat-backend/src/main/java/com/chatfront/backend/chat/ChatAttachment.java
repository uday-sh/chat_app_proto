package com.chatfront.backend.chat;

public record ChatAttachment(
        String id,
        AttachmentType kind,
        String name,
        String url,
        long size,
        String mimeType
) {
}
