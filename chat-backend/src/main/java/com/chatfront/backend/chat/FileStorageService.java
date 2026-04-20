package com.chatfront.backend.chat;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

    private final Path uploadDir;

    public FileStorageService(@Value("${app.storage.upload-dir}") String uploadDir) throws IOException {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(this.uploadDir);
    }

    public ChatAttachment store(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Select a file before uploading.");
        }

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() == null
                ? "attachment"
                : file.getOriginalFilename());
        String extension = "";
        int extensionIndex = originalFilename.lastIndexOf('.');
        if (extensionIndex >= 0) {
            extension = originalFilename.substring(extensionIndex);
        }

        String savedFilename = UUID.randomUUID() + extension;
        Path target = uploadDir.resolve(savedFilename);

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new IllegalStateException("Upload failed. Please try again.", exception);
        }

        String mimeType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();

        return new ChatAttachment(
                UUID.randomUUID().toString(),
                inferAttachmentType(mimeType),
                originalFilename,
                "/uploads/" + savedFilename,
                file.getSize(),
                mimeType
        );
    }

    private AttachmentType inferAttachmentType(String mimeType) {
        String normalized = mimeType.toLowerCase(Locale.ROOT);

        if (normalized.startsWith("image/")) {
            return AttachmentType.IMAGE;
        }

        if (normalized.startsWith("video/")) {
            return AttachmentType.VIDEO;
        }

        if (normalized.startsWith("audio/")) {
            return AttachmentType.AUDIO;
        }

        return AttachmentType.FILE;
    }
}
