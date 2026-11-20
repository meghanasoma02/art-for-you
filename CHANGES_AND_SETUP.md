# Art For You – Updated Project Notes

## Included updates

- Premium storefront styling with responsive mobile layout, product hover zoom, modal gallery, and scroll-friendly sections.
- Admin product catalogue: add a product with multiple photos, edit product details/price, and hide/show products.
- Admin order workflow: verify product payment, move an order through preparation, upload completed-order photos, request a separate delivery charge, verify its payment, save India Post tracking details, and update order status.
- Customer My Orders: prepared-order photo gallery, order progress timeline, delivery-payment proof upload, India Post tracking link, and Order Received confirmation.
- Customer confirmation is tied to the order's mobile number.
- New order fields are added with JPA schema update (`spring.jpa.hibernate.ddl-auto=update`).

## Local setup

### Backend

1. Open the backend project in Eclipse.
2. Make sure MySQL is running and the `artforyou` database is accessible.
3. Set the Run Configuration environment variables if needed:
   - `DB_USERNAME=root` (or your MySQL username)
   - `DB_PASSWORD=your-local-mysql-password`
4. Run `ArtForYouApplication.java` as a Java Application. Backend uses port `8080`.

### Frontend

1. Open a terminal in the `frontend` folder.
2. Run `npm install` (the ZIP intentionally does not include `node_modules`).
3. Run `npm run dev`.
4. Open the Vite URL shown in the terminal (usually `http://localhost:5173`).

Admin page: `/admin-login`.

## Payment note

The current PhonePe QR + screenshot upload is manual UPI payment, not an automatic gateway. Admin must verify the payment in the business bank/UPI account. See `PAYMENT_GATEWAY_SETUP_TELUGU.md` for the steps needed to enable Razorpay or another real gateway after merchant onboarding and private API keys are configured.

## Upload storage

Customer payment proofs, prepared-order photos, delivery-payment proofs and product photos are stored under the backend runtime `uploads/` folder. This folder is intentionally excluded from this ZIP so customer payment screenshots or other private uploads are not shared. It will be recreated as needed when the backend runs.

## Validation note

The source files were reviewed and the frontend build was attempted in the packaging environment, but its pre-existing Vite optional native binding was unavailable here. Run `npm install` on the target Windows machine before `npm run dev`. Backend compilation should be checked in the user's Eclipse/Maven environment before live deployment.


## Latest customer and admin improvements
- Customer cart supports multiple products in one order and shows original total, eligible product discount, and discounted payable amount.
- Discount is calculated again on the Spring Boot backend from database product prices; browser-submitted prices are not trusted.
- Default discount is 5% per product and can be set to 0% or 5% in Admin. Kudakalu and Kobbari Bondam in Wedding Decor are forced to 0% discount by the backend.
- Admin can create, edit, sort, hide and show collections, and optionally upload a collection cover image. New active collections automatically appear on the customer website.
- Admin product form now selects from existing active collections and allows product-wise discount settings.

## Payment gateway status
Original baseline note: the initial version used manual QR/payment proof. The current updated version below now includes optional Razorpay Test Mode checkout and server-side signature verification.

## WhatsApp order-ready update
- After uploading prepared-order photos and saving the delivery charge, the admin order card shows **Send WhatsApp Update**.
- Clicking it opens a WhatsApp chat for the customer's saved mobile number with an editable message containing the order number, item names, product total, discount saved (when applicable), delivery charge, and instructions to view prepared photos / pay delivery charges in My Orders.
- The admin must review the message and press **Send** in WhatsApp. This is click-to-chat, not an automatic WhatsApp API notification. Fully automatic messages require WhatsApp Business Platform setup and approved templates.

## Razorpay Test Mode integration (added)
- Checkout now attempts Razorpay when backend environment variables `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are configured.
- Backend creates Razorpay orders using the server-calculated order total in paise and verifies the checkout HMAC signature server-side before marking product payment `VERIFIED`.
- If Razorpay credentials are not configured or the merchant account is not yet enabled, the existing PhonePe QR/manual proof flow remains available.
- Never put the Key Secret in React, `.env` files committed to Git, screenshots, or a shared ZIP. Configure secrets as environment variables on the backend machine.
- This integration is for product payment. Delivery-charge payments continue to use the existing manual proof/verification workflow; do not claim delivery payments are gateway-integrated.
- Razorpay Live Mode requires merchant approval and Live Mode keys. Test Mode payment success is not a real customer charge.

## Customer contact details
- Checkout now captures an optional separate WhatsApp number and Instagram ID in addition to the required mobile number.
- Admin order cards show the supplied WhatsApp and Instagram contact details.

## Before the live demo
1. Start MySQL and ensure the `artforyou` database is available.
2. In Eclipse, set `DB_USERNAME` and `DB_PASSWORD` environment variables and run `ArtForYouApplication.java`.
3. In the `frontend` folder run `npm install`, then `npm run dev`.
4. Open the Vite URL. Admin login is at `/admin-login`.
5. For Razorpay Test Mode, set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` as backend environment variables before starting Spring Boot. Never paste live credentials into source files.
6. If merchant account review is pending or keys are unavailable, use the included manual UPI proof flow for the demonstration and explain that live gateway activation awaits merchant approval.

## Scope note
Razorpay automatic checkout and server-side signature verification are implemented for the product payment. The later delivery-charge payment still uses the existing customer proof upload and admin verification flow. Razorpay webhook reconciliation and automated delivery-charge checkout are not included in this version and should be completed before production launch.

- Customer My Orders allows customers to submit a change request before dispatch; admin can review, approve/decline/complete it, and record an extra customization charge. The extra customization charge is currently coordinated manually and is not automatically collected through Razorpay.
- Admin Order Management includes search by order ID, customer name, mobile, WhatsApp number or Instagram ID. Customer My Orders lookup continues to use the order mobile number.
