import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const INDIA_POST = 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx';
const STATUSES = ['PENDING', 'PROCESSING', 'ORDER_COMPLETED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ORDER_RECEIVED'];

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState({});
  const [adminProducts, setAdminProducts] = useState([]);
  const [adminCollections, setAdminCollections] = useState([]);
  const [orderSearch, setOrderSearch] = useState('');

  const refresh = async () => {
    const response = await fetch(`${API}/orders`, { credentials: 'include' });
    if (!response.ok) throw new Error(response.status === 401 ? 'Please login as admin again.' : 'Could not load orders.');
    setOrders(await response.json());
  };

  const refreshProducts = async () => { const response = await fetch(`${API}/products/admin`, { credentials: 'include' }); if (!response.ok) throw new Error('Could not load product catalogue.'); setAdminProducts(await response.json()); };
  const refreshCollections = async () => { const response = await fetch(`${API}/collections/admin`, { credentials: 'include' }); if (!response.ok) throw new Error('Could not load collections.'); setAdminCollections(await response.json()); };
  useEffect(() => { refresh().catch(e => setError(e.message)).finally(() => setLoading(false)); refreshProducts().catch(e => setError(e.message)); refreshCollections().catch(e => setError(e.message)); }, []);
  const markBusy = (id, value) => setBusy(prev => ({ ...prev, [id]: value }));
  const updateOrder = (id, patch) => setOrders(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
  const request = async (url, options = {}) => {
    const response = await fetch(url, { credentials: 'include', ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Request failed');
    return body;
  };

  const updateStatus = async (id, status) => {
    markBusy(id, 'status');
    try { await request(`${API}/orders/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); updateOrder(id, { status }); }
    catch (e) { alert(e.message); } finally { markBusy(id, ''); }
  };
  const updatePayment = async (id, paymentStatus, delivery = false) => {
    const key = delivery ? 'deliveryPaymentStatus' : 'paymentStatus';
    markBusy(id, key);
    try { await request(`${API}/orders/${id}/${delivery ? 'delivery-payment-status' : 'payment-status'}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: paymentStatus }) }); updateOrder(id, { [key]: paymentStatus }); }
    catch (e) { alert(e.message); } finally { markBusy(id, ''); }
  };
  const saveDeliveryCharge = async (id, form) => {
    const data = new FormData(form);
    const deliveryCharge = Number(data.get('deliveryCharge'));
    markBusy(id, 'delivery');
    try { const result = await request(`${API}/orders/${id}/delivery-charge`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryCharge }) }); updateOrder(id, { deliveryCharge: result.deliveryCharge, deliveryPaymentStatus: result.deliveryPaymentStatus }); alert('Delivery charge saved. Customer can now see the payment request.'); }
    catch (e) { alert(e.message); } finally { markBusy(id, ''); }
  };

  // Opens a pre-filled WhatsApp chat for the admin to review and send.
  const openWhatsAppUpdate = order => {
    let phone = String(order.whatsappNumber || order.mobile || '').replace(/\D/g, '');
    if (phone.length === 10) phone = `91${phone}`;
    if (phone.length !== 12 || !phone.startsWith('91')) {
      alert('Customer mobile number is invalid. Please check the order mobile number.');
      return;
    }
    let items = [];
    try { items = JSON.parse(order.items || '[]'); } catch { items = []; }
    const itemLines = items.map(item => `• ${item.name} × ${item.quantity}`).join('\n');
    const discountSaved = items.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0);
    const message = [
      `Hello ${order.customerName || 'there'}! 😊`,
      '',
      `Your Art For You order #${order.id} is ready!`,
      itemLines ? `Order items:\n${itemLines}` : '',
      '',
      `Product total: ₹${Number(order.totalAmount || 0)}`,
      discountSaved ? `Discount saved: ₹${discountSaved}` : '',
      `Delivery charges: ₹${Number(order.deliveryCharge || 0)}`,
      '',
      'We have uploaded photos of your prepared order. Please open the My Orders section on our website to view the photos and complete the delivery payment.',
      '',
      'Thank you for shopping with Art For You! ❤️'
    ].filter(Boolean).join('\n');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const uploadPhotos = async (id, form) => {
    const data = new FormData(form);
    if (!data.getAll('files').some(f => f.size)) { alert('Select at least one photo.'); return; }
    markBusy(id, 'photos');
    try { await request(`${API}/orders/${id}/prepared-photos`, { method: 'POST', body: data }); alert('Prepared order photos uploaded.'); await refresh(); form.reset(); }
    catch (e) { alert(e.message); } finally { markBusy(id, ''); }
  };
  const saveTracking = async (id, form) => {
    const data = new FormData(form);
    const trackingId = String(data.get('trackingId') || '').trim();
    const trackingUrl = String(data.get('trackingUrl') || INDIA_POST).trim();
    if (!trackingId) { alert('Enter the India Post tracking ID.'); return; }
    markBusy(id, 'tracking');
    try { await request(`${API}/orders/${id}/tracking`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trackingId, trackingUrl }) }); updateOrder(id, { trackingId, trackingUrl }); alert('Tracking details saved.'); }
    catch (e) { alert(e.message); } finally { markBusy(id, ''); }
  };

  const addProduct = async form => {
    const data = new FormData(form);
    if (!data.getAll('files').some(file => file.size)) { alert('Choose at least one product photo.'); return; }
    markBusy('new-product', 'saving');
    try { await request(`${API}/products/admin`, { method: 'POST', body: data }); alert('Product added. It will now appear in the customer shop.'); form.reset(); await refreshProducts(); }
    catch (e) { alert(e.message); } finally { markBusy('new-product', ''); }
  };
  const saveProduct = async (id, form) => {
    const data = new FormData(form);
    const body = { name: data.get('name'), collection: data.get('collection'), category: data.get('category'), price: Number(data.get('price')), discountPercentage: Number(data.get('discountPercentage') || 0), description: data.get('description') };
    try { await request(`${API}/products/admin/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); alert('Product updated.'); await refreshProducts(); }
    catch (e) { alert(e.message); }
  };
  const toggleProduct = async product => {
    try { await request(`${API}/products/admin/${product.id}/active`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !product.active }) }); await refreshProducts(); }
    catch (e) { alert(e.message); }
  };

  const addCollection = async form => {
    const data = new FormData(form);
    markBusy('new-collection', 'saving');
    try { await request(`${API}/collections/admin`, { method: 'POST', body: data }); alert('New collection created. It is now available in the customer shop.'); form.reset(); await refreshCollections(); }
    catch (e) { alert(e.message); } finally { markBusy('new-collection', ''); }
  };
  const toggleCollection = async collection => {
    try { await request(`${API}/collections/admin/${collection.slug}/active`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !collection.active }) }); await refreshCollections(); }
    catch (e) { alert(e.message); }
  };
  const saveCollection = async (slug, form) => {
    const data = new FormData(form);
    try { await request(`${API}/collections/admin/${slug}`, { method: 'PUT', body: data }); alert('Collection updated.'); await refreshCollections(); }
    catch (e) { alert(e.message); }
  };

  const logout = async () => { try { await fetch(`${API}/admin/logout`, { method: 'POST', credentials: 'include' }); } finally { navigate('/admin-login'); } };

  if (loading) return <main className="admin-orders"><h2>Loading orders…</h2></main>;
  return <main className="admin-orders">
    <div className="admin-header"><div><p className="eyebrow">ART FOR YOU · CONTROL CENTRE</p><h1>Order Management</h1><p>Manage preparation, payments and dispatch in one place.</p></div><button onClick={logout}>Logout</button></div>
    {error && <p className="error">{error}</p>}
    <section className="admin-products-panel">
      <h2>Collection management</h2><p>Create a new collection here. Active collections automatically appear on the customer website.</p>
      <form className="admin-product-form" onSubmit={e => { e.preventDefault(); addCollection(e.currentTarget); }}>
        <input name="title" placeholder="Collection name (e.g. Return Gifts)" required />
        <input name="slug" placeholder="Unique slug (e.g. return-gifts)" pattern="[A-Za-z0-9-]+" required />
        <input name="sortOrder" type="number" min="0" placeholder="Display order (0 first)" />
        <input name="description" placeholder="Short description (optional)" />
        <label>Collection cover image <input type="file" name="image" accept="image/jpeg,image/png,image/webp" /></label>
        <button disabled={busy['new-collection'] === 'saving'}>{busy['new-collection'] === 'saving' ? 'Creating…' : 'Create collection'}</button>
      </form>
      <div className="admin-product-list">{adminCollections.map(collection => <article key={collection.slug}>
        <div><strong>{collection.title}</strong><small>/{collection.slug} · {collection.active ? 'Visible to customers' : 'Hidden from customers'}</small></div>
        <form onSubmit={e => { e.preventDefault(); saveCollection(collection.slug, e.currentTarget); }}>
          <input name="title" aria-label="Collection title" defaultValue={collection.title} required />
          <input name="sortOrder" aria-label="Display order" type="number" min="0" defaultValue={collection.sortOrder || 0} />
          <input name="description" aria-label="Description" defaultValue={collection.description || ''} />
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" />
          <button>Save collection</button><button type="button" className="danger-button" onClick={() => toggleCollection(collection)}>{collection.active ? 'Hide' : 'Show'}</button>
        </form>
      </article>)}</div>
    </section>
    <section className="admin-products-panel">
      <h2>Product catalogue</h2><p>Add products here. Uploaded photos and product details appear automatically in the customer shop.</p>
      <form className="admin-product-form" onSubmit={e => { e.preventDefault(); addProduct(e.currentTarget); }}>
        <input name="name" placeholder="Product name" required />
        <select name="collection" required defaultValue=""><option value="" disabled>Select collection</option>{adminCollections.filter(c => c.active).map(c => <option key={c.slug} value={c.slug}>{c.title}</option>)}</select>
        <input name="category" placeholder="Category" required />
        <input name="price" type="number" min="0" placeholder="Actual price in ₹" required />
        <label>Discount percentage (0–5%) <select name="discountPercentage" defaultValue="5"><option value="0">No discount</option><option value="5">5% discount</option></select></label>
        <textarea name="description" placeholder="Product description" rows="2" />
        <label>Product photos (multiple) <input type="file" name="files" accept="image/jpeg,image/png,image/webp" multiple required /></label>
        <button disabled={busy['new-product'] === 'saving'}>{busy['new-product'] === 'saving' ? 'Saving…' : 'Add product to website'}</button>
      </form>
      <div className="admin-product-list">{adminProducts.map(product => <article key={product.id}>
        <div><strong>#{product.id} · {product.name}</strong><small>{product.active ? 'Visible in shop' : 'Hidden from shop'}</small></div>
        <form onSubmit={e => { e.preventDefault(); saveProduct(product.id, e.currentTarget); }}>
          <input name="name" aria-label="Product name" defaultValue={product.name} required />
          <input name="collection" aria-label="Collection slug" defaultValue={product.collection} required />
          <input name="category" aria-label="Category" defaultValue={product.category} required />
          <input name="price" aria-label="Price" type="number" min="0" defaultValue={product.price} required />
          <label>Discount % <select name="discountPercentage" defaultValue={product.discountPercentage ?? 5}><option value="0">0%</option><option value="5">5%</option></select></label>
          <input name="description" aria-label="Description" defaultValue={product.description || ''} />
          <button>Save changes</button><button type="button" className="danger-button" onClick={() => toggleProduct(product)}>{product.active ? 'Hide' : 'Show'}</button>
        </form>
      </article>)}</div>
    </section>
    <section className="admin-products-panel"><h2>Find an order</h2><input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Search by order ID, customer name, mobile, WhatsApp or Instagram" /></section>
    {!(orders.filter(order => `${order.id} ${order.customerName || ''} ${order.mobile || ''} ${order.whatsappNumber || ''} ${order.instagramId || ''}`.toLowerCase().includes(orderSearch.toLowerCase())).length) && !error ? <p>No matching customer orders.</p> : orders.filter(order => `${order.id} ${order.customerName || ''} ${order.mobile || ''} ${order.whatsappNumber || ''} ${order.instagramId || ''}`.toLowerCase().includes(orderSearch.toLowerCase())).map(order => {
      let items = []; try { items = JSON.parse(order.items || '[]'); } catch { items = []; }
      return <article className="admin-order-card" key={order.id}>
        <div className="admin-card-top"><div><p className="eyebrow">ORDER #{order.id}</p><h2>{order.customerName}</h2><p>Mobile: {order.mobile}</p><p>WhatsApp: {order.whatsappNumber || order.mobile}</p><p>Instagram: {order.instagramId || "Not provided"}</p><p>Payment: {order.paymentStatus || "NOT_SUBMITTED"}{order.razorpayPaymentId ? ` · Razorpay ${order.razorpayPaymentId}` : ""}</p></div><span className="status-chip">{(order.status || 'PENDING').replaceAll('_', ' ')}</span></div>
        <p><b>Delivery address:</b> {order.address}, {order.city}, {order.state} – {order.pincode}</p>
        <p><b>Items:</b> {items.map(item => `${item.name} × ${item.quantity} — ₹${item.discountedSubtotal ?? item.subtotal}${item.discountAmount ? ` (discount ₹${item.discountAmount})` : ''}`).join(' · ') || '—'}</p>
        <div className="admin-metrics"><span>Discounted product total<strong>₹{order.totalAmount}</strong></span><span>Discount saved<strong>₹{items.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0)}</strong></span><span>Delivery charge<strong>{order.deliveryCharge == null ? 'Not set' : `₹${order.deliveryCharge}`}</strong></span><span>Created<strong>{order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : '—'}</strong></span></div>
        <section className="admin-subpanel"><h3>Product payment</h3><p>Status: <b>{order.paymentStatus || 'NOT_SUBMITTED'}</b></p><p>Transaction ID: {order.paymentTransactionId || 'Not submitted'}</p>{order.paymentScreenshotPath && <img className="admin-proof" src={`${API}/orders/${order.id}/payment-proof`} alt="Product payment proof"/>}{order.paymentStatus === 'SUBMITTED' && <div className="admin-actions"><button onClick={() => updatePayment(order.id, 'VERIFIED')}>Verify payment</button><button className="danger-button" onClick={() => updatePayment(order.id, 'REJECTED')}>Reject</button></div>}</section>
        <section className="admin-subpanel"><h3>Order preparation</h3><form onSubmit={e => { e.preventDefault(); uploadPhotos(order.id, e.currentTarget); }}><label>Upload completed-order photos (multiple allowed)<input type="file" name="files" accept="image/jpeg,image/png,image/webp" multiple/></label><button disabled={busy[order.id] === 'photos'}>{busy[order.id] === 'photos' ? 'Uploading…' : 'Upload photos for customer'}</button></form></section>
        <section className="admin-subpanel"><h3>Delivery payment</h3><p>Payment status: <b>{order.deliveryPaymentStatus || 'NOT_REQUESTED'}</b></p><form className="admin-inline-form" onSubmit={e => { e.preventDefault(); saveDeliveryCharge(order.id, e.currentTarget); }}><label>Delivery charge (₹)<input type="number" name="deliveryCharge" min="0" required defaultValue={order.deliveryCharge ?? ''} placeholder="Enter delivery amount"/></label><button disabled={busy[order.id] === 'delivery'}>Save / request delivery payment</button></form>{order.deliveryCharge != null && order.preparedPhotos && <div className="admin-actions"><button type="button" className="whatsapp-update-button" onClick={() => openWhatsAppUpdate(order)}>Send WhatsApp Update</button></div>}<p>Customer transaction ID: {order.deliveryPaymentTransactionId || 'Not submitted'}</p>{order.deliveryPaymentScreenshotPath && <img className="admin-proof" src={`${API}/orders/${order.id}/delivery-payment-proof`} alt="Delivery payment proof"/>}{order.deliveryPaymentStatus === 'SUBMITTED' && <div className="admin-actions"><button onClick={() => updatePayment(order.id, 'VERIFIED', true)}>Verify delivery payment</button><button className="danger-button" onClick={() => updatePayment(order.id, 'REJECTED', true)}>Reject delivery payment</button></div>}</section>
        <section className="admin-subpanel"><h3>Dispatch & tracking</h3><form className="admin-inline-form" onSubmit={e => { e.preventDefault(); saveTracking(order.id, e.currentTarget); }}><label>India Post tracking ID<input name="trackingId" defaultValue={order.trackingId || ''} placeholder="Consignment number"/></label><label>Tracking page URL<input name="trackingUrl" defaultValue={order.trackingUrl || INDIA_POST}/></label><button disabled={busy[order.id] === 'tracking'}>Save tracking</button></form>{order.trackingId && <p>Tracking: <a href={order.trackingUrl || INDIA_POST} target="_blank" rel="noreferrer">{order.trackingId} · Open India Post</a></p>}</section>
        {order.changeRequest && <section className="admin-subpanel"><h3>Customer change request</h3><p>{order.changeRequest}</p><p>Current status: <b>{order.changeRequestStatus || 'SUBMITTED'}</b></p><form className="admin-inline-form" onSubmit={async e => { e.preventDefault(); const data = new FormData(e.currentTarget); try { const result = await request(`${API}/orders/${order.id}/change-request`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: data.get('status'), extraWorkCharge: Number(data.get('extraWorkCharge') || 0) }) }); updateOrder(order.id, { changeRequestStatus: result.changeRequestStatus, extraWorkCharge: result.extraWorkCharge }); alert('Change request updated.'); } catch (err) { alert(err.message); } }}><label>Status<select name="status" defaultValue={order.changeRequestStatus || 'SUBMITTED'}><option value="REVIEWING">Reviewing</option><option value="APPROVED">Approved</option><option value="DECLINED">Declined</option><option value="COMPLETED">Completed</option></select></label><label>Extra customization charge (₹)<input type="number" name="extraWorkCharge" min="0" defaultValue={order.extraWorkCharge || 0}/></label><button>Save change request</button></form></section>}{order.changeRequest && <section className="admin-subpanel"><p>Extra work charge is recorded for customer coordination; it is not automatically collected through Razorpay in this version.</p></section>}<section className="admin-subpanel"><h3>Order progress</h3><label>Update status<select value={order.status || 'PENDING'} onChange={e => updateStatus(order.id, e.target.value)}>{STATUSES.map(status => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>{order.receivedAt && <p>Customer confirmed receipt: {new Date(order.receivedAt).toLocaleString('en-IN')}</p>}</section>
      </article>;
    })}
  </main>;
}
