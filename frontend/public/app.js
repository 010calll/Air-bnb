const app = document.querySelector('#app')
const savedUser = localStorage.getItem('currentUser')
let currentUser = savedUser ? JSON.parse(savedUser) : null
let listings = []
let notice = ''
let activeAdminTab = 'overview'
let activeHostTab = 'listings'
let activeClientTab = 'reservations'

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])

const money = (value) => `${Number(value || 0).toFixed(2)} DH`
const imageUrl = (value) => escapeHtml(value || '/images/logo.png')
const userId = () => currentUser?.id

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `Erreur ${response.status}`)
  }

  return response.status === 204 ? null : response.json()
}

const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (url, body) => request(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
}

function navigate(path) {
  history.pushState({}, '', path)
  notice = ''
  render()
  window.scrollTo(0, 0)
}

function routeLink(path, label, className = '') {
  return `<a class="${className}" href="${escapeHtml(path)}">${label}</a>`
}

function header() {
  const profileLink = currentUser?.isAdmin
    ? '/admin'
    : currentUser?.role === 'host'
      ? '/host'
      : '/client'

  return `
    <header class="site-header">
      <a class="brand" href="/" aria-label="MAISON — Accueil">
        <img src="/images/logo.png" alt="" />
        <span>MAISON</span>
      </a>
      <form class="header-search" id="header-search">
        <input name="city" aria-label="Rechercher une ville" placeholder="Où allez-vous ?" />
        <button class="search-icon" aria-label="Rechercher" type="submit">⌕</button>
      </form>
      <nav class="header-nav">
        ${currentUser
          ? `${routeLink(profileLink, escapeHtml(currentUser.name), 'nav-profile')}<button class="button button-outline" data-action="logout">Déconnexion</button>`
          : `${routeLink('/login', 'Connexion', 'nav-profile')}${routeLink('/register', 'Inscription', 'button button-primary')}`}
      </nav>
    </header>`
}

function footer() {
  return `
    <footer class="site-footer">
      <div class="footer-grid">
        <div><h3>MAISON</h3><p>Votre plateforme pour trouver une maison et préparer votre prochain séjour au Maroc.</p></div>
        <div><h4>Découvrir</h4>${routeLink('/', 'Accueil')}${routeLink('/search', 'Logements')}</div>
        <div><h4>Votre compte</h4>${routeLink('/login', 'Connexion')}${routeLink('/register', 'Créer un compte')}</div>
        <div><h4>Besoin d’aide ?</h4><p>Parcourez nos logements et contactez votre hôte lors de votre réservation.</p></div>
      </div>
      <div class="footer-bottom">© 2025 MAISON. Tous droits réservés.</div>
    </footer>`
}

function listingCard(listing) {
  const id = Number(listing.id)
  const image = listing.image || listing.images?.[0]
  return `
    <article class="listing-card">
      <a class="listing-image" href="/listing/${id}">
        <img src="${imageUrl(image)}" alt="${escapeHtml(listing.title)}" loading="lazy"
          onerror="this.src='/images/logo.png'" />
        <span class="rating">★ ${escapeHtml(listing.rating ?? '0')}</span>
      </a>
      <div class="listing-content">
        <a class="listing-title" href="/listing/${id}">${escapeHtml(listing.title)}</a>
        <p class="muted">${escapeHtml(listing.city)}</p>
        <p class="listing-description">${escapeHtml(listing.description)}</p>
        <p class="listing-amenities">🛏 ${escapeHtml(listing.beds ?? 1)} lit(s) <span>·</span> 🚿 ${escapeHtml(listing.baths ?? 1)} salle(s)</p>
        <div class="listing-actions">
          <strong>${money(listing.price)} <small>/ nuit</small></strong>
          ${routeLink(`/listing/${id}`, 'Voir', 'button button-outline')}
        </div>
      </div>
    </article>`
}

function listingGrid(items) {
  return items.length
    ? `<div class="listing-grid">${items.map(listingCard).join('')}</div>`
    : '<div class="empty-state"><h3>Aucun logement trouvé</h3><p>Essayez de modifier les filtres ou revenez plus tard.</p></div>'
}

function homePage() {
  const params = new URLSearchParams(location.search)
  const city = params.get('city') || ''
  const shown = listings.filter((listing) =>
    !city || listing.city.toLowerCase().includes(city.toLowerCase()),
  )

  return `
    <section class="hero">
      <div class="hero-inner">
        <span class="eyebrow">BIENVENUE CHEZ MAISON</span>
        <h1>Votre prochain séjour<br />commence ici.</h1>
        <p>Découvrez des logements uniques et profitez du Maroc à votre rythme.</p>
        <form class="search-panel" id="home-search">
          <label>Destination<input name="city" placeholder="Ex. Marrakech" value="${escapeHtml(city)}" /></label>
          <label>Prix minimum<input name="minPrice" type="number" min="0" placeholder="0" /></label>
          <label>Prix maximum<input name="maxPrice" type="number" min="0" placeholder="5000" /></label>
          <button class="button button-primary" type="submit">Rechercher</button>
        </form>
      </div>
    </section>
    <section class="section">
      <div class="section-heading"><div><span class="eyebrow">SÉLECTION MAISON</span><h2>Des logements à découvrir</h2></div>${routeLink('/search', 'Voir tout →', 'text-link')}</div>
      ${listingGrid(shown.slice(0, 6))}
    </section>`
}

function searchPage() {
  const params = new URLSearchParams(location.search)
  const city = params.get('city') || ''
  const minimum = Number(params.get('minPrice') || 0)
  const maximum = Number(params.get('maxPrice') || 5000)
  const results = listings.filter((listing) =>
    (!city || listing.city.toLowerCase().includes(city.toLowerCase()))
    && Number(listing.price) >= minimum
    && Number(listing.price) <= maximum,
  )

  return `
    <section class="section">
      <span class="eyebrow">TROUVEZ VOTRE SÉJOUR</span>
      <h1 class="page-title">Logements à découvrir</h1>
      <form class="filters-panel" id="search-filters">
        <label>Ville<input name="city" value="${escapeHtml(city)}" placeholder="Toutes les villes" /></label>
        <label>Prix minimum (DH)<input name="minPrice" type="number" min="0" value="${minimum}" /></label>
        <label>Prix maximum (DH)<input name="maxPrice" type="number" min="0" value="${maximum}" /></label>
        <button class="button button-primary" type="submit">Appliquer</button>
      </form>
      <p class="muted result-count">${results.length} logement(s)</p>
      ${listingGrid(results)}
    </section>`
}

async function listingDetailsPage(id) {
  const listing = listings.find((item) => Number(item.id) === Number(id))
  if (!listing) return '<section class="section empty-state"><h1>Logement introuvable</h1><a href="/">Retour à l’accueil</a></section>'
  const photos = [listing.image, ...(Array.isArray(listing.images) ? listing.images : [])].filter(Boolean)
  const reviews = await api.get(`/api/reviews/listing/${id}`).catch(() => [])

  return `
    <section class="section detail-section">
      <a class="text-link" href="/">← Retour aux logements</a>
      <div class="detail-heading"><div><span class="eyebrow">${escapeHtml(listing.city)}</span><h1>${escapeHtml(listing.title)}</h1><p class="muted">★ ${escapeHtml(listing.rating ?? '0')} · ${escapeHtml(listing.city)}</p></div>
        <button class="button button-outline" data-action="report" data-id="${Number(id)}">Signaler</button>
      </div>
      <div class="photo-grid">
        ${photos.slice(0, 5).map((photo) => `<img src="${imageUrl(photo)}" alt="${escapeHtml(listing.title)}" onerror="this.src='/images/logo.png'" />`).join('')}
      </div>
      <div class="detail-layout">
        <div>
          <h2>À propos de ce logement</h2>
          <p>${escapeHtml(listing.description)}</p>
          <div class="feature-list"><span>🛏 ${escapeHtml(listing.beds ?? 1)} lits</span><span>🚿 ${escapeHtml(listing.baths ?? 1)} salles de bain</span><span>🍳 ${escapeHtml(listing.kitchens ?? 1)} cuisine(s)</span><span>🛋 ${escapeHtml(listing.salons ?? 1)} salon(s)</span></div>
          <h2 class="subheading">Avis des voyageurs</h2>
          ${reviews.length ? reviews.map((review) => `<article class="review"><strong>${escapeHtml(review.user_name || 'Voyageur')} · ★ ${escapeHtml(review.rating)}</strong><p>${escapeHtml(review.comment)}</p></article>`).join('') : '<p class="muted">Pas encore d’avis pour ce logement.</p>'}
          ${currentUser ? `<form class="form-card review-form" id="review-form" data-id="${Number(id)}"><h3>Laisser un avis</h3><label>Note<select name="rating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label><label>Votre commentaire<textarea name="comment" minlength="10" required></textarea></label><button class="button button-primary">Envoyer</button></form>` : ''}
        </div>
        <aside class="booking-card"><p class="price">${money(listing.price)} <small>/ nuit</small></p><p>★ ${escapeHtml(listing.rating ?? '0')} · Réservation simple et rapide</p>${routeLink(`/booking/${id}`, 'Réserver ce logement', 'button button-primary button-wide')}</aside>
      </div>
    </section>`
}

function loginPage() {
  return `
    <section class="auth-wrap"><form class="form-card auth-card" id="login-form">
      <img class="auth-logo" src="/images/logo.png" alt="MAISON" />
      <span class="eyebrow">RAVI DE VOUS REVOIR</span><h1>Connexion</h1>
      <div class="form-message" aria-live="polite"></div>
      <label>Email<input name="email" type="email" required autocomplete="email" /></label>
      <label>Mot de passe<input name="password" type="password" required autocomplete="current-password" /></label>
      <button class="button button-primary button-wide">Se connecter</button>
      <p class="form-footnote">Vous n’avez pas de compte ? ${routeLink('/register', 'Inscrivez-vous')}</p>
    </form></section>`
}

function registerPage() {
  return `
    <section class="auth-wrap"><form class="form-card auth-card" id="register-form">
      <img class="auth-logo" src="/images/logo.png" alt="MAISON" />
      <span class="eyebrow">REJOIGNEZ MAISON</span><h1>Créer un compte</h1>
      <div class="form-message" aria-live="polite"></div>
      <label>Nom complet<input name="name" required autocomplete="name" /></label>
      <label>Email<input name="email" type="email" required autocomplete="email" /></label>
      <label>Téléphone<input name="phone" required autocomplete="tel" /></label>
      <label>Ville<select name="city" required><option value="">Choisir une ville</option>${['Casablanca','Rabat','Marrakech','Fès','Tanger','Agadir','Meknès','Oujda','Essaouira','Chefchaouen','Tétouan','Nador','El Jadida','Beni Mellal','Kénitra','Safi'].map((city) => `<option>${city}</option>`).join('')}</select></label>
      <label>Type de compte<select name="role"><option value="client">Client</option><option value="host">Hôte</option></select></label>
      <div class="host-fields hidden"><label>CIN<input name="cin" /></label><label>Adresse<input name="address" /></label><label>À propos de vous<textarea name="description"></textarea></label></div>
      <label>Mot de passe<input name="password" type="password" required minlength="6" autocomplete="new-password" /></label>
      <label>Confirmer le mot de passe<input name="confirmPassword" type="password" required minlength="6" autocomplete="new-password" /></label>
      <button class="button button-primary button-wide">Créer mon compte</button>
      <p class="form-footnote">Vous avez déjà un compte ? ${routeLink('/login', 'Connectez-vous')}</p>
    </form></section>`
}

function bookingPage(id) {
  if (!currentUser) return loginPage()
  const listing = listings.find((item) => Number(item.id) === Number(id))
  if (!listing) return '<section class="section empty-state"><h1>Logement introuvable</h1></section>'

  return `
    <section class="section narrow-section">
      <a class="text-link" href="/listing/${Number(id)}">← Retour au logement</a>
      <h1 class="page-title">Confirmer votre réservation</h1>
      <form class="form-card" id="booking-form" data-id="${Number(id)}">
        <div class="booking-summary"><img src="${imageUrl(listing.image)}" alt="${escapeHtml(listing.title)}" onerror="this.src='/images/logo.png'" /><div><strong>${escapeHtml(listing.title)}</strong><p>${escapeHtml(listing.city)} · ${money(listing.price)} / nuit</p></div></div>
        <div class="form-grid"><label>Arrivée<input name="checkInDate" type="date" required /></label><label>Départ<input name="checkOutDate" type="date" required /></label></div>
        <label>Nombre de voyageurs<input name="guests" type="number" min="1" value="1" required /></label>
        <label>Téléphone<input name="guestPhone" value="${escapeHtml(currentUser.phone || '')}" required /></label>
        <label>Moyen de paiement<select name="paymentMethod"><option value="cash">Espèces</option><option value="card">Carte bancaire</option></select></label>
        <label>Note pour l’hôte<textarea name="guestNotes"></textarea></label>
        <button class="button button-primary button-wide">Confirmer la réservation</button>
      </form>
    </section>`
}

function statusLabel(status = 'pending') {
  const labels = { pending: 'En attente', approved: 'Approuvée', accepted: 'Acceptée', paid: 'Payée', rejected: 'Refusée', refused: 'Refusée', cancelled: 'Annulée', active: 'Actif', blocked: 'Bloqué' }
  return labels[status] || status
}

function statusBadge(status) {
  return `<span class="status status-${escapeHtml(status || 'pending')}">${escapeHtml(statusLabel(status))}</span>`
}

function hostListingForm(listing = {}) {
  return `
    <form class="form-card listing-form" id="host-listing-form" data-id="${listing.id || ''}">
      <h2>${listing.id ? 'Modifier le logement' : 'Ajouter un logement'}</h2>
      <div class="form-grid"><label>Titre<input name="title" value="${escapeHtml(listing.title || '')}" required /></label><label>Ville<input name="city" value="${escapeHtml(listing.city || currentUser.city || '')}" required /></label></div>
      <div class="form-grid"><label>Prix par nuit (DH)<input name="price" type="number" min="1" value="${escapeHtml(listing.price || '')}" required /></label><label>Adresse<input name="address" value="${escapeHtml(listing.address || currentUser.address || '')}" /></label></div>
      <div class="form-grid"><label>Chambres<input name="beds" type="number" min="1" value="${escapeHtml(listing.beds ?? 1)}" required /></label><label>Salles de bain<input name="baths" type="number" min="1" value="${escapeHtml(listing.baths ?? 1)}" required /></label></div>
      <div class="form-grid"><label>Cuisines<input name="kitchens" type="number" min="1" value="${escapeHtml(listing.kitchens ?? 1)}" /></label><label>Salons<input name="salons" type="number" min="1" value="${escapeHtml(listing.salons ?? 1)}" /></label></div>
      <label>Image principale (URL)<input name="image" value="${escapeHtml(listing.image || '')}" placeholder="https://…" /></label>
      <label>Ou choisir une image principale<input name="primaryImage" type="file" accept="image/*" /></label>
      <label>Autres images (URL séparées par des virgules)<textarea name="images">${escapeHtml((listing.images || []).join(', '))}</textarea></label>
      <label>Ou choisir plusieurs images (4 maximum, 2 Mo par image)<input name="galleryImages" type="file" accept="image/*" multiple /></label>
      <label>Description<textarea name="description" required>${escapeHtml(listing.description || '')}</textarea></label>
      <div class="form-actions"><button class="button button-primary">${listing.id ? 'Enregistrer' : 'Envoyer pour validation'}</button>${listing.id ? '<button class="button button-outline" type="button" data-action="cancel-edit">Annuler</button>' : ''}</div>
    </form>`
}

async function hostPage() {
  if (!currentUser || currentUser.role !== 'host') return '<section class="section empty-state"><h1>Accès réservé aux hôtes</h1><a href="/login">Se connecter</a></section>'
  const owned = await api.get(`/api/listings/owner/${userId()}`)
  const bookings = await api.get(`/api/bookings/owner/${userId()}`)
  const listingsContent = `
    <div class="dashboard-grid">
      <div>${hostListingForm()}<h2 class="subheading">Mes logements</h2>
        ${owned.length ? owned.map((listing) => `<article class="dashboard-row"><img src="${imageUrl(listing.image)}" alt="" onerror="this.src='/images/logo.png'" /><div class="row-main"><strong>${escapeHtml(listing.title)}</strong><span>${escapeHtml(listing.city)} · ${money(listing.price)} / nuit</span></div>${statusBadge(listing.status)}<button class="button button-outline" data-action="edit-listing" data-id="${Number(listing.id)}">Modifier</button><button class="button button-danger" data-action="delete-listing" data-id="${Number(listing.id)}">Supprimer</button></article>`).join('') : '<p class="muted">Vous n’avez pas encore publié de logement.</p>'}
      </div>
    </div>`
  const bookingContent = bookings.length
    ? bookings.map((booking) => `<article class="dashboard-row"><div class="row-main"><strong>${escapeHtml(booking.listing_title || 'Logement')} · réservation #${Number(booking.id)}</strong><span>${escapeHtml(booking.check_in_date)} → ${escapeHtml(booking.check_out_date)} · ${money(booking.total_price)}</span></div>${statusBadge(booking.status)}<span>${escapeHtml(booking.user_id)}</span></article>`).join('')
    : '<p class="muted">Aucune réservation pour le moment.</p>'
  const revenue = bookings.reduce((sum, item) => sum + Number(item.total_price || 0), 0)

  return `
    <section class="section dashboard">
      <span class="eyebrow">ESPACE HÔTE</span><h1 class="page-title">Bonjour ${escapeHtml(currentUser.name)}</h1>
      <div class="stats-grid"><div class="stat-card"><span>Logements</span><strong>${owned.length}</strong></div><div class="stat-card"><span>Réservations</span><strong>${bookings.length}</strong></div><div class="stat-card"><span>Revenus réservés</span><strong>${money(revenue)}</strong></div></div>
      <div class="tab-bar"><button class="${activeHostTab === 'listings' ? 'active' : ''}" data-action="host-tab" data-tab="listings">Mes logements</button><button class="${activeHostTab === 'bookings' ? 'active' : ''}" data-action="host-tab" data-tab="bookings">Réservations</button><button class="${activeHostTab === 'profile' ? 'active' : ''}" data-action="host-tab" data-tab="profile">Mon profil</button></div>
      ${activeHostTab === 'listings' ? listingsContent : activeHostTab === 'bookings' ? `<div class="dashboard-list">${bookingContent}</div>` : profileForm()}
    </section>`
}

function profileForm() {
  return `<form class="form-card profile-form" id="profile-form"><h2>Mes informations</h2><label>Nom<input name="name" value="${escapeHtml(currentUser.name || '')}" required /></label><label>Email<input name="email" type="email" value="${escapeHtml(currentUser.email || '')}" required /></label><label>Téléphone<input name="phone" value="${escapeHtml(currentUser.phone || '')}" /></label><label>Ville<input name="city" value="${escapeHtml(currentUser.city || '')}" /></label><label>Adresse<input name="address" value="${escapeHtml(currentUser.address || '')}" /></label><label>Description<textarea name="description">${escapeHtml(currentUser.description || '')}</textarea></label><button class="button button-primary">Enregistrer</button></form>`
}

async function clientPage() {
  if (!currentUser || currentUser.role !== 'client') return '<section class="section empty-state"><h1>Accès réservé aux clients</h1><a href="/login">Se connecter</a></section>'
  const bookings = await api.get(`/api/bookings/user/${userId()}`)
  const reviews = JSON.parse(localStorage.getItem('maison-reviews') || '[]').filter((review) => Number(review.userId) === Number(userId()))
  const tabs = `<div class="tab-bar"><button class="${activeClientTab === 'reservations' ? 'active' : ''}" data-action="client-tab" data-tab="reservations">Réservations</button><button class="${activeClientTab === 'explore' ? 'active' : ''}" data-action="client-tab" data-tab="explore">Explorer</button><button class="${activeClientTab === 'reviews' ? 'active' : ''}" data-action="client-tab" data-tab="reviews">Mes avis</button><button class="${activeClientTab === 'profile' ? 'active' : ''}" data-action="client-tab" data-tab="profile">Mon profil</button></div>`
  let content

  if (activeClientTab === 'profile') {
    content = profileForm()
  } else if (activeClientTab === 'explore') {
    content = `<form class="filters-panel" id="search-filters"><label>Ville<input name="city" placeholder="Toutes les villes" /></label><label>Prix minimum<input name="minPrice" type="number" min="0" value="0" /></label><label>Prix maximum<input name="maxPrice" type="number" min="0" value="2000" /></label><button class="button button-primary" type="submit">Explorer</button></form>${listingGrid(listings.filter((item) => Number(item.price) <= 2000))}`
  } else if (activeClientTab === 'reviews') {
    content = reviews.length ? reviews.map((review) => `<article class="dashboard-row"><div class="row-main"><strong>★ ${escapeHtml(review.rating)} · ${escapeHtml(review.comment)}</strong><span>${escapeHtml(review.createdAt || '')}</span></div></article>`).join('') : '<p class="muted">Vous n’avez pas encore laissé d’avis.</p>'
  } else {
    const spent = bookings.reduce((sum, booking) => sum + Number(booking.total_price || 0), 0)
    content = `<div class="stats-grid"><div class="stat-card"><span>Réservations</span><strong>${bookings.length}</strong></div><div class="stat-card"><span>Total réservé</span><strong>${money(spent)}</strong></div><div class="stat-card"><span>Avis publiés</span><strong>${reviews.length}</strong></div></div>${bookings.length ? bookings.map((booking) => `<article class="dashboard-row"><div class="row-main"><strong>${escapeHtml(booking.listing_title || `Logement #${booking.listing_id}`)}</strong><span>${escapeHtml(booking.check_in_date)} → ${escapeHtml(booking.check_out_date)} · ${money(booking.total_price)}</span></div>${statusBadge(booking.status)}</article>`).join('') : '<div class="empty-state"><p>Vos réservations apparaîtront ici.</p><a href="/">Découvrir les logements</a></div>'}`
  }

  return `<section class="section dashboard"><span class="eyebrow">ESPACE CLIENT</span><h1 class="page-title">Bonjour ${escapeHtml(currentUser.name)}</h1>${tabs}${content}</section>`
}

async function adminPage() {
  if (!currentUser?.isAdmin) return '<section class="section empty-state"><h1>Accès réservé à l’administration</h1><a href="/login">Se connecter</a></section>'
  const [stats, users, allListings, bookings, transactions, reviews, reports] = await Promise.all([
    api.get('/api/admin/dashboard'),
    api.get('/api/admin/users'),
    api.get('/api/admin/listings'),
    api.get('/api/admin/bookings'),
    api.get('/api/admin/transactions'),
    api.get('/api/admin/reviews'),
    api.get('/api/admin/reports'),
  ])
  const tabNames = [['overview', 'Vue d’ensemble'], ['users', 'Utilisateurs'], ['listings', 'Logements'], ['bookings', 'Réservations'], ['payments', 'Paiements'], ['reviews', 'Avis'], ['reports', 'Signalements']]
  let content = ''

  if (activeAdminTab === 'overview') {
    content = `<div class="stats-grid"><div class="stat-card"><span>Utilisateurs</span><strong>${Number(stats.totalUsers)}</strong></div><div class="stat-card"><span>Logements</span><strong>${Number(stats.totalListings)}</strong></div><div class="stat-card"><span>Réservations</span><strong>${Number(stats.totalBookings)}</strong></div><div class="stat-card"><span>Revenus MAISON</span><strong>${money(stats.totalPlatformRevenue)}</strong></div></div><form class="form-card commission-form" id="commission-form"><label>Commission plateforme (%)<input type="number" name="commissionRate" min="0" step="0.01" value="${Number(stats.commissionRate) * 100}" required /></label><button class="button button-primary">Enregistrer</button></form>`
  } else if (activeAdminTab === 'users') {
    content = users.map((user) => `<article class="dashboard-row"><div class="row-main"><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email)} · ${escapeHtml(user.role)}</span></div>${statusBadge(user.status)}<button class="button button-outline" data-action="user-status" data-id="${Number(user.id)}" data-status="${user.status === 'blocked' ? 'active' : 'blocked'}">${user.status === 'blocked' ? 'Débloquer' : 'Bloquer'}</button><button class="button button-danger" data-action="delete-user" data-id="${Number(user.id)}">Supprimer</button></article>`).join('')
  } else if (activeAdminTab === 'listings') {
    content = allListings.map((item) => `<article class="dashboard-row"><img src="${imageUrl(item.image)}" alt="" onerror="this.src='/images/logo.png'" /><div class="row-main"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.city)} · ${money(item.price)} / nuit</span></div>${statusBadge(item.status)}<select aria-label="Statut du logement" data-action="listing-status" data-id="${Number(item.id)}"><option value="pending" ${item.status === 'pending' ? 'selected' : ''}>En attente</option><option value="approved" ${item.status === 'approved' ? 'selected' : ''}>Approuvé</option><option value="rejected" ${item.status === 'rejected' ? 'selected' : ''}>Refusé</option></select><button class="button button-danger" data-action="delete-listing" data-id="${Number(item.id)}">Supprimer</button></article>`).join('')
  } else if (activeAdminTab === 'bookings') {
    content = bookings.map((item) => `<article class="dashboard-row"><div class="row-main"><strong>${escapeHtml(item.listing_title || 'Logement')} · ${escapeHtml(item.user_name || 'Client')}</strong><span>${escapeHtml(item.check_in_date)} → ${escapeHtml(item.check_out_date)} · ${money(item.total_price)}</span></div>${statusBadge(item.status)}<select aria-label="Statut de la réservation" data-action="booking-status" data-id="${Number(item.id)}"><option value="pending" ${item.status === 'pending' ? 'selected' : ''}>En attente</option><option value="paid" ${item.status === 'paid' ? 'selected' : ''}>Payée</option><option value="cancelled" ${item.status === 'cancelled' ? 'selected' : ''}>Annulée</option></select></article>`).join('')
  } else if (activeAdminTab === 'payments') {
    content = transactions.map((item) => `<article class="dashboard-row"><div class="row-main"><strong>${escapeHtml(item.listing_title || 'Logement')} · ${escapeHtml(item.customer_name || 'Client')}</strong><span>${statusLabel(item.status)} · ${money(item.total_price)}</span></div><span>Commission : ${money(item.platform_fee)}</span><span>Hôte : ${money(item.owner_payout)}</span></article>`).join('')
  } else if (activeAdminTab === 'reviews') {
    content = reviews.map((item) => `<article class="dashboard-row"><div class="row-main"><strong>★ ${escapeHtml(item.rating)} · ${escapeHtml(item.listing_title || 'Logement')}</strong><span>${escapeHtml(item.user_name || 'Voyageur')} · ${escapeHtml(item.comment)}</span></div><button class="button button-danger" data-action="delete-review" data-id="${Number(item.id)}">Supprimer</button></article>`).join('')
  } else {
    content = reports.map((item) => `<article class="dashboard-row"><div class="row-main"><strong>${escapeHtml(item.target_type)} #${Number(item.target_id)}</strong><span>${escapeHtml(item.reason)} · ${escapeHtml(item.reporting_user_name || 'Utilisateur')}</span></div>${statusBadge(item.status)}<select aria-label="Statut du signalement" data-action="report-status" data-id="${Number(item.id)}"><option value="pending" ${item.status === 'pending' ? 'selected' : ''}>En attente</option><option value="reviewed" ${item.status === 'reviewed' ? 'selected' : ''}>Examiné</option><option value="resolved" ${item.status === 'resolved' ? 'selected' : ''}>Résolu</option></select></article>`).join('')
  }

  return `<section class="section dashboard"><span class="eyebrow">ESPACE ADMINISTRATEUR</span><h1 class="page-title">Tableau de bord</h1><div class="tab-bar admin-tabs">${tabNames.map(([key, label]) => `<button class="${activeAdminTab === key ? 'active' : ''}" data-action="admin-tab" data-tab="${key}">${label}</button>`).join('')}</div><div class="dashboard-list">${content || '<p class="muted">Aucune donnée à afficher.</p>'}</div></section>`
}

function reportDialog(id) {
  if (!currentUser) {
    navigate('/login')
    return
  }
  const reason = prompt('Pourquoi souhaitez-vous signaler ce logement ?')
  if (!reason?.trim()) return
  api.post('/api/reports', { reportingUserId: userId(), targetType: 'listing', targetId: Number(id), reason: reason.trim() })
    .then(() => setNotice('Votre signalement a été envoyé.'))
    .catch((error) => setNotice(error.message, true))
}

function profileSave(form) {
  const fields = Object.fromEntries(new FormData(form).entries())
  currentUser = { ...currentUser, ...fields }
  localStorage.setItem('currentUser', JSON.stringify(currentUser))
  setNotice('Votre profil a été mis à jour.')
}

function setNotice(message, isError = false) {
  notice = message
  const target = document.querySelector('.global-notice')
  if (target) {
    target.textContent = message
    target.classList.toggle('error', isError)
    target.classList.remove('hidden')
  } else {
    render()
  }
}

async function render() {
  const path = location.pathname
  let content
  try {
    if (path === '/') content = homePage()
    else if (path === '/search') content = searchPage()
    else if (path === '/login') content = loginPage()
    else if (path === '/register') content = registerPage()
    else if (path === '/host') content = await hostPage()
    else if (path === '/client') content = await clientPage()
    else if (path === '/admin') content = await adminPage()
    else if (path.startsWith('/listing/')) content = await listingDetailsPage(path.split('/')[2])
    else if (path.startsWith('/booking/')) content = bookingPage(path.split('/')[2])
    else content = '<section class="section empty-state"><h1>Page introuvable</h1><a href="/">Retour à l’accueil</a></section>'
  } catch (error) {
    console.error(error)
    content = `<section class="section empty-state"><h1>Impossible de charger cette page</h1><p>${escapeHtml(error.message)}</p><button class="button button-outline" data-action="reload">Réessayer</button></section>`
  }

  app.innerHTML = `${header()}<main>${notice ? `<div class="global-notice">${escapeHtml(notice)}</div>` : ''}${content}</main>${footer()}`
  const fileInput = document.querySelector('#register-form [name="role"]')
  fileInput?.addEventListener('change', (event) => {
    document.querySelector('.host-fields')?.classList.toggle('hidden', event.target.value !== 'host')
  })
}

app.addEventListener('click', async (event) => {
  const link = event.target.closest('a[href]')
  if (link && link.origin === location.origin && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) {
    event.preventDefault()
    navigate(link.pathname + link.search)
    return
  }

  const button = event.target.closest('[data-action]')
  if (!button) return
  const { action, id, tab } = button.dataset

  try {
    if (action === 'logout') {
      currentUser = null
      localStorage.removeItem('currentUser')
      navigate('/')
    } else if (action === 'reload') {
      render()
    } else if (action === 'report') {
      reportDialog(id)
    } else if (action === 'admin-tab') {
      activeAdminTab = tab
      render()
    } else if (action === 'host-tab') {
      activeHostTab = tab
      render()
    } else if (action === 'client-tab') {
      activeClientTab = tab
      render()
    } else if (action === 'edit-listing') {
      const item = await api.get(`/api/admin/listings/${id}`)
      document.querySelector('#host-listing-form')?.remove()
      document.querySelector('.dashboard-grid > div')?.insertAdjacentHTML('afterbegin', hostListingForm(item))
      window.scrollTo(0, 0)
    } else if (action === 'cancel-edit') {
      render()
    } else if (action === 'delete-listing') {
      if (confirm('Supprimer ce logement ?')) {
        await api.delete(`/api/admin/listings/${id}`)
        setNotice('Le logement a été supprimé.')
      }
    } else if (action === 'delete-user') {
      if (confirm('Supprimer cet utilisateur ?')) {
        await api.delete(`/api/admin/users/${id}`)
        setNotice('L’utilisateur a été supprimé.')
      }
    } else if (action === 'user-status') {
      await api.patch(`/api/admin/users/${id}/status`, { status: button.dataset.status })
      setNotice('Le statut du compte a été mis à jour.')
    } else if (action === 'delete-review') {
      if (confirm('Supprimer cet avis ?')) {
        await api.delete(`/api/admin/reviews/${id}`)
        setNotice('L’avis a été supprimé.')
      }
    }
  } catch (error) {
    setNotice(error.message, true)
  }
})

app.addEventListener('change', async (event) => {
  if (event.target.name === 'role') {
    document.querySelector('.host-fields')?.classList.toggle('hidden', event.target.value !== 'host')
    return
  }

  const control = event.target.closest('[data-action]')
  if (!control) return
  const { action, id } = control.dataset
  const routes = {
    'listing-status': [`/api/admin/listings/${id}/status`, { status: control.value }],
    'booking-status': [`/api/admin/bookings/${id}/status`, { status: control.value }],
    'report-status': [`/api/admin/reports/${id}/status`, { status: control.value }],
  }
  if (!routes[action]) return
  try {
    await api.patch(...routes[action])
    setNotice('Le statut a été mis à jour.')
  } catch (error) {
    setNotice(error.message, true)
    render()
  }
})

app.addEventListener('submit', async (event) => {
  const form = event.target
  event.preventDefault()

  try {
    const data = Object.fromEntries(new FormData(form).entries())
    if (form.id === 'header-search' || form.id === 'home-search' || form.id === 'search-filters') {
      const params = new URLSearchParams()
      for (const key of ['city', 'minPrice', 'maxPrice']) {
        if (data[key]) params.set(key, data[key])
      }
      navigate(`/search${params.size ? `?${params}` : ''}`)
    } else if (form.id === 'login-form') {
      const user = await api.post('/api/auth/login', data)
      currentUser = user
      localStorage.setItem('currentUser', JSON.stringify(user))
      navigate(user.isAdmin ? '/admin' : user.role === 'host' ? '/host' : '/client')
    } else if (form.id === 'register-form') {
      if (data.password !== data.confirmPassword) throw new Error('Les mots de passe ne correspondent pas.')
      if (data.password.length < 6) throw new Error('Le mot de passe doit contenir au moins 6 caractères.')
      if (data.role === 'host' && (!data.address || !data.description)) throw new Error('Veuillez remplir les informations de l’hôte.')
      await api.post('/api/auth/register', data)
      notice = 'Votre compte a été créé. Vous pouvez maintenant vous connecter.'
      navigate('/login')
      setNotice('Votre compte a été créé. Vous pouvez maintenant vous connecter.')
    } else if (form.id === 'booking-form') {
      if (new Date(data.checkOutDate) <= new Date(data.checkInDate)) throw new Error('La date de départ doit être après la date d’arrivée.')
      const listing = listings.find((item) => Number(item.id) === Number(form.dataset.id))
      const nights = Math.ceil((new Date(data.checkOutDate) - new Date(data.checkInDate)) / 86400000)
      await api.post('/api/bookings', {
        listingId: Number(form.dataset.id),
        userId: userId(),
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        totalPrice: Number(listing.price) * nights,
        guestPhone: data.guestPhone,
        guestNotes: data.guestNotes,
        paymentMethod: data.paymentMethod,
      })
      activeClientTab = 'reservations'
      navigate('/client')
      setNotice('Votre réservation a été envoyée à l’hôte.')
    } else if (form.id === 'host-listing-form') {
      const readImage = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Impossible de lire une image.'))
        reader.onerror = () => reject(new Error('Impossible de lire une image.'))
        reader.readAsDataURL(file)
      })
      const primaryFile = form.elements.primaryImage.files[0]
      const galleryFiles = [...form.elements.galleryImages.files]
      if (galleryFiles.length > 4 || [primaryFile, ...galleryFiles].some((file) => file && file.size > 2 * 1024 * 1024)) {
        throw new Error('Choisissez au maximum 4 images supplémentaires, de 2 Mo chacune.')
      }
      const uploadedImages = await Promise.all(galleryFiles.map(readImage))
      const image = primaryFile ? await readImage(primaryFile) : data.image.trim()
      const images = [
        ...data.images.split(',').map((value) => value.trim()).filter(Boolean),
        ...uploadedImages,
      ]
      if (!image) throw new Error('Choisissez ou indiquez une image principale.')
      if (images.length < 2) throw new Error('Ajoutez au moins deux autres images.')
      const payload = {
        title: data.title,
        city: data.city,
        price: Number(data.price),
        image,
        images,
        beds: Number(data.beds),
        baths: Number(data.baths),
        kitchens: Number(data.kitchens || 1),
        salons: Number(data.salons || 1),
        description: data.description,
        rating: 0,
        ownerId: userId(),
        ownerName: currentUser.name,
        ownerPhone: currentUser.phone,
        address: data.address,
      }
      const listingId = form.dataset.id
      if (listingId) {
        await api.put(`/api/listings/${listingId}`, payload)
      } else {
        await api.post('/api/listings', payload)
      }
      activeHostTab = 'listings'
      navigate('/host')
      setNotice('Votre logement a été enregistré et envoyé pour validation.')
    } else if (form.id === 'profile-form') {
      profileSave(form)
    } else if (form.id === 'review-form') {
      const review = { listingId: Number(form.dataset.id), userId: userId(), rating: Number(data.rating), comment: data.comment }
      await api.post('/api/reviews', review)
      const saved = JSON.parse(localStorage.getItem('maison-reviews') || '[]')
      saved.push({ ...review, userName: currentUser.name, createdAt: new Date().toISOString() })
      localStorage.setItem('maison-reviews', JSON.stringify(saved))
      setNotice('Merci ! Votre avis a bien été ajouté.')
      render()
    } else if (form.id === 'commission-form') {
      await api.patch('/api/admin/settings/commission', { commissionRate: Number(data.commissionRate) / 100 })
      setNotice('La commission a été mise à jour.')
    }
  } catch (error) {
    const message = error.message || 'Une erreur est survenue.'
    const target = form.querySelector('.form-message')
    if (target) {
      target.textContent = message
      target.classList.add('error')
    } else {
      setNotice(message, true)
    }
  }
})

window.addEventListener('popstate', () => {
  notice = ''
  render()
})

async function start() {
  try {
    listings = await api.get('/api/listings')
  } catch (error) {
    console.error('Impossible de charger les logements :', error)
  }
  await render()
}

start()
