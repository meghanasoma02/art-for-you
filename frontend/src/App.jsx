
import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { getCollections, getProducts } from './api';
import AdminOrders from './AdminOrders';
import AdminLogin from './AdminLogin';

const money = value =>
  `₹${Number(value || 0).toLocaleString('en-IN')}`;

function Home() {
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const [searchMobile, setSearchMobile] = useState('');
  const [paymentUploaded, setPaymentUploaded] = useState(false);
  const [myOrders, setMyOrders] = useState([]);

  // Search My Orders
  const searchMyOrders = async () => {
    if (!/^[0-9]{10}$/.test(searchMobile)) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8080/api/orders/my-orders?mobile=${searchMobile}`
      );

      if (!response.ok) {
        alert('Unable to fetch orders');
        return;
      }

      const data = await response.json();
      setMyOrders(data);

      if (data.length === 0) {
        alert('No orders found for this mobile number');
      }
    } catch (error) {
      alert('Server connection failed');
    }
  };

  // Add to Cart
  const addToCart = product => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);

      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, { ...product, quantity: 1 }];
    });

    alert('Product added to cart!');
  };

  // Load Collections
  useEffect(() => {
    getCollections()
      .then(setCollections)
      .catch(() =>
        setError(
          'Backend connect avvaledu. Spring Boot server start chesi refresh cheyyandi.'
        )
      );
  }, []);

  // Load Products
  useEffect(() => {
    setLoading(true);

    getProducts(selectedCollection)
      .then(setProducts)
      .catch(() =>
        setError(
          'Products load avvaledu. Backend server check chesi refresh cheyyandi.'
        )
      )
      .finally(() => setLoading(false));
  }, [selectedCollection]);

  // Choose Collection
  const chooseCollection = slug => {
    setSelectedCollection(slug);
    document.getElementById('shop')?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  const selectedTitle = collections.find(
    c => c.slug === selectedCollection
  )?.title;

  // Place Order
  const placeOrder = async e => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    const orderData = {
      customerName: formData.get('customerName'),
      mobile: formData.get('mobile'),
      address: formData.get('address'),
      city: formData.get('city'),
      state: formData.get('state'),
      pincode: formData.get('pincode'),
      items: cart.map(item => ({
        id: item.id,
        quantity: item.quantity
      }))
    };

    try {
      const response = await fetch(
        'http://localhost:8080/api/orders',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderData)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || 'Order failed');
        return;
      }

      setPaymentUploaded(false);

      setOrderConfirmation({
        ...result,
        mobile: orderData.mobile
      });

      setCart([]);
      form.reset();

    } catch (error) {
      alert('Unable to connect to server. Please try again.');
    }
  };

  // Upload Payment Screenshot
  const uploadPaymentProof = async e => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    formData.append('mobile', orderConfirmation.mobile);

    try {
      const response = await fetch(
        `http://localhost:8080/api/orders/${orderConfirmation.orderId}/payment-proof`,
        {
          method: 'POST',
          body: formData
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || 'Upload failed');
        return;
      }

      setPaymentUploaded(true);
      form.reset();

    } catch (error) {
      alert('Unable to upload screenshot');
    }
  };

  return (
    <>
      {/* Header */}
      <header>
        <div className="brand">
          ART <span>FOR YOU</span>
        </div>

        <nav>
          <a href="#home">Home</a>
          <a href="#collections">Collections</a>
          <a
            href="#shop"
            onClick={() => setSelectedCollection('')}
          >
            Shop
          </a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <a href="#my-orders">My Orders</a>
        </nav>
      </header>

      <main id="home">

        {/* Hero */}
        <section className="hero">
          <p className="eyebrow">HANDMADE WITH LOVE</p>

          <h1>
            Make every moment
            <br />
             Beautiful With 
            <br />
            <em>Art For You</em>
          </h1>

          <p>
            Thoughtful gifts, handcrafted decor and little
            things that make memories special.
          </p>

          <a className="cta" href="#collections">
            Explore collection
          </a>
        </section>

        {/* Collections */}
        <section id="collections">
          <div className="section-head">
            <p className="eyebrow">EXPLORE</p>
            <h2>Our Collections</h2>
          </div>

          <div className="collection-grid">
  {collections
    .filter(c =>
      !['homedecor', 'vintageletters', 'welcomeboards'].includes(c.slug)
    )
    .map(c => (
      <button
        type="button"
        className={`collection ${
          selectedCollection === c.slug ? 'selected' : ''
        }`}
        onClick={() => chooseCollection(c.slug)}
        key={c.slug}
      >
        <span>{c.title}</span>
        <small>Discover collection ↗</small>
      </button>
    ))}
</div>
</section>

        {/* Shop */}
        <section id="shop">
          <div className="section-head">
            <p className="eyebrow">MADE FOR YOU</p>
            <h2>{selectedTitle || 'Featured Products'}</h2>

            {selectedCollection && (
              <button
                type="button"
                className="clear-filter"
                onClick={() => setSelectedCollection('')}
              >
                View all products
              </button>
            )}
          </div>

          {error && <p className="error">{error}</p>}

          <div className="product-grid">
            {products.map(p => (
              <article className="product" key={p.id}>
                <div className="product-image">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} />
                  ) : (
                    <span>Art For You</span>
                  )}
                </div>

                <h3>{p.name}</h3>
                <p>{money(p.price)}</p>

                <button
                  type="button"
                  onClick={() => addToCart(p)}
                >
                  Add to Cart
                </button>
              </article>
            ))}
          </div>

          {loading && (
            <p className="muted">Loading products…</p>
          )}

          {!loading && !error && !products.length && (
            <p className="muted">
              No products in this collection yet.
            </p>
          )}
        </section>

        {/* Cart */}
        <section id="cart">
          <div className="section-head">
            <p className="eyebrow">YOUR ITEMS</p>
            <h2>Shopping Cart ({cart.length})</h2>
          </div>

          {cart.length === 0 ? (
            <p className="muted">Your cart is empty.</p>
          ) : (
            <>
              {cart.map(item => (
                <div className="cart-item" key={item.id}>
                  <h3>{item.name}</h3>

                  <p>
                    {money(item.price)} × {item.quantity}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setCart(prev =>
                        prev.map(p =>
                          p.id === item.id
                            ? {
                                ...p,
                                quantity: p.quantity + 1
                              }
                            : p
                        )
                      )
                    }
                  >
                    +
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCart(prev =>
                        prev
                          .map(p =>
                            p.id === item.id
                              ? {
                                  ...p,
                                  quantity: p.quantity - 1
                                }
                              : p
                          )
                          .filter(p => p.quantity > 0)
                      )
                    }
                  >
                    -
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCart(prev =>
                        prev.filter(p => p.id !== item.id)
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}

              <h3>
                Total:{' '}
                {money(
                  cart.reduce(
                    (sum, item) =>
                      sum + item.price * item.quantity,
                    0
                  )
                )}
              </h3>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById('checkout')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
                disabled={!cart.length}
              >
                Proceed to Checkout
              </button>
            </>
          )}
        </section>

        {/* Checkout */}
        <section id="checkout">
          <div className="section-head">
            <p className="eyebrow">ALMOST YOURS</p>
            <h2>Checkout</h2>
            <p>Enter your delivery details</p>
          </div>

          <form
            className="checkout-form"
            onSubmit={placeOrder}
          >
            <input
              name="customerName"
              type="text"
              placeholder="Full Name"
              required
            />

            <input
              name="mobile"
              type="tel"
              placeholder="Mobile Number"
              pattern="[0-9]{10}"
              maxLength="10"
              required
            />

            <textarea
              name="address"
              placeholder="Full Delivery Address"
              rows="4"
              required
            />

            <input
              name="city"
              type="text"
              placeholder="City"
              required
            />

            <input
              name="state"
              type="text"
              placeholder="State"
              required
            />

            <input
              name="pincode"
              type="text"
              placeholder="PIN Code"
              pattern="[0-9]{6}"
              maxLength="6"
              required
            />

            <button type="submit">
              Submit Delivery Details
            </button>
          </form>

          {/* Order Confirmation */}
          {orderConfirmation && (
            <div className="order-success">
              <h2>🎉 Order Placed Successfully!</h2>

              <p>
                <b>Order ID:</b> #{orderConfirmation.orderId}
              </p>

              <p>
                <b>Total Amount:</b>{' '}
                {money(orderConfirmation.totalAmount)}
              </p>

              <p>
                <b>Advance Payment (50%):</b>{' '}
                {money(orderConfirmation.advanceAmount)}
              </p>

              <h3>Pay Advance Using PhonePe</h3>

              <img
                src="/assets/images/phonepe-qr.jpeg"
                alt="PhonePe QR Code"
                className="phonepe-qr"
              />

              <p>
                Scan this QR code using PhonePe and pay
                the advance amount.
              </p>

              <p>
                After payment, please share your payment
                screenshot and transaction ID with us
                for manual verification.
              </p>

              {/* Payment Upload Success */}
              {paymentUploaded ? (
                <div className="payment-success">
                  <h3>✅ Payment Proof Submitted!</h3>

                  <p>
                    Your payment screenshot has been
                    uploaded successfully.
                  </p>

                  <p>
                    Our team will verify your payment shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={uploadPaymentProof}>
                  <h3>Upload Payment Proof</h3>

                  <input
                    type="text"
                    name="transactionId"
                    placeholder="PhonePe Transaction ID"
                    required
                  />

                  <input
                    type="file"
                    name="file"
                    accept="image/png,image/jpeg,image/webp"
                    required
                  />

                  <button type="submit">
                    Upload Payment Screenshot
                  </button>
                </form>
              )}

              <p>
                <b>Order Status:</b> PENDING
              </p>

              <p>
                Thank you for shopping with Art For You!
              </p>
            </div>
          )}
        </section>

        {/* My Orders */}
        <section id="my-orders">
          <div className="section-head">
            <p className="eyebrow">ORDER TRACKING</p>
            <h2>My Orders</h2>
            <p>
              Enter your mobile number to view your orders.
            </p>
          </div>

          <div className="checkout-form">
            <input
              type="tel"
              placeholder="Enter 10-digit Mobile Number"
              value={searchMobile}
              maxLength="10"
              onChange={e => setSearchMobile(e.target.value)}
            />

            <button
              type="button"
              onClick={searchMyOrders}
            >
              Search My Orders
            </button>
          </div>

          {myOrders.map(order => (
            <div className="admin-order-card" key={order.id}>
              <h3>Order #{order.id}</h3>

              <p>
                <b>Items:</b>{' '}
                {JSON.parse(order.items).map(item =>
                  `${item.name} x ${item.quantity}`
                ).join(', ')}
              </p>

              <p>
                <b>Total:</b> {money(order.totalAmount)}
              </p>

              <p>
                <b>Advance:</b> {money(order.advanceAmount)}
              </p>

              <p>
                <b>Status:</b> {order.status}
              </p>

              <p>
                <b>Tracking ID:</b>{' '}
                {order.trackingId || 'Not yet available'}
              </p>

              {order.trackingId && (
                <a
                  href="https://www.indiapost.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Track Parcel
                </a>
              )}
            </div>
          ))}
        </section>

        {/* About */}
        <section id="about" className="about">
          <p className="eyebrow">OUR STORY</p>

          <h2>
            Little details.
            <br />
            <em>Big feelings.</em>
          </h2>

          <p>
            Beautiful handmade creations for gifting,
            celebrating and making your spaces yours.
          </p>
        </section>

        {/* Contact */}
        <section id="contact">
          <div className="section-head">
            <p className="eyebrow">SAY HELLO</p>
            <h2>We'd love to hear from you.</h2>
          </div>
        </section>

      </main>

     <footer className="site-footer">
  <p>
    © {new Date().getFullYear()} Art For You · Made with love
  </p>

  <div className="footer-links">
    <a
  href="https://www.instagram.com/artforyou__2/"
  target="_blank"
  rel="noopener noreferrer"
  className="instagram-link"
  aria-label="Visit our Instagram page"
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="18" cy="6" r="1" className="insta-dot" />
  </svg>
  <span>@artforyou__2</span>
</a>

    
     <a
  href="https://wa.me/919398601981"
  target="_blank"
  rel="noopener noreferrer"
  className="whatsapp-link"
  aria-label="Contact us on WhatsApp"
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.7a8.5 8.5 0 1 1 16.3-3.8Z" />
    <path d="M8.5 8.5c.5 3 2.2 4.7 5.2 6l1.2-1.4 2 .9c-.2 1.4-1.2 2.2-2.5 2.2-3.8-.4-7.1-3.7-7.5-7.5 0-1.3.8-2.3 2.2-2.5l.9 2Z" />
  </svg>
  <span>WhatsApp</span>
</a>
  </div>
</footer>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin-login"
        element={<AdminLogin />}
      />

      <Route
        path="/admin"
        element={<AdminOrders />}
      />

      <Route
        path="*"
        element={<Home />}
      />
    </Routes>
  );
}
