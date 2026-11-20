package com.artforyou.store.controller;

import com.artforyou.store.entity.Product;
import com.artforyou.store.repository.ProductRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
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
@RequestMapping("/api/products")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175"}, allowCredentials = "true")
public class ProductController {
    private final ProductRepository products;
    private final ObjectMapper mapper;
    private final Path productImageDir = Paths.get("uploads", "products");

    public ProductController(ProductRepository products, ObjectMapper mapper) {
        this.products = products;
        this.mapper = mapper;
    }

    @GetMapping("/admin")
    public List<Product> getAdminProducts() {
        List<Product> rows = products.findAll();
        rows.forEach(p -> p.setDiscountPercentage(effectiveDiscount(p.getName(), p.getCollection(), p.getCategory(), p.getDiscountPercentage())));
        return rows;
    }

    @PostMapping(value = "/admin", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> addProduct(
            @RequestParam String name,
            @RequestParam String collection,
            @RequestParam String category,
            @RequestParam Integer price,
            @RequestParam(required = false, defaultValue = "5") Integer discountPercentage,
            @RequestParam(required = false, defaultValue = "") String description,
            @RequestParam("files") MultipartFile[] files) {
        try {
            if (name.isBlank() || collection.isBlank() || category.isBlank() || price < 0)
                return ResponseEntity.badRequest().body(Map.of("message", "Enter valid product details"));
            if (files == null || files.length == 0)
                return ResponseEntity.badRequest().body(Map.of("message", "Upload at least one product image"));
            Files.createDirectories(productImageDir);
            List<String> imagePaths = new ArrayList<>();
            for (MultipartFile file : files) {
                if (file.isEmpty() || file.getSize() > 5 * 1024 * 1024)
                    return ResponseEntity.badRequest().body(Map.of("message", "Each image must be under 5 MB"));
                String type = file.getContentType();
                if (type == null || !Arrays.asList("image/jpeg", "image/png", "image/webp").contains(type))
                    return ResponseEntity.badRequest().body(Map.of("message", "Only JPG, PNG and WEBP images are allowed"));
                String ext = type.equals("image/png") ? ".png" : type.equals("image/webp") ? ".webp" : ".jpg";
                String fileName = UUID.randomUUID() + ext;
                file.transferTo(productImageDir.resolve(fileName));
                imagePaths.add("/api/products/image/" + fileName);
            }
            Product product = new Product();
            product.setName(name.trim());
            product.setCollection(collection.trim().toLowerCase());
            product.setCategory(category.trim());
            product.setPrice(price);
            product.setDiscountPercentage(effectiveDiscount(product.getName(), product.getCollection(), product.getCategory(), discountPercentage == null ? 5 : discountPercentage));
            product.setDescription(description.trim());
            product.setImages(mapper.writeValueAsString(imagePaths));
            product.setActive(true);
            products.save(product);
            return ResponseEntity.ok(Map.of("message", "Product added successfully", "productId", product.getId()));
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Unable to add product"));
        }
    }

    @PutMapping("/admin/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @RequestBody Map<String, Object> data) {
        Product product = products.findById(id).orElse(null);
        if (product == null) return ResponseEntity.notFound().build();
        try {
            if (data.get("name") != null) product.setName(data.get("name").toString().trim());
            if (data.get("category") != null) product.setCategory(data.get("category").toString().trim());
            if (data.get("collection") != null) product.setCollection(data.get("collection").toString().trim().toLowerCase());
            if (data.get("description") != null) product.setDescription(data.get("description").toString());
            if (data.get("price") != null) product.setPrice(Integer.parseInt(data.get("price").toString()));
            if (data.get("discountPercentage") != null) { int d=Integer.parseInt(data.get("discountPercentage").toString()); if(d<0||d>5) return ResponseEntity.badRequest().body(Map.of("message","Discount must be between 0 and 5 percent")); product.setDiscountPercentage(effectiveDiscount(product.getName(), product.getCollection(), product.getCategory(), d)); } else { product.setDiscountPercentage(effectiveDiscount(product.getName(), product.getCollection(), product.getCategory(), product.getDiscountPercentage())); }
            products.save(product);
            return ResponseEntity.ok(Map.of("message", "Product updated"));
        } catch (Exception ex) { return ResponseEntity.badRequest().body(Map.of("message", "Invalid product details")); }
    }

    @PutMapping("/admin/{id}/active")
    public ResponseEntity<?> setProductActive(@PathVariable Long id, @RequestBody Map<String, Boolean> data) {
        Product product = products.findById(id).orElse(null);
        if (product == null) return ResponseEntity.notFound().build();
        product.setActive(Boolean.TRUE.equals(data.get("active")));
        products.save(product);
        return ResponseEntity.ok(Map.of("message", "Product visibility updated", "active", product.isActive()));
    }

    @GetMapping("/image/{fileName:.+}")
    public ResponseEntity<Resource> getProductImage(@PathVariable String fileName) {
        try {
            Path path = productImageDir.resolve(Paths.get(fileName).getFileName().toString()).normalize();
            if (!Files.exists(path) || !path.startsWith(productImageDir.normalize())) return ResponseEntity.notFound().build();
            String type = Files.probeContentType(path);
            return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                    .contentType(MediaType.parseMediaType(type == null ? "application/octet-stream" : type))
                    .body(new FileSystemResource(path));
        } catch (Exception ex) { return ResponseEntity.notFound().build(); }
    }

    private int effectiveDiscount(String name, String collection, String category, int requested) {
        String n = name == null ? "" : name.toLowerCase().replaceAll("[^a-z]", "");
        String c = category == null ? "" : category.toLowerCase().replaceAll("[^a-z]", "");
        if ("weddingdecor".equalsIgnoreCase(collection) && (n.contains("kudakalu") || n.contains("kobbaribondam") || c.contains("kudakalu") || c.contains("kobbaribondam"))) return 0;
        return Math.max(0, Math.min(5, requested));
    }

    // Keep the existing image-path update endpoint for older catalogue records.
    @PutMapping("/{id}/images")
    public ResponseEntity<?> updateProductImages(@PathVariable Long id, @RequestBody Map<String, List<String>> data) {
        Product product = products.findById(id).orElse(null);
        if (product == null) return ResponseEntity.notFound().build();
        List<String> images = data.get("images");
        if (images == null || images.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "At least one image path is required"));
        try {
            product.setImages(mapper.writeValueAsString(images));
            products.save(product);
            return ResponseEntity.ok(Map.of("message", "Product images updated successfully", "productId", product.getId(), "images", images));
        } catch (Exception ex) { return ResponseEntity.internalServerError().body(Map.of("message", "Unable to update product images")); }
    }
}
