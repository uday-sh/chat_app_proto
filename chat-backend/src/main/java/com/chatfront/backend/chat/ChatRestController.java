package com.chatfront.backend.chat;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class ChatRestController {

    private final ChatMessageStore store;
    private final FileStorageService fileStorageService;
    private final ChatMessageService messageService;

    public ChatRestController(
            ChatMessageStore store,
            FileStorageService fileStorageService,
            ChatMessageService messageService) {
        this.store = store;
        this.fileStorageService = fileStorageService;
        this.messageService = messageService;
    }

    @GetMapping("/messages")
    public List<ChatMessage> messages(@RequestParam(defaultValue = "general") String roomId) {
        return store.findByRoom(roomId.trim().toLowerCase());
    }

    @PostMapping(path = "/messages", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ChatMessage send(@Valid @RequestBody ChatMessageRequest request) {
        return messageService.submit(request);
    }

    @GetMapping("/rooms")
    public List<ChatRoomSummary> rooms() {
        return store.roomSummaries();
    }

    @PostMapping(path = "/uploads", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadResponse upload(@RequestParam("file") MultipartFile file) {
        return new UploadResponse(fileStorageService.store(file));
    }

    @GetMapping("/health")
    public String health() {
        return "ok";
    }
}
