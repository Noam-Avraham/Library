const BASE = '/api';

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Books
  getBooks: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    return request(`/books?${params}`);
  },
  addBook: (data) => request('/books', { method: 'POST', body: JSON.stringify(data) }),
  updateBook: (id, data) => request(`/books/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBook: (id) => request(`/books/${id}`, { method: 'DELETE' }),
  transferBook: (id, data) => request(`/books/${id}/transfer`, { method: 'POST', body: JSON.stringify(data) }),

  // Unified book search (NLI + Google)
  searchBooks: (q) => request(`/search?q=${encodeURIComponent(q)}`),

  // Stats
  getStats: () => request('/stats'),

  // Shelf scanner
  scanShelf: (imageBase64, mediaType) =>
    request('/scan-shelf', { method: 'POST', body: JSON.stringify({ imageBase64, mediaType }) }),

  // Reviews
  getReviews: (bookId) => request(`/reviews?book_id=${bookId}`),
  getReviewsSummary: () => request('/reviews/summary'),
  saveReview: (data) => request('/reviews', { method: 'POST', body: JSON.stringify(data) }),
  deleteReview: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),

  // Next book recommendation
  getNextBook: (userName, mode = 'library') => request(`/next-book?user_name=${encodeURIComponent(userName)}&mode=${mode}`),
  addToWishlist: (title, author) => request('/books', { method: 'POST', body: JSON.stringify({ title, author, status: 'רשימת משאלות', owner: '', current_holder: '', location: 'רשימת משאלות' }) }),

  // Locations
  getLocations: () => request('/locations'),

  // Family
  getFamily: () => request('/family'),
  addFamilyMember: (name) => request('/family', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteFamilyMember: (id) => request(`/family/${id}`, { method: 'DELETE' }),
};
