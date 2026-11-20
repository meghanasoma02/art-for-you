import { useEffect, useMemo, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Search, ShoppingBag, Menu, X, Camera, MessageCircle, ArrowUpRight, Plus, Minus, Trash2, ChevronRight, Heart, PackageCheck } from 'lucide-react';
import { getCollections, getProducts } from './api';
import AdminOrders from './AdminOrders';
import AdminLogin from './AdminLogin';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const API_ROOT = API.replace(/\/api\/?$/, '');
const imageUrl = path => !path ? '' : /^https?:\/\//i.test(path) ? path : path.startsWith('/api/') ? `${API_ROOT}${path}` : path;
const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const discountRate = product => { const n = (product.name || '').toLowerCase().replace(/[^a-z]/g, ''); const c = (product.category || '').toLowerCase().replace(/[^a-z]/g, ''); const collection = (product.collection || '').toLowerCase(); if (collection === 'weddingdecor' && (n.includes('kudakalu') || n.includes('kobbaribondam') || c.includes('kudakalu') || c.includes('kobbaribondam'))) return 0; return Number(product.discountPercentage ?? 5); };
const discountedPrice = product => Math.round(Number(product.price) * (100 - discountRate(product)) / 100);
const discountedLineTotal = (product, quantity) => { const subtotal = Number(product.price) * quantity; return subtotal - Math.round(subtotal * discountRate(product) / 100); };
const WHATSAPP = 'https://wa.me/919398601981';
const INSTAGRAM = 'https://www.instagram.com/artforyou__2/';
const INDIA_POST = 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx';

function ProductCard({ product, onOpen, onAdd, onBuy }) {
  const images = Array.isArray(product.images) ? product.images : [];
  return <article className="product-card">
    <button className="product-photo" onClick={() => onOpen(product)} aria-label={`View ${product.name}`}>
      {images[0] ? <img src={imageUrl(images[0])} alt={product.name} loading="lazy" /> : <span className="image-placeholder">ART FOR YOU</span>}
      <span className="photo-view">Quick view <ArrowUpRight size={14}/></span>
    </button>
    <div className="product-info">
      <div><p className="product-category">{product.category || product.collection}</p><h3>{product.name}</h3><strong>{money(discountedPrice(product))}</strong>{discountRate(product) > 0 && <small className="discount-note"><s>{money(product.price)}</s> · {discountRate(product)}% OFF</small>}</div>
      <div className="product-actions"><button className="add-to-cart-button" onClick={() => onAdd(product)}><ShoppingBag size={15}/> Add to Cart</button><button className="buy-now-button" onClick={() => onBuy(product)}>Buy Now <ArrowUpRight size={14}/></button></div>
    </div>
  </article>;
}

function OrderPhotos({ order }) {
  let photos = [];
  try { photos = order.preparedPhotos ? JSON.parse(order.preparedPhotos) : []; } catch { photos = []; }
  return photos.length ? <div className="prepared-gallery"><h4>Prepared especially for you</h4><div>{photos.map((photo, i) => <a href={`${API_ROOT}/api/orders/prepared-photo/${encodeURIComponent(photo.split(/[\\/]/).pop())}`} target="_blank" rel="noreferrer" key={i}><img src={`${API_ROOT}/api/orders/prepared-photo/${encodeURIComponent(photo.split(/[\\/]/).pop())}`} alt={`Prepared order ${i + 1}`} /></a>)}</div></div> : null;
}

function OrderTimeline({ order }) {
  const prepared = Boolean(order.preparedPhotos && order.preparedPhotos !== '[]');
  const shipped = ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ORDER_RECEIVED'].includes(order.status);
  const received = order.status === 'ORDER_RECEIVED';
  const steps = [
    ['Product payment', order.paymentStatus === 'VERIFIED'],
    ['Order prepared', prepared && ['ORDER_COMPLETED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ORDER_RECEIVED'].includes(order.status)],
    ['Delivery payment', order.deliveryPaymentStatus === 'VERIFIED'],
    ['Shipped', shipped],
    ['Order received', received]
  ];
  return <div className="order-timeline">{steps.map(([label, done], index) => <div className={done ? 'timeline-step done' : 'timeline-step'} key={label}><span>{done ? '✓' : index + 1}</span><small>{label}</small></div>)}</div>;
}

function Home() {
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const [paymentUploaded, setPaymentUploaded] = useState(false);
  const [deliveryUploaded, setDeliveryUploaded] = useState({});
  const [searchMobile, setSearchMobile] = useState('');
  const [myOrders, setMyOrders] = useState([]);
  const [orderError, setOrderError] = useState('');

  useEffect(() => { getCollections().then(setCollections).catch(() => setError('Please start the backend server and refresh.')); }, []);
  useEffect(() => {
    setLoading(true);
    getProducts(selectedCollection).then(setProducts).catch(() => setError('Products could not be loaded. Please check the server.')).finally(() => setLoading(false));
  }, [selectedCollection]);

  const visibleProducts = useMemo(() => products.filter(p => `${p.name} ${p.category || ''} ${p.description || ''}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const cartOriginalTotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + discountedLineTotal(item, item.quantity), 0);
  const cartDiscount = cartOriginalTotal - cartTotal;
  const addToCart = product => setCart(prev => {
    const found = prev.find(item => item.id === product.id);
    return found ? prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...prev, { ...product, quantity: 1 }];
  });
  const scrollTo = id => { setMobileMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };
  const chooseCollection = slug => { setSelectedCollection(slug); scrollTo('shop'); };

  const placeOrder = async e => {
    e.preventDefault();
    if (!cart.length) return;
    const data = new FormData(e.currentTarget);
    const payload = Object.fromEntries(['customerName','mobile','whatsappNumber','instagramId','address','city','state','pincode'].map(k => [k, data.get(k)]));
    payload.items = cart.map(({ id, quantity }) => ({ id, quantity }));
    try {
      const response = await fetch(`${API}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Order could not be placed');
      setOrderConfirmation({ ...result, mobile: payload.mobile, whatsappNumber: payload.whatsappNumber || payload.mobile, instagramId: payload.instagramId });
      setPaymentUploaded(false); setCart([]); e.currentTarget.reset();
      // Attempt Razorpay Test Mode checkout when backend credentials are configured.
      // If onboarding/keys are pending, keep the existing manual UPI proof flow available.
      try {
        const gatewayRes = await fetch(`${API}/payments/razorpay/orders/${result.orderId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: payload.mobile }) });
        const gateway = await gatewayRes.json();
        if (gatewayRes.ok && window.Razorpay) {
          const options = { key: gateway.keyId, amount: gateway.amount, currency: gateway.currency, name: gateway.name, description: gateway.description, order_id: gateway.gatewayOrderId, prefill: { name: gateway.customerName, contact: gateway.mobile }, theme: { color: '#805d4d' },
            handler: async payment => {
              const verifyRes = await fetch(`${API}/payments/razorpay/verify/${result.orderId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payment, mobile: payload.mobile }) });
              const verified = await verifyRes.json();
              if (!verifyRes.ok) { alert(verified.message || 'Payment verification failed'); return; }
              setOrderConfirmation(prev => ({ ...prev, paymentStatus: 'VERIFIED', paymentId: verified.paymentId }));
              alert('Payment successful and verified!');
            }
          };
          new window.Razorpay(options).open();
        }
      } catch (gatewayError) { console.info('Razorpay unavailable; manual UPI payment remains available.'); }
    } catch (err) { alert(err.message || 'Unable to connect to server'); }
  };

  const uploadProof = async (e, order, type = 'product') => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.append('mobile', order.mobile || searchMobile);
    const path = type === 'delivery' ? `${API}/orders/${order.id}/delivery-payment-proof` : `${API}/orders/${order.orderId}/payment-proof`;
    try {
      const res = await fetch(path, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      if (type === 'delivery') setDeliveryUploaded(prev => ({ ...prev, [order.id]: true }));
      else setPaymentUploaded(true);
      e.currentTarget.reset();
      if (type === 'delivery') searchMyOrders();
    } catch (err) { alert(err.message); }
  };

  const searchMyOrders = async () => {
    setOrderError('');
    if (!/^[0-9]{10}$/.test(searchMobile)) { setOrderError('Enter a valid 10-digit mobile number.'); return; }
    try {
      const res = await fetch(`${API}/orders/my-orders?mobile=${encodeURIComponent(searchMobile)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to find orders');
      setMyOrders(data);
      if (!data.length) setOrderError('No orders found for this mobile number.');
    } catch (err) { setOrderError(err.message); }
  };

  const markReceived = async order => {
    try {
      const res = await fetch(`${API}/orders/${order.id}/received`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: searchMobile }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not update order');
      searchMyOrders();
    } catch (err) { alert(err.message); }
  };

  const nav = <><a href="#home" onClick={() => setMobileMenu(false)}>Home</a><a href="#collections" onClick={() => setMobileMenu(false)}>Collections</a><a href="#shop" onClick={() => { setSelectedCollection(''); setMobileMenu(false); }}>Shop All</a><a href="#about" onClick={() => setMobileMenu(false)}>Our Story</a><a href="#my-orders" onClick={() => setMobileMenu(false)}>My Orders</a><a href="#contact" onClick={() => setMobileMenu(false)}>Contact</a></>;

  return <div className="storefront">
    <div className="announcement">HANDCRAFTED WITH LOVE · MADE TO MAKE YOUR MOMENTS SPECIAL</div>
    <header className="site-header">
      <button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X/> : <Menu/>}</button>
      <a className="brand-mark" href="#home"><span>ART</span><small>FOR YOU</small></a>
      <nav className={mobileMenu ? 'main-nav open' : 'main-nav'}>{nav}</nav>
      <div className="header-actions">
        <a href={WHATSAPP} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle size={19}/></a>
        <a href={INSTAGRAM} target="_blank" rel="noreferrer" aria-label="Instagram"><Camera size={19}/></a>
        <button onClick={() => scrollTo('cart')} aria-label="Shopping bag"><ShoppingBag size={20}/><span>{cart.reduce((n, i) => n + i.quantity, 0)}</span></button>
      </div>
    </header>

    <main id="home">
      <section className="hero-premium">
        <div className="hero-copy"><p className="eyebrow">THOUGHTFULLY HANDCRAFTED</p><h1>Little details.<br/><em>Lasting memories.</em></h1><p>Wedding essentials, meaningful gifts and handcrafted treasures, made with love for your most beautiful moments.</p><button className="primary-button" onClick={() => scrollTo('collections')}>EXPLORE COLLECTIONS <ArrowUpRight size={15}/></button></div>
        <div className="hero-note"><span>ARTISAN</span><span>MADE</span><span>WITH LOVE</span></div>
      </section>

      <section id="collections" className="section-shell">
        <div className="section-heading"><p className="eyebrow">FIND SOMETHING MEANINGFUL</p><h2>Shop by Collection</h2><p>Thoughtful creations for every celebration.</p></div>
        <div className="collection-grid-premium">
          {collections.filter(c => !['homedecor','vintageletters','welcomeboards'].includes(c.slug)).map((c, i) => <button key={c.slug} className={`collection-tile tile-${i % 4}`} onClick={() => chooseCollection(c.slug)}><span className="tile-number">0{i + 1}</span>{c.imagePath && <img className="collection-cover" src={imageUrl(c.imagePath)} alt="" loading="lazy"/>}<strong>{c.title}</strong><small>DISCOVER <ArrowUpRight size={13}/></small></button>)}
        </div>
      </section>

      <section id="shop" className="section-shell shop-section">
        <div className="shop-top"><div className="section-heading align-left"><p className="eyebrow">THE ART FOR YOU EDIT</p><h2>{collections.find(c => c.slug === selectedCollection)?.title || 'Made to be cherished'}</h2><p>Handpicked pieces, created with care.</p></div><label className="search-box"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search creations"/></label></div>
        <div className="category-pills"><button className={!selectedCollection ? 'active' : ''} onClick={() => setSelectedCollection('')}>All</button>{collections.filter(c => !['homedecor','vintageletters','welcomeboards'].includes(c.slug)).map(c => <button className={selectedCollection === c.slug ? 'active' : ''} key={c.slug} onClick={() => setSelectedCollection(c.slug)}>{c.title}</button>)}</div>
        {error && <p className="error">{error}</p>}
        {loading ? <p className="muted">Curating your collection…</p> : <div className="product-grid-premium">{visibleProducts.map(product => <ProductCard key={product.id} product={product} onOpen={p => { setActiveProduct(p); setImageIndex(0); }} onAdd={addToCart} onBuy={p => { addToCart(p); scrollTo('cart'); }}/>)}</div>}
        {!loading && !visibleProducts.length && <p className="muted">No products found. Try another search or collection.</p>}
      </section>

      <section className="craft-strip"><div><p className="eyebrow">MADE BY HAND, MADE FOR YOU</p><h2>Every piece tells<br/><em>a little story.</em></h2></div><p>From wedding traditions to thoughtful gifting, we bring your ideas to life with patience, detail and a personal touch.</p></section>

      <section id="cart" className="section-shell cart-section">
        <div className="section-heading"><p className="eyebrow">YOUR SELECTION</p><h2>Your Shopping Bag</h2></div>
        {!cart.length ? <p className="muted">Your bag is waiting for something beautiful.</p> : <div className="cart-panel">{cart.map(item => <div className="cart-line" key={item.id}><div><strong>{item.name}</strong><small>{money(item.price)} each</small>{discountRate(item) > 0 && <small className="discount-note">{discountRate(item)}% discount applied</small>}</div><div className="quantity-control"><button onClick={() => setCart(prev => prev.map(p => p.id === item.id ? {...p, quantity: Math.max(1,p.quantity-1)} : p))}><Minus size={14}/></button><span>{item.quantity}</span><button onClick={() => setCart(prev => prev.map(p => p.id === item.id ? {...p, quantity:p.quantity+1} : p))}><Plus size={14}/></button></div><strong>{money(discountedLineTotal(item, item.quantity))}</strong><button className="remove-item" onClick={() => setCart(prev => prev.filter(p => p.id !== item.id))}><Trash2 size={16}/></button></div>)}<div className="cart-total"><span>Actual product total</span><strong>{money(cartOriginalTotal)}</strong></div><div className="cart-total discount-row"><span>Product discount</span><strong>− {money(cartDiscount)}</strong></div><div className="cart-total"><span>Payable product amount</span><strong>{money(cartTotal)}</strong></div><button className="primary-button" onClick={() => scrollTo('checkout')}>CONTINUE TO CHECKOUT <ChevronRight size={16}/></button></div>}
      </section>

      <section id="checkout" className="section-shell checkout-section"><div className="section-heading"><p className="eyebrow">ALMOST YOURS</p><h2>Delivery Details</h2><p>Share where we should send your handcrafted order.</p></div><form className="checkout-form premium-form" onSubmit={placeOrder}><input name="customerName" placeholder="Full name" required/><input name="mobile" type="tel" placeholder="10-digit mobile number" pattern="[0-9]{10}" maxLength="10" required/><input name="whatsappNumber" type="tel" placeholder="WhatsApp number (if different)" pattern="[0-9]{10}" maxLength="10"/><input name="instagramId" placeholder="Instagram ID (optional)"/><textarea name="address" placeholder="Full delivery address" rows="3" required/><div className="form-row"><input name="city" placeholder="City" required/><input name="state" placeholder="State" required/></div><input name="pincode" placeholder="PIN code" pattern="[0-9]{6}" maxLength="6" required/><button className="primary-button" type="submit" disabled={!cart.length}>PLACE ORDER · {money(cartTotal)}</button></form>
        {orderConfirmation && <div className="payment-panel"><div className="success-icon"><PackageCheck/></div><p className="eyebrow">ORDER #{orderConfirmation.orderId}</p><h3>Your order is reserved</h3><p>Actual amount: <s>{money(orderConfirmation.originalAmount ?? orderConfirmation.totalAmount)}</s><br/>Discount: <strong>{money(orderConfirmation.discountAmount || 0)}</strong><br/>Payable product amount: <strong>{money(orderConfirmation.totalAmount)}</strong> using Razorpay when enabled, or the PhonePe QR/manual proof option below. Delivery charges will be requested separately after your order is prepared.</p>{orderConfirmation.paymentStatus === 'VERIFIED' ? <p className="inline-success">Online payment verified successfully. Thank you!</p> : <><img className="phonepe-qr" src="/assets/images/phonepe-qr.jpeg" alt="PhonePe payment QR"/>{paymentUploaded ? <p className="inline-success">Payment proof submitted. We will verify it shortly.</p> : <form onSubmit={e => uploadProof(e, orderConfirmation)}><input name="transactionId" placeholder="Payment transaction ID" required/><input name="file" type="file" accept="image/png,image/jpeg,image/webp" required/><button className="primary-button">SUBMIT PRODUCT PAYMENT PROOF</button></form>}</>}</div>}
      </section>

      <section id="my-orders" className="section-shell orders-section"><div className="section-heading"><p className="eyebrow">YOUR ART FOR YOU JOURNEY</p><h2>Track Your Order</h2><p>Enter the mobile number used while placing your order.</p></div><div className="order-search"><input value={searchMobile} onChange={e => setSearchMobile(e.target.value)} maxLength="10" placeholder="10-digit mobile number"/><button className="primary-button" onClick={searchMyOrders}>FIND MY ORDERS</button></div>{orderError && <p className="error">{orderError}</p>}
        <div className="customer-orders">{myOrders.map(order => <article className="customer-order-card" key={order.id}><div className="order-card-head"><div><p className="eyebrow">ORDER #{order.id}</p><h3>{order.customerName}</h3></div><span className={`status-chip ${order.status === 'ORDER_RECEIVED' || order.status === 'DELIVERED' ? 'complete' : ''}`}>{(order.status || 'PENDING').replaceAll('_',' ')}</span></div><OrderTimeline order={order}/><p><b>Items:</b> {(() => { try { return JSON.parse(order.items).map(i => `${i.name} × ${i.quantity} · ${money(i.discountedSubtotal ?? i.subtotal)}${Number(i.discountAmount || 0) ? ` (saved ${money(i.discountAmount)})` : ''}`).join(', '); } catch { return 'Order items'; } })()}</p><p><b>Product total:</b> {money(order.totalAmount)}</p><p><b>Product payment:</b> {order.paymentStatus || 'NOT_SUBMITTED'}</p><OrderPhotos order={order}/>{order.changeRequest && <p><b>Change request:</b> {order.changeRequest} · <b>Status:</b> {order.changeRequestStatus}</p>}{order.extraWorkCharge > 0 && <p><b>Additional customization charge:</b> {money(order.extraWorkCharge)} (please coordinate payment with Art For You)</p>}{!['SHIPPED','OUT_FOR_DELIVERY','DELIVERED','ORDER_RECEIVED'].includes(order.status) && <form className="delivery-payment" onSubmit={async e => { e.preventDefault(); const form = new FormData(e.currentTarget); try { const response = await fetch(`${API}/orders/${order.id}/change-request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: searchMobile, request: form.get('request') }) }); const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Could not submit change request'); alert('Change request sent to Art For You.'); e.currentTarget.reset(); searchMyOrders(); } catch (err) { alert(err.message); } }}><h4>Request a change</h4><textarea name="request" rows="3" maxLength="2000" placeholder="Describe the changes you need after viewing the prepared photos" required/><button className="secondary-button">SUBMIT CHANGE REQUEST</button></form>}{order.deliveryCharge > 0 && <div className="delivery-payment"><h4>Delivery payment · {money(order.deliveryCharge)}</h4><p>Status: <b>{order.deliveryPaymentStatus || 'PENDING'}</b></p>{order.deliveryPaymentStatus !== 'VERIFIED' && <><p>Please pay the delivery charge using the payment instructions shared by Art For You, then upload the proof.</p>{order.deliveryPaymentStatus === 'SUBMITTED' || deliveryUploaded[order.id] ? <p className="inline-success">Delivery payment proof submitted. Waiting for admin verification.</p> : <form onSubmit={e => uploadProof(e, order, 'delivery')}><input name="transactionId" placeholder="Delivery payment transaction ID" required/><input name="file" type="file" accept="image/png,image/jpeg,image/webp" required/><button className="secondary-button">UPLOAD DELIVERY PAYMENT</button></form>}</>}</div>}{order.trackingId && <div className="tracking-box"><p><b>India Post Tracking ID:</b> {order.trackingId}</p><a href={order.trackingUrl || INDIA_POST} target="_blank" rel="noreferrer">Track on India Post <ArrowUpRight size={14}/></a></div>}{order.status === 'SHIPPED' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED' || order.status === 'ORDER_RECEIVED' ? <button className="secondary-button received-button" onClick={() => markReceived(order)} disabled={order.status === 'ORDER_RECEIVED'}>{order.status === 'ORDER_RECEIVED' ? 'ORDER RECEIVED ✓' : 'I HAVE RECEIVED MY ORDER'}</button> : null}</article>)}</div>
      </section>

      <section id="about" className="about-premium"><p className="eyebrow">OUR STORY</p><h2>Little details.<br/><em>Big feelings.</em></h2><p>Art For You creates thoughtful handmade pieces for gifting, celebrating and making your special moments unforgettable.</p></section>
      <section id="contact" className="contact-band"><div><p className="eyebrow">LET'S CREATE SOMETHING SPECIAL</p><h2>We're just a message away.</h2></div><div className="contact-actions"><a href={WHATSAPP} target="_blank" rel="noreferrer"><MessageCircle/> WhatsApp</a><a href={INSTAGRAM} target="_blank" rel="noreferrer"><Camera/> Instagram</a></div></section>
    </main>
    <footer className="premium-footer"><a className="brand-mark" href="#home"><span>ART</span><small>FOR YOU</small></a><p>Handcrafted with love · © {new Date().getFullYear()} Art For You</p><div><a href={WHATSAPP}>WhatsApp</a><a href={INSTAGRAM}>Instagram</a><a href={INDIA_POST} target="_blank" rel="noreferrer">Track India Post</a></div></footer>

    {activeProduct && <div className="modal-backdrop" onClick={() => setActiveProduct(null)}><div className="product-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setActiveProduct(null)}><X/></button><div className="modal-gallery">{(activeProduct.images || []).length ? <><img src={imageUrl(activeProduct.images[imageIndex])} alt={activeProduct.name}/>{activeProduct.images.length > 1 && <div className="gallery-thumbs">{activeProduct.images.map((img,i) => <button className={i === imageIndex ? 'active' : ''} onClick={() => setImageIndex(i)} key={i}><img src={imageUrl(img)} alt=""/></button>)}</div>}</> : <span>ART FOR YOU</span>}</div><div className="modal-info"><p className="eyebrow">{activeProduct.category || activeProduct.collection}</p><h2>{activeProduct.name}</h2><strong>{money(activeProduct.price)}</strong><p>{activeProduct.description || 'A thoughtful handmade creation, carefully crafted for your special moments.'}</p><button className="primary-button" onClick={() => { addToCart(activeProduct); setActiveProduct(null); }}>ADD TO BAG <ShoppingBag size={16}/></button><a href={`${WHATSAPP}?text=${encodeURIComponent(`Hi, I would like to enquire about ${activeProduct.name}.`)}`} target="_blank" rel="noreferrer">Ask about this product on WhatsApp</a></div></div></div>}
    <a className="floating-whatsapp" href={WHATSAPP} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle/></a>
  </div>;
}

export default function App() {
  return <Routes><Route path="/admin-login" element={<AdminLogin/>}/><Route path="/admin" element={<AdminOrders/>}/><Route path="*" element={<Home/>}/></Routes>;
}
