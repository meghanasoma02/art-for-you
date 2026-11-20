
package com.artforyou.store.controller;

import com.artforyou.store.entity.OrderEntity;
import com.artforyou.store.entity.Product;
import com.artforyou.store.repository.OrderRepository;
import com.artforyou.store.repository.ProductRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
@RestController
@RequestMapping("/api/orders")
@CrossOrigin(
	    origins = {
	        "http://localhost:5173",
	        "http://localhost:5175"
	    },
	    allowCredentials = "true"
	)
public class OrderController {

    private final OrderRepository orders;
    private final ProductRepository products;
    private final ObjectMapper mapper;
    private final Path uploadDir = Paths.get("uploads", "payment-proofs");
    private final Path preparedPhotosDir = Paths.get("uploads", "prepared-orders");
    public OrderController(
        OrderRepository orders,
        ProductRepository products,
        ObjectMapper mapper
    ) {
        this.orders = orders;
        this.products = products;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<?> placeOrder(@RequestBody Map<String, Object> data) {
        try {
            OrderEntity order = new OrderEntity();

            order.setCustomerName((String) data.get("customerName"));
            order.setMobile((String) data.get("mobile"));
            order.setWhatsappNumber((String) data.getOrDefault("whatsappNumber", data.get("mobile")));
            order.setInstagramId((String) data.get("instagramId"));
            order.setAddress((String) data.get("address"));
            order.setCity((String) data.get("city"));
            order.setState((String) data.get("state"));
            order.setPincode((String) data.get("pincode"));

            List<Map<String, Object>> requested =
                (List<Map<String, Object>>) data.get("items");

            if (requested == null || requested.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "Cart is empty"));
            }

            List<Map<String, Object>> savedItems = new ArrayList<>();
            int total = 0;

            for (Map<String, Object> item : requested) {
                Long id = Long.valueOf(item.get("id").toString());
                int quantity = Integer.parseInt(item.get("quantity").toString());

                if (quantity < 1 || quantity > 100) {
                    return ResponseEntity.badRequest()
                        .body(Map.of("message", "Invalid quantity"));
                }

                Product product = products.findById(id).orElse(null);

                if (product == null || !product.isActive()) {
                    return ResponseEntity.badRequest()
                        .body(Map.of("message", "Product unavailable"));
                }

                int subtotal = product.getPrice() * quantity;
                String productName = product.getName() == null ? "" : product.getName().toLowerCase().replaceAll("[^a-z]", "");
                String category = product.getCategory() == null ? "" : product.getCategory().toLowerCase().replaceAll("[^a-z]", "");
                boolean excluded = "weddingdecor".equalsIgnoreCase(product.getCollection()) && (productName.contains("kudakalu") || productName.contains("kobbaribondam") || category.contains("kudakalu") || category.contains("kobbaribondam"));
                int discountPercentage = excluded ? 0 : product.getDiscountPercentage();
                int discountAmount = (int)Math.round(subtotal * discountPercentage / 100.0);
                int discountedSubtotal = subtotal - discountAmount;
                total += discountedSubtotal;

                Map<String, Object> saved = new LinkedHashMap<>();
                saved.put("id", product.getId());
                saved.put("name", product.getName());
                saved.put("price", product.getPrice());
                saved.put("quantity", quantity);
                saved.put("subtotal", subtotal);
                saved.put("discountPercentage", discountPercentage);
                saved.put("discountAmount", discountAmount);
                saved.put("discountedSubtotal", discountedSubtotal);

                savedItems.add(saved);
            }

            order.setItems(mapper.writeValueAsString(savedItems));
            int originalTotal = savedItems.stream().mapToInt(i -> ((Number)i.get("subtotal")).intValue()).sum();
            int totalDiscount = originalTotal - total;
            order.setTotalAmount(total);
order.setAdvanceAmount(total);
            OrderEntity savedOrder = orders.save(order);

            return ResponseEntity.ok(Map.of(
                "message", "Order placed successfully",
                "orderId", savedOrder.getId(),
                "originalAmount", originalTotal,
                "discountAmount", totalDiscount,
                "totalAmount", total,
                "advanceAmount", savedOrder.getAdvanceAmount(),
                "status", savedOrder.getStatus()
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("message", "Unable to place order"));
        }
    }

    @PostMapping("/{id}/change-request")
    public ResponseEntity<?> submitChangeRequest(@PathVariable Long id, @RequestBody Map<String, String> data) {
        OrderEntity order = orders.findById(id).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        String mobile = data.get("mobile");
        String request = data.get("request");
        if (mobile == null || !mobile.equals(order.getMobile())) return ResponseEntity.status(403).body(Map.of("message", "Mobile number does not match this order"));
        if (request == null || request.isBlank() || request.length() > 2000) return ResponseEntity.badRequest().body(Map.of("message", "Enter your requested changes (maximum 2000 characters)"));
        if (Arrays.asList("SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "ORDER_RECEIVED").contains(order.getStatus())) return ResponseEntity.badRequest().body(Map.of("message", "Changes cannot be requested after dispatch"));
        order.setChangeRequest(request.trim());
        order.setChangeRequestStatus("SUBMITTED");
        orders.save(order);
        return ResponseEntity.ok(Map.of("message", "Change request submitted", "changeRequestStatus", "SUBMITTED"));
    }

    @PutMapping("/{id}/change-request")
    public ResponseEntity<?> updateChangeRequest(@PathVariable Long id, @RequestBody Map<String, Object> data) {
        OrderEntity order = orders.findById(id).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        String status = Objects.toString(data.get("status"), "");
        if (!Arrays.asList("REVIEWING", "APPROVED", "DECLINED", "COMPLETED").contains(status)) return ResponseEntity.badRequest().body(Map.of("message", "Invalid change request status"));
        int charge = 0;
        if (data.get("extraWorkCharge") != null) charge = Integer.parseInt(data.get("extraWorkCharge").toString());
        if (charge < 0 || charge > 1000000) return ResponseEntity.badRequest().body(Map.of("message", "Invalid extra work charge"));
        order.setChangeRequestStatus(status);
        order.setExtraWorkCharge(charge);
        orders.save(order);
        return ResponseEntity.ok(Map.of("message", "Change request updated", "changeRequestStatus", status, "extraWorkCharge", charge));
    }

    @GetMapping
    public List<OrderEntity> getAllOrders() {
        return orders.findAll();
    }
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> data) {

        OrderEntity order = orders.findById(id).orElse(null);

        if (order == null) {
            return ResponseEntity.notFound().build();
        }

        String status = data.get("status");

        List<String> allowedStatuses = Arrays.asList(
            "PENDING", "PROCESSING", "ORDER_COMPLETED", "SHIPPED",
            "OUT_FOR_DELIVERY", "DELIVERED", "ORDER_RECEIVED"
        );

        if (status == null || !allowedStatuses.contains(status)) {
            return ResponseEntity.badRequest()
                .body(Map.of("message", "Invalid order status"));
        }
        if (Arrays.asList("SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED").contains(status)
                && (!"VERIFIED".equals(order.getDeliveryPaymentStatus()) || order.getTrackingId() == null || order.getTrackingId().isBlank())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Verify delivery payment and save the tracking ID before dispatch"));
        }

        order.setStatus(status);
        orders.save(order);

        return ResponseEntity.ok(Map.of(
            "message", "Order status updated successfully",
            "status", order.getStatus()
        ));
    }
    @PutMapping("/{id}/tracking")
    public ResponseEntity<?> updateTrackingId(
            @PathVariable Long id,
            @RequestBody Map<String, String> data) {

        OrderEntity order = orders.findById(id).orElse(null);

        if (order == null) {
            return ResponseEntity.notFound().build();
        }

        String trackingId = data.get("trackingId");

        if (trackingId == null || trackingId.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                .body(Map.of("message", "Tracking ID is required"));
        }

        order.setTrackingId(trackingId.trim());
        String trackingUrl = data.get("trackingUrl");
        order.setTrackingUrl(trackingUrl == null || trackingUrl.isBlank()
                ? "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx"
                : trackingUrl.trim());
        orders.save(order);

        return ResponseEntity.ok(Map.of(
            "message", "Tracking ID saved successfully",
            "trackingId", order.getTrackingId()
        ));
    }
    
    @PostMapping("/{id}/payment-proof")
    public ResponseEntity<?> uploadPaymentProof(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("transactionId") String transactionId,
            @RequestParam("mobile") String mobile){

        try {
            OrderEntity order = orders.findById(id).orElse(null);

            if (order == null) {
                return ResponseEntity.notFound().build();
            }
            if (mobile == null || !mobile.equals(order.getMobile())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Mobile number does not match this order"));
            }

            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Please upload payment screenshot"));
            }

            if (transactionId == null || transactionId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Transaction ID is required"));
            }

            if (file.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "File size must be below 5 MB"));
            }

            String contentType = file.getContentType();

            if (contentType == null ||
                    !(contentType.equals("image/png") ||
                      contentType.equals("image/jpeg") ||
                      contentType.equals("image/webp"))) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Only PNG, JPG and WEBP images are allowed"));
            }

            Files.createDirectories(uploadDir);

            String extension = contentType.equals("image/png") ? ".png" :
                               contentType.equals("image/webp") ? ".webp" : ".jpg";

            String fileName = UUID.randomUUID() + extension;

            Path filePath = uploadDir.resolve(fileName);

            Files.copy(file.getInputStream(), filePath);

            order.setPaymentTransactionId(transactionId.trim());
            order.setPaymentScreenshotPath(filePath.toString());
            order.setPaymentStatus("SUBMITTED");

            orders.save(order);

            return ResponseEntity.ok(Map.of(
                    "message", "Payment screenshot uploaded successfully",
                    "paymentStatus", order.getPaymentStatus()
            ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Unable to upload payment screenshot"));
        }
        
    }
    @PostMapping("/{id}/prepared-photos")
    public ResponseEntity<?> uploadPreparedPhotos(
            @PathVariable Long id,
            @RequestParam("files") MultipartFile[] files) {

        try {
            OrderEntity order = orders.findById(id).orElse(null);

            if (order == null) {
                return ResponseEntity.notFound().build();
            }

            if (files == null || files.length == 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Please select photos"));
            }

            Files.createDirectories(preparedPhotosDir);

            List<String> photoPaths = new ArrayList<>();

            if (order.getPreparedPhotos() != null
                    && !order.getPreparedPhotos().isBlank()) {
                photoPaths.addAll(
                        Arrays.asList(mapper.readValue(
                                order.getPreparedPhotos(), String[].class))
                );
            }

            for (MultipartFile file : files) {
                if (file.isEmpty() || file.getSize() > 5 * 1024 * 1024) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("message", "Each photo must be under 5 MB"));
                }

                String contentType = file.getContentType();

                if (contentType == null ||
                        !Arrays.asList("image/jpeg", "image/png", "image/webp")
                                .contains(contentType)) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("message", "Only JPG, PNG and WEBP photos are allowed"));
                }

                String originalName = file.getOriginalFilename() == null ? "photo" : Paths.get(file.getOriginalFilename()).getFileName().toString();
                String fileName = UUID.randomUUID() + "_" + originalName;

                Path target = preparedPhotosDir.resolve(fileName);

                file.transferTo(target);

                photoPaths.add(fileName);
            }

            order.setPreparedPhotos(mapper.writeValueAsString(photoPaths));
            orders.save(order);

            return ResponseEntity.ok(Map.of(
                    "message", "Prepared photos uploaded successfully",
                    "photos", photoPaths
            ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Photo upload failed"));
        }
    }
@GetMapping("/{id}/payment-proof")
public ResponseEntity<Resource> getPaymentProof(@PathVariable Long id) {
    try {
        OrderEntity order = orders.findById(id).orElse(null);

        if (order == null || order.getPaymentScreenshotPath() == null) {
            return ResponseEntity.notFound().build();
        }

        Path filePath = Paths.get(order.getPaymentScreenshotPath());

        if (!Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(filePath);

        String contentType = Files.probeContentType(filePath);

        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);

    } catch (Exception e) {
        return ResponseEntity.internalServerError().build();
    }
}

@PutMapping("/{id}/payment-status")
public ResponseEntity<?> updatePaymentStatus(
        @PathVariable Long id,
        @RequestBody Map<String, String> data) {

    OrderEntity order = orders.findById(id).orElse(null);

    if (order == null) {
        return ResponseEntity.notFound().build();
    }

    String paymentStatus = data.get("paymentStatus");

    if (!"VERIFIED".equals(paymentStatus) &&
            !"REJECTED".equals(paymentStatus)) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", "Invalid payment status"));
    }

    order.setPaymentStatus(paymentStatus);
    orders.save(order);

    return ResponseEntity.ok(Map.of(
            "message", "Payment status updated",
            "paymentStatus", paymentStatus
    ));
}


    @GetMapping("/my-orders")
    public ResponseEntity<?> getMyOrders(
            @RequestParam String mobile) {

        if (mobile == null || !mobile.matches("[0-9]{10}")) {
            return ResponseEntity.badRequest()
                .body(Map.of("message", "Enter a valid 10-digit mobile number"));
        }

        List<OrderEntity> customerOrders =
            orders.findByMobileOrderByCreatedAtDesc(mobile);

        return ResponseEntity.ok(customerOrders);
    }


    @PutMapping("/{id}/delivery-charge")
    public ResponseEntity<?> setDeliveryCharge(@PathVariable Long id,
            @RequestBody Map<String, Object> data) {
        OrderEntity order = orders.findById(id).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        if (!"VERIFIED".equals(order.getPaymentStatus())) return ResponseEntity.badRequest().body(Map.of("message", "Verify the full product payment before requesting delivery payment"));
        if (!"ORDER_COMPLETED".equals(order.getStatus())) return ResponseEntity.badRequest().body(Map.of("message", "Mark the order as completed and upload its photos before requesting delivery payment"));
        Object raw = data.get("deliveryCharge");
        if (raw == null) return ResponseEntity.badRequest().body(Map.of("message", "Delivery charge is required"));
        int charge;
        try { charge = Integer.parseInt(raw.toString()); }
        catch (NumberFormatException ex) { return ResponseEntity.badRequest().body(Map.of("message", "Invalid delivery charge")); }
        if (charge < 0 || charge > 100000) return ResponseEntity.badRequest().body(Map.of("message", "Delivery charge must be between 0 and 100000"));
        order.setDeliveryCharge(charge);
        order.setDeliveryPaymentStatus(charge == 0 ? "VERIFIED" : "PENDING");
        orders.save(order);
        return ResponseEntity.ok(Map.of("message", "Delivery charge saved", "deliveryCharge", charge, "deliveryPaymentStatus", order.getDeliveryPaymentStatus()));
    }

    @PostMapping("/{id}/delivery-payment-proof")
    public ResponseEntity<?> uploadDeliveryPaymentProof(@PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("transactionId") String transactionId,
            @RequestParam("mobile") String mobile) {
        try {
            OrderEntity order = orders.findById(id).orElse(null);
            if (order == null) return ResponseEntity.notFound().build();
            if (mobile == null || !mobile.equals(order.getMobile())) return ResponseEntity.badRequest().body(Map.of("message", "Mobile number does not match this order"));
            if (order.getDeliveryCharge() == null || order.getDeliveryCharge() <= 0) return ResponseEntity.badRequest().body(Map.of("message", "Delivery charge has not been requested yet"));
            if ("VERIFIED".equals(order.getDeliveryPaymentStatus())) return ResponseEntity.badRequest().body(Map.of("message", "Delivery payment is already verified"));
            if (file == null || file.isEmpty() || transactionId == null || transactionId.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "Transaction ID and payment screenshot are required"));
            if (file.getSize() > 5 * 1024 * 1024) return ResponseEntity.badRequest().body(Map.of("message", "File size must be below 5 MB"));
            String type = file.getContentType();
            if (type == null || !Arrays.asList("image/jpeg", "image/png", "image/webp").contains(type)) return ResponseEntity.badRequest().body(Map.of("message", "Only JPG, PNG and WEBP images are allowed"));
            Path dir = Paths.get("uploads", "delivery-payment-proofs");
            Files.createDirectories(dir);
            String ext = type.equals("image/png") ? ".png" : type.equals("image/webp") ? ".webp" : ".jpg";
            Path saved = dir.resolve(UUID.randomUUID() + ext);
            file.transferTo(saved);
            order.setDeliveryPaymentTransactionId(transactionId.trim());
            order.setDeliveryPaymentScreenshotPath(saved.toString());
            order.setDeliveryPaymentStatus("SUBMITTED");
            orders.save(order);
            return ResponseEntity.ok(Map.of("message", "Delivery payment proof submitted", "deliveryPaymentStatus", "SUBMITTED"));
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Unable to upload delivery payment proof"));
        }
    }

    @PutMapping("/{id}/delivery-payment-status")
    public ResponseEntity<?> updateDeliveryPaymentStatus(@PathVariable Long id, @RequestBody Map<String, String> data) {
        OrderEntity order = orders.findById(id).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        String status = data.get("deliveryPaymentStatus");
        if (!Arrays.asList("VERIFIED", "REJECTED").contains(status)) return ResponseEntity.badRequest().body(Map.of("message", "Invalid delivery payment status"));
        order.setDeliveryPaymentStatus(status);
        orders.save(order);
        return ResponseEntity.ok(Map.of("message", "Delivery payment status updated", "deliveryPaymentStatus", status));
    }

    @PutMapping("/{id}/received")
    public ResponseEntity<?> markOrderReceived(@PathVariable Long id, @RequestBody Map<String, String> data) {
        OrderEntity order = orders.findById(id).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        String mobile = data.get("mobile");
        if (mobile == null || !mobile.equals(order.getMobile())) return ResponseEntity.badRequest().body(Map.of("message", "Mobile number does not match this order"));
        if (!Arrays.asList("SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "ORDER_RECEIVED").contains(order.getStatus())) return ResponseEntity.badRequest().body(Map.of("message", "Order is not yet shipped"));
        order.setStatus("ORDER_RECEIVED");
        order.setReceivedAt(LocalDateTime.now());
        orders.save(order);
        return ResponseEntity.ok(Map.of("message", "Order marked as received", "status", order.getStatus()));
    }

    @GetMapping("/prepared-photo/{fileName:.+}")
    public ResponseEntity<Resource> getPreparedPhoto(@PathVariable String fileName) {
        try {
            Path path = preparedPhotosDir.resolve(Paths.get(fileName).getFileName().toString()).normalize();
            if (!Files.exists(path) || !path.startsWith(preparedPhotosDir.normalize())) return ResponseEntity.notFound().build();
            String type = Files.probeContentType(path);
            return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                    .contentType(MediaType.parseMediaType(type == null ? "application/octet-stream" : type))
                    .body(new FileSystemResource(path));
        } catch (Exception ex) { return ResponseEntity.notFound().build(); }
    }

    @GetMapping("/{id}/delivery-payment-proof")
    public ResponseEntity<Resource> getDeliveryPaymentProof(@PathVariable Long id) {
        try {
            OrderEntity order = orders.findById(id).orElse(null);
            if (order == null || order.getDeliveryPaymentScreenshotPath() == null) return ResponseEntity.notFound().build();
            Path path = Paths.get(order.getDeliveryPaymentScreenshotPath());
            if (!Files.exists(path)) return ResponseEntity.notFound().build();
            String type = Files.probeContentType(path);
            return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                    .contentType(MediaType.parseMediaType(type == null ? "application/octet-stream" : type))
                    .body(new FileSystemResource(path));
        } catch (Exception ex) { return ResponseEntity.internalServerError().build(); }
    }
}
