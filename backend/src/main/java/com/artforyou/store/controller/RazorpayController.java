package com.artforyou.store.controller;

import com.artforyou.store.entity.OrderEntity;
import com.artforyou.store.repository.OrderRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments/razorpay")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5175"}, allowCredentials = "true")
public class RazorpayController {
    private final OrderRepository orders;
    private final ObjectMapper mapper;

    public RazorpayController(OrderRepository orders, ObjectMapper mapper) {
        this.orders = orders;
        this.mapper = mapper;
    }

    @PostMapping("/orders/{orderId}")
    public ResponseEntity<?> createGatewayOrder(@PathVariable Long orderId, @RequestBody(required = false) Map<String, String> data) {
        String keyId = System.getenv("RAZORPAY_KEY_ID");
        String secret = System.getenv("RAZORPAY_KEY_SECRET");
        if (blank(keyId) || blank(secret)) {
            return ResponseEntity.status(503).body(Map.of("message", "Razorpay Test Mode keys are not configured. Use the manual UPI proof option for now."));
        }
        try {
            OrderEntity order = orders.findById(orderId).orElse(null);
            if (order == null) return ResponseEntity.notFound().build();
            String customerMobile = data == null ? null : data.get("mobile");
            if (customerMobile == null || !customerMobile.equals(order.getMobile())) return ResponseEntity.status(403).body(Map.of("message", "Mobile number does not match this order."));
            if ("VERIFIED".equals(order.getPaymentStatus())) return ResponseEntity.badRequest().body(Map.of("message", "This order is already paid."));
            int amountPaise = Math.multiplyExact(order.getTotalAmount(), 100);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("amount", amountPaise);
            body.put("currency", "INR");
            body.put("receipt", "AFY-" + order.getId());
            body.put("notes", Map.of("store", "Art For You", "local_order_id", order.getId().toString()));
            byte[] requestBytes = mapper.writeValueAsBytes(body);
            HttpURLConnection connection = (HttpURLConnection) new URL("https://api.razorpay.com/v1/orders").openConnection();
            connection.setRequestMethod("POST");
            connection.setDoOutput(true);
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(15000);
            String auth = Base64.getEncoder().encodeToString((keyId + ":" + secret).getBytes(StandardCharsets.UTF_8));
            connection.setRequestProperty("Authorization", "Basic " + auth);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.getOutputStream().write(requestBytes);
            int status = connection.getResponseCode();
            java.io.InputStream stream = status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream();
            JsonNode response = mapper.readTree(stream);
            if (status < 200 || status >= 300) return ResponseEntity.status(502).body(Map.of("message", "Razorpay could not create the payment order. Check merchant activation and Test Mode keys."));
            String gatewayOrderId = response.path("id").asText();
            order.setRazorpayOrderId(gatewayOrderId);
            order.setPaymentStatus("PENDING");
            orders.save(order);
            return ResponseEntity.ok(Map.of("keyId", keyId, "gatewayOrderId", gatewayOrderId, "amount", amountPaise, "currency", "INR", "name", "Art For You", "description", "Order payment #" + order.getId(), "customerName", order.getCustomerName(), "mobile", order.getMobile()));
        } catch (Exception ex) {
            return ResponseEntity.status(502).body(Map.of("message", "Unable to connect to Razorpay. You can use the manual UPI payment option."));
        }
    }

    @PostMapping("/verify/{orderId}")
    public ResponseEntity<?> verifyPayment(@PathVariable Long orderId, @RequestBody Map<String, String> data) {
        String secret = System.getenv("RAZORPAY_KEY_SECRET");
        if (blank(secret)) return ResponseEntity.status(503).body(Map.of("message", "Razorpay is not configured."));
        try {
            OrderEntity order = orders.findById(orderId).orElse(null);
            if (order == null) return ResponseEntity.notFound().build();
            if (data.get("mobile") == null || !data.get("mobile").equals(order.getMobile())) return ResponseEntity.status(403).body(Map.of("message", "Mobile number does not match this order."));
            String gatewayOrderId = data.get("razorpay_order_id");
            String paymentId = data.get("razorpay_payment_id");
            String signature = data.get("razorpay_signature");
            if (blank(gatewayOrderId) || blank(paymentId) || blank(signature) || !gatewayOrderId.equals(order.getRazorpayOrderId()))
                return ResponseEntity.badRequest().body(Map.of("message", "Payment details do not match this order."));
            String expected = hmacSha256(gatewayOrderId + "|" + paymentId, secret);
            if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8)))
                return ResponseEntity.badRequest().body(Map.of("message", "Payment signature verification failed."));
            order.setRazorpayPaymentId(paymentId);
            order.setPaymentTransactionId(paymentId);
            order.setPaymentStatus("VERIFIED");
            orders.save(order);
            return ResponseEntity.ok(Map.of("message", "Payment verified successfully", "paymentStatus", "VERIFIED", "paymentId", paymentId));
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Unable to verify payment."));
        }
    }

    private static String hmacSha256(String value, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] bytes = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte b : bytes) hex.append(String.format("%02x", b));
        return hex.toString();
    }
    private static boolean blank(String value) { return value == null || value.isBlank(); }
}
