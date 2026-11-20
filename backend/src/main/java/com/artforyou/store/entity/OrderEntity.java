
package com.artforyou.store.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
public class OrderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String customerName;
    private String mobile;
    private String whatsappNumber;
    private String instagramId;
    private String razorpayOrderId;
    private String razorpayPaymentId;
    @Column(columnDefinition = "text")
    private String changeRequest;
    private String changeRequestStatus = "NONE";
    private Integer extraWorkCharge;
   

    @Column(columnDefinition = "text")
    private String address;

    private String city;
    private String state;
    private String pincode;

    @Column(columnDefinition = "text")
    private String items;

    private Integer totalAmount;
    private Integer advanceAmount;

    private String status = "PENDING";
    private String trackingId;
    private String paymentTransactionId;

    private String paymentScreenshotPath;
    @Column(columnDefinition = "text")
    private String preparedPhotos;
    private String paymentStatus = "NOT_SUBMITTED";
    private Integer deliveryCharge;
    private String deliveryPaymentStatus = "NOT_REQUESTED";
    private String deliveryPaymentTransactionId;
    private String deliveryPaymentScreenshotPath;
    private String trackingUrl;
    private LocalDateTime receivedAt;
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getCustomerName() { return customerName; }
    public String getMobile() { return mobile; }
    public String getWhatsappNumber() { return whatsappNumber; }
    public String getInstagramId() { return instagramId; }
    public String getRazorpayOrderId() { return razorpayOrderId; }
    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public String getChangeRequest() { return changeRequest; }
    public String getChangeRequestStatus() { return changeRequestStatus; }
    public Integer getExtraWorkCharge() { return extraWorkCharge; }
   
    public String getAddress() { return address; }
    public String getCity() { return city; }
    public String getState() { return state; }
    public String getPincode() { return pincode; }
    public String getItems() { return items; }
    public Integer getTotalAmount() { return totalAmount; }
    public Integer getAdvanceAmount() { return advanceAmount; }
    public String getStatus() { return status; }
    public String getTrackingId() {
        return trackingId;
    }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public String getPaymentTransactionId() {
        return paymentTransactionId;
    }

    public String getPaymentScreenshotPath() {
        return paymentScreenshotPath;
    }
    public String getPreparedPhotos() {
        return preparedPhotos;
    }
    public String getPaymentStatus() { return paymentStatus; }
    public Integer getDeliveryCharge() { return deliveryCharge; }
    public String getDeliveryPaymentStatus() { return deliveryPaymentStatus; }
    public String getDeliveryPaymentTransactionId() { return deliveryPaymentTransactionId; }
    public String getDeliveryPaymentScreenshotPath() { return deliveryPaymentScreenshotPath; }
    public String getTrackingUrl() { return trackingUrl; }
    public LocalDateTime getReceivedAt() { return receivedAt; }

    public void setPaymentTransactionId(String v) {
        paymentTransactionId = v;
    }

    public void setPaymentScreenshotPath(String v) {
        paymentScreenshotPath = v;
    }

    public void setPaymentStatus(String v) { paymentStatus = v; }
    public void setDeliveryCharge(Integer v) { deliveryCharge = v; }
    public void setDeliveryPaymentStatus(String v) { deliveryPaymentStatus = v; }
    public void setDeliveryPaymentTransactionId(String v) { deliveryPaymentTransactionId = v; }
    public void setDeliveryPaymentScreenshotPath(String v) { deliveryPaymentScreenshotPath = v; }
    public void setTrackingUrl(String v) { trackingUrl = v; }
    public void setReceivedAt(LocalDateTime v) { receivedAt = v; }

    public void setCustomerName(String v) { customerName = v; }
    public void setMobile(String v) { mobile = v; }
    public void setWhatsappNumber(String v) { whatsappNumber = v; }
    public void setInstagramId(String v) { instagramId = v; }
    public void setRazorpayOrderId(String v) { razorpayOrderId = v; }
    public void setRazorpayPaymentId(String v) { razorpayPaymentId = v; }
    public void setChangeRequest(String v) { changeRequest = v; }
    public void setChangeRequestStatus(String v) { changeRequestStatus = v; }
    public void setExtraWorkCharge(Integer v) { extraWorkCharge = v; }
   
    public void setAddress(String v) { address = v; }
    public void setCity(String v) { city = v; }
    public void setState(String v) { state = v; }
    public void setPincode(String v) { pincode = v; }
    public void setItems(String v) { items = v; }
    public void setTotalAmount(Integer v) { totalAmount = v; }
    public void setAdvanceAmount(Integer v) { advanceAmount = v; }
    public void setTrackingId(String v) {
        trackingId = v;
    }
    public void setStatus(String v) { status = v; }
    public void setPreparedPhotos(String v) {
        preparedPhotos = v;
    }
}
