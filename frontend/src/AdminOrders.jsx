
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin Logout
  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8080/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      });

      navigate('/admin-login');
    } catch (error) {
      alert('Logout failed. Please try again.');
    }
  };

  // Update Order Status
  const updateStatus = async (orderId, status) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ status })
        }
      );

      if (!response.ok) {
        alert('Unable to update order status');
        return;
      }

      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status } : order
        )
      );

      alert('Order status updated successfully!');
    } catch (error) {
      alert('Server connection failed');
    }
  };

  // Save Tracking ID
  const saveTrackingId = async (orderId, trackingId) => {
    if (!trackingId.trim()) {
      alert('Please enter Tracking ID');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8080/api/orders/${orderId}/tracking`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ trackingId })
        }
      );

      if (!response.ok) {
        alert('Unable to save Tracking ID');
        return;
      }

      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? { ...order, trackingId }
            : order
        )
      );

      alert('Tracking ID saved successfully!');
    } catch (error) {
      alert('Server connection failed');
    }
  };

  // Verify or Reject Payment
  const updatePaymentStatus = async (orderId, paymentStatus) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/orders/${orderId}/payment-status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ paymentStatus })
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        alert(result.message || 'Unable to update payment status');
        return;
      }

      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? { ...order, paymentStatus }
            : order
        )
      );

      alert(`Payment ${paymentStatus.toLowerCase()} successfully!`);
    } catch (error) {
      alert('Server connection failed');
    }
  };

  // Load Orders
  useEffect(() => {
    fetch('http://localhost:8080/api/orders', {
      credentials: 'include'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load orders');
        }
        return response.json();
      })
      .then(data => setOrders(data))
      .catch(error => alert(error.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <h2>Loading orders...</h2>;
  }

  return (
    <div className="admin-orders">

      <div className="admin-header">
        <h1>Admin Orders</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        orders.map(order => (
          <div className="admin-order-card" key={order.id}>

            <h3>Order #{order.id}</h3>

            <p><b>Customer:</b> {order.customerName}</p>
            <p><b>Mobile:</b> {order.mobile}</p>

            <p>
              <b>Address:</b> {order.address}, {order.city}, {order.state} - {order.pincode}
            </p>

            <p>
              <b>Items:</b>{' '}
              {JSON.parse(order.items).map(item =>
                `${item.name} x ${item.quantity}`
              ).join(', ')}
            </p>

            <p><b>Total:</b> ₹{order.totalAmount}</p>
            <p><b>Advance:</b> ₹{order.advanceAmount}</p>

            {/* Payment Details */}
            <div className="payment-details">
              <h4>Payment Details</h4>

              <p>
                <b>Payment Status:</b>{' '}
                {order.paymentStatus || 'NOT SUBMITTED'}
              </p>

              <p>
                <b>Transaction ID:</b>{' '}
                {order.paymentTransactionId || 'Not uploaded'}
              </p>

              {order.paymentScreenshotPath && (
                <div>
                  <p><b>Payment Screenshot:</b></p>

                  <img
                    src={`http://localhost:8080/api/orders/${order.id}/payment-proof`}
                    alt="Customer Payment Screenshot"
                    style={{
                      width: '250px',
                      maxWidth: '100%',
                      border: '1px solid #ddd',
                      borderRadius: '8px'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Payment Verification Buttons */}
            {order.paymentStatus === 'SUBMITTED' && (
              <div className="payment-actions">

                <button
                  type="button"
                  onClick={() =>
                    updatePaymentStatus(order.id, 'VERIFIED')
                  }
                >
                  Verify Payment
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updatePaymentStatus(order.id, 'REJECTED')
                  }
                >
                  Reject Payment
                </button>

              </div>
            )}

            {/* Order Status */}
            <p>
              <b>Status:</b>

              <select
                value={order.status}
                onChange={e =>
                  updateStatus(order.id, e.target.value)
                }
              >
                <option value="PENDING">PENDING</option>
                <option value="DELIVERED">DELIVERED</option>
              </select>
            </p>

            {/* Tracking ID */}
            <form onSubmit={e => {
              e.preventDefault();

              const trackingId =
                new FormData(e.currentTarget).get('trackingId');

              saveTrackingId(order.id, trackingId);
            }}>
              <p><b>India Post Tracking ID:</b></p>

              <input
                type="text"
                name="trackingId"
                placeholder="Enter Tracking ID"
                defaultValue={order.trackingId || ''}
              />

              <button type="submit">Save Tracking ID</button>
            </form>

            {order.trackingId && (
              <p>
                <a href="https://www.indiapost.gov.in">
                  Track Parcel on India Post
                </a>
              </p>
            )}

            <p>
              <b>Date:</b>{' '}
              {new Date(order.createdAt).toLocaleString()}
            </p>

          </div>
        ))
      )}

    </div>
  );
}

export default AdminOrders;
