package com.artforyou.store.controller;

import com.artforyou.store.entity.CollectionEntity;
import com.artforyou.store.repository.CollectionRepository;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@RestController
@RequestMapping("/api/collections")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175"}, allowCredentials = "true")
public class CollectionController {
    private final CollectionRepository collections;
    private final Path imageDir = Paths.get("uploads", "collections");

    public CollectionController(CollectionRepository collections) { this.collections = collections; }

    @GetMapping("/admin")
    public List<CollectionEntity> adminList() { return collections.findAllByOrderBySortOrderAsc(); }

    @PostMapping(value = "/admin", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> add(@RequestParam String slug, @RequestParam String title,
            @RequestParam(required = false, defaultValue = "") String description,
            @RequestParam(required = false, defaultValue = "0") Integer sortOrder,
            @RequestParam(required = false) MultipartFile image) {
        try {
            String cleanSlug = slug.trim().toLowerCase().replaceAll("[^a-z0-9-]", "-").replaceAll("-+", "-");
            if (cleanSlug.isBlank() || title.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "Collection name and slug are required"));
            if (collections.existsById(cleanSlug)) return ResponseEntity.badRequest().body(Map.of("message", "This collection already exists"));
            CollectionEntity c = new CollectionEntity(); c.setSlug(cleanSlug); c.setTitle(title.trim()); c.setDescription(description.trim()); c.setSortOrder(sortOrder == null ? 0 : sortOrder); c.setActive(true);
            if (image != null && !image.isEmpty()) c.setImagePath(saveImage(image));
            return ResponseEntity.ok(collections.save(c));
        } catch (IllegalArgumentException ex) { return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage())); }
        catch (Exception ex) { return ResponseEntity.internalServerError().body(Map.of("message", "Unable to save collection")); }
    }

    @PutMapping("/admin/{slug}")
    public ResponseEntity<?> update(@PathVariable String slug, @RequestParam String title,
            @RequestParam(required = false, defaultValue = "0") Integer sortOrder,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) MultipartFile image) {
        CollectionEntity c = collections.findById(slug).orElse(null); if (c == null) return ResponseEntity.notFound().build();
        try { c.setTitle(title.trim()); c.setDescription(description == null ? "" : description.trim()); c.setSortOrder(sortOrder == null ? 0 : sortOrder); if (image != null && !image.isEmpty()) c.setImagePath(saveImage(image)); return ResponseEntity.ok(collections.save(c)); }
        catch (IllegalArgumentException ex) { return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage())); }
        catch (Exception ex) { return ResponseEntity.internalServerError().body(Map.of("message", "Unable to update collection")); }
    }

    @PutMapping("/admin/{slug}/active")
    public ResponseEntity<?> active(@PathVariable String slug, @RequestBody Map<String, Boolean> data) {
        CollectionEntity c = collections.findById(slug).orElse(null); if (c == null) return ResponseEntity.notFound().build();
        c.setActive(Boolean.TRUE.equals(data.get("active"))); collections.save(c); return ResponseEntity.ok(Map.of("active", c.isActive()));
    }

    @GetMapping("/image/{fileName:.+}")
    public ResponseEntity<Resource> image(@PathVariable String fileName) {
        try { Path path = imageDir.resolve(Paths.get(fileName).getFileName().toString()).normalize(); if (!Files.exists(path) || !path.startsWith(imageDir.normalize())) return ResponseEntity.notFound().build(); String type = Files.probeContentType(path); return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "inline").contentType(MediaType.parseMediaType(type == null ? "application/octet-stream" : type)).body(new FileSystemResource(path)); }
        catch (Exception ex) { return ResponseEntity.notFound().build(); }
    }

    private String saveImage(MultipartFile file) throws Exception {
        String type = file.getContentType(); if (file.getSize() > 5 * 1024 * 1024 || type == null || !List.of("image/jpeg", "image/png", "image/webp").contains(type)) throw new IllegalArgumentException("Collection image must be JPG, PNG or WEBP under 5 MB");
        Files.createDirectories(imageDir); String ext = type.equals("image/png") ? ".png" : type.equals("image/webp") ? ".webp" : ".jpg"; String name = UUID.randomUUID() + ext; file.transferTo(imageDir.resolve(name)); return "/api/collections/image/" + name;
    }
}
