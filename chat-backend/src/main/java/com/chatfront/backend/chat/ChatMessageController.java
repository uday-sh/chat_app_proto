package com.chatfront.backend.chat;

import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
public class ChatMessageController {

    private final ChatMessageService messageService;

    public ChatMessageController(ChatMessageService messageService) {
        this.messageService = messageService;
    }

    @MessageMapping("/chat.send")
    public void send(@Valid @Payload ChatMessageRequest request) {
        messageService.submit(request);
    }
}
