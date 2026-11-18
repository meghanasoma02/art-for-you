const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
async function request(path) {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}
export const getCollections = () => request('/collections');
export const getProducts = (collection = '') => request(`/products${collection ? `?collection=${encodeURIComponent(collection)}` : ''}`);
