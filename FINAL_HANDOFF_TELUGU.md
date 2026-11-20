# Art For You – Final handoff notes

## Included in this update
- Existing Art For You React + Spring Boot + MySQL project and supplied product images preserved.
- Customer checkout captures mobile, optional separate WhatsApp number, optional Instagram ID, and delivery address.
- Admin order cards display customer mobile, WhatsApp, Instagram, payment status and Razorpay payment ID when available.
- Razorpay Test Mode product checkout endpoint creates the gateway order on the backend using the database-calculated total.
- Backend verifies Razorpay's HMAC signature before setting product payment status to VERIFIED.
- Existing PhonePe QR/manual payment-proof flow remains as a fallback when Razorpay keys are not configured or merchant access is pending.
- Customer can request product changes after viewing prepared photos; admin can update the request status and record an additional customization charge.
- Admin can search orders by order ID, customer name, mobile, WhatsApp or Instagram. Customer My Orders lookup uses mobile number.
- Existing catalogue, collections, order preparation photos, customer order lookup, WhatsApp click-to-chat update, delivery charge, tracking and admin verification workflows are retained.

## Razorpay setup
Set these environment variables on the backend machine before starting Spring Boot:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

Use Test Mode keys only while testing. The Key Secret must never be placed in React, committed to Git, or shared in screenshots. Live payments require merchant verification and Live Mode keys from Razorpay.

## Important limitations
- Automatic Razorpay checkout is implemented for the product amount.
- Delivery-charge payment still uses the existing manual UPI proof upload and admin verification workflow.
- Razorpay webhook reconciliation is not implemented in this handoff.
- The source was inspected and updated, but a full build could not be run in this environment: Maven is unavailable and the frontend dependency installation did not complete. Run `npm install` and `npm run build` on the Windows laptop, and run Maven build from Eclipse/terminal before presenting or deploying. Fix any environment-specific build errors before the demo.
