/**
 * EventPulse Main Application Controller
 */

// Application State
let currentViewMode = 'grid'; // 'grid' | 'list'
let cart = JSON.parse(localStorage.getItem('ep_cart')) || [];
let myTickets = JSON.parse(localStorage.getItem('ep_tickets')) || [];
let discountRate = 0;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    renderEvents();
    updateCartUI();
    updateTicketBadge();
    attachEventListeners();
});

// Event Listeners Initialization
function attachEventListeners() {
    document.getElementById('searchInput').addEventListener('input', renderEvents);
    document.getElementById('genreFilter').addEventListener('change', renderEvents);
    document.getElementById('locationFilter').addEventListener('change', renderEvents);
    document.getElementById('dateFilter').addEventListener('change', renderEvents);

    document.getElementById('viewGridBtn').addEventListener('click', () => setViewMode('grid'));
    document.getElementById('viewListBtn').addEventListener('click', () => setViewMode('list'));

    document.getElementById('applyPromoBtn').addEventListener('click', handlePromoCode);
    document.getElementById('checkoutBtn').addEventListener('click', handleCheckout);

    document.getElementById('singlePassView').addEventListener('change', renderBookedTicketsModal);
    document.getElementById('groupPassView').addEventListener('change', renderBookedTicketsModal);

    document.getElementById('navMyTickets').addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('ticketModal'));
        renderBookedTicketsModal();
        modal.show();
    });
}

// Set View Mode (Grid vs List)
function setViewMode(mode) {
    currentViewMode = mode;
    document.getElementById('viewGridBtn').classList.toggle('active', mode === 'grid');
    document.getElementById('viewListBtn').classList.toggle('active', mode === 'list');
    renderEvents();
}

// Filter and Render Events
function renderEvents() {
    const searchVal = document.getElementById('searchInput').value.toLowerCase();
    const genreVal = document.getElementById('genreFilter').value;
    const locationVal = document.getElementById('locationFilter').value;
    const dateVal = document.getElementById('dateFilter').value;

    const filtered = mockEvents.filter(evt => {
        const matchesSearch = evt.title.toLowerCase().includes(searchVal) || evt.location.toLowerCase().includes(searchVal);
        const matchesGenre = genreVal === 'ALL' || evt.genre === genreVal;
        const matchesLocation = locationVal === 'ALL' || evt.location === locationVal;
        const matchesDate = !dateVal || evt.date === dateVal;

        return matchesSearch && matchesGenre && matchesLocation && matchesDate;
    });

    const container = document.getElementById('eventContainer');
    container.innerHTML = '';

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted py-5"><h4>No events match your selected criteria.</h4></div>`;
        return;
    }

    filtered.forEach(evt => {
        const colClass = currentViewMode === 'grid' ? 'col-md-6 col-lg-4' : 'col-12';
        const cardLayoutClass = currentViewMode === 'list' ? 'list-view-card' : '';

        container.innerHTML += `
            <div class="${colClass}">
                <div class="card bg-secondary text-white h-100 ${cardLayoutClass}">
                    <img src="${evt.image}" class="event-img" alt="${evt.title}">
                    <div class="card-body d-flex flex-column justify-content-between">
                        <div>
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <span class="badge bg-primary">${evt.genre}</span>
                                <small class="text-light"><i class="bi bi-geo-alt"></i> ${evt.location}</small>
                            </div>
                            <h5 class="card-title fw-bold">${evt.title}</h5>
                            <p class="card-text text-light small mb-2">${evt.description}</p>
                            <small class="text-light d-block mb-3"><i class="bi bi-calendar-event me-1"></i> ${evt.date} at ${evt.time}</small>
                        </div>
                        
                        <div>
                            <div class="mb-3">
                                <label class="form-label small mb-1">Select Tier:</label>
                                <select class="form-select form-select-sm" id="tier-${evt.id}">
                                    <option value="General">General Admission - $${evt.tiers.General}</option>
                                    <option value="VIP">VIP Pass - $${evt.tiers.VIP}</option>
                                    <option value="VVIP">VVIP Experience - $${evt.tiers.VVIP}</option>
                                </select>
                            </div>
                            <button class="btn btn-primary w-100 btn-sm" onclick="addToCart('${evt.id}')">
                                <i class="bi bi-cart-plus me-1"></i> Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

// Add Item to Cart
function addToCart(eventId) {
    const evt = mockEvents.find(e => e.id === eventId);
    const selectedTier = document.getElementById(`tier-${eventId}`).value;
    const price = evt.tiers[selectedTier];

    const existingIndex = cart.findIndex(item => item.eventId === eventId && item.tier === selectedTier);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            cartItemId: `${eventId}-${selectedTier}-${Date.now()}`,
            eventId: evt.id,
            title: evt.title,
            date: evt.date,
            location: evt.location,
            tier: selectedTier,
            price: price,
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();
}

// Save Cart to LocalStorage
function saveCart() {
    localStorage.setItem('ep_cart', JSON.stringify(cart));
}

// Update Cart UI
function updateCartUI() {
    const cartCountEl = document.getElementById('cartCount');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountEl.innerText = totalItems;

    const listEl = document.getElementById('cartItemsList');
    listEl.innerHTML = '';

    if (cart.length === 0) {
        listEl.innerHTML = `<p class="text-center text-muted my-3">Your cart is currently empty.</p>`;
        document.getElementById('cartTotalDisplay').innerText = `$0.00`;
        return;
    }

    let subtotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        listEl.innerHTML += `
            <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <div>
                    <h6 class="mb-0">${item.title}</h6>
                    <small class="text-muted">${item.tier} Tier | $${item.price} each</small>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-outline-secondary" onclick="updateQty('${item.cartItemId}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="btn btn-sm btn-outline-secondary" onclick="updateQty('${item.cartItemId}', 1)">+</button>
                    <span class="fw-bold ms-3" style="width:70px; text-align:right;">$${itemTotal.toFixed(2)}</span>
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="removeFromCart('${item.cartItemId}')"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        `;
    });

    const finalTotal = subtotal * (1 - discountRate);
    document.getElementById('cartTotalDisplay').innerText = `$${finalTotal.toFixed(2)}`;
}

// Update Quantity
function updateQty(cartItemId, delta) {
    const item = cart.find(i => i.cartItemId === cartItemId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.cartItemId !== cartItemId);
        }
        saveCart();
        updateCartUI();
    }
}

// Remove from Cart
function removeFromCart(cartItemId) {
    cart = cart.filter(i => i.cartItemId !== cartItemId);
    saveCart();
    updateCartUI();
}

// Promo Code Logic
function handlePromoCode() {
    const code = document.getElementById('promoCodeInput').value.trim().toUpperCase();
    if (code === 'EARLYBIRD') {
        discountRate = 0.15; // 15% off
        alert('Promo code applied! 15% discount applied.');
    } else {
        discountRate = 0;
        alert('Invalid Promo Code.');
    }
    updateCartUI();
}

// Handle Checkout & Generate Tickets
function handleCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    const bookingRef = 'REF-' + Math.random().toString(36).substring(2, 9).toUpperCase();

    cart.forEach(item => {
        myTickets.push({
            bookingRef: bookingRef,
            eventId: item.eventId,
            title: item.title,
            date: item.date,
            location: item.location,
            tier: item.tier,
            quantity: item.quantity,
            pricePaid: item.price,
            bookingDate: new Date().toLocaleDateString()
        });
    });

    // Clear Cart
    cart = [];
    saveCart();
    updateCartUI();

    // Save Bookings
    localStorage.setItem('ep_tickets', JSON.stringify(myTickets));
    updateTicketBadge();

    // Dismiss Cart Modal & Show Ticket Confirmation
    const cartModalEl = document.getElementById('cartModal');
    const cartModal = bootstrap.Modal.getInstance(cartModalEl);
    if (cartModal) cartModal.hide();

    const ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));
    renderBookedTicketsModal();
    ticketModal.show();
}

// Update Ticket Badge Count
function updateTicketBadge() {
    document.getElementById('myTicketsCount').innerText = myTickets.length;
}

// Render Booked Tickets & QR Codes (Single Admission vs Multiple Admission View)
function renderBookedTicketsModal() {
    const container = document.getElementById('ticketsDisplayContainer');
    container.innerHTML = '';

    if (myTickets.length === 0) {
        container.innerHTML = `<p class="text-center text-muted">No passes found.</p>`;
        return;
    }

    const isSingleView = document.getElementById('singlePassView').checked;

    let qrCounter = 0;

    myTickets.forEach((ticket) => {
        if (isSingleView) {
            // Render individual "Admit 1" passes for each ticket in quantity
            for (let i = 1; i <= ticket.quantity; i++) {
                qrCounter++;
                const qrId = `qrcode-${qrCounter}`;
                const passPayload = `PASS-SINGLE | Ref: ${ticket.bookingRef} | Event: ${ticket.title} | Tier: ${ticket.tier} | Seat/Pass #: ${i} of ${ticket.quantity}`;

                container.innerHTML += `
                    <div class="col-md-6">
                        <div class="ticket-card text-white">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="badge bg-success">Admit 1</span>
                                <small class="text-light">${ticket.bookingRef}</small>
                            </div>
                            <h6 class="fw-bold mb-1">${ticket.title}</h6>
                            <p class="small text-light mb-1">Tier: <strong>${ticket.tier}</strong></p>
                            <p class="small text-light mb-2"><i class="bi bi-geo-alt me-1"></i>${ticket.location} | ${ticket.date}</p>
                            
                            <div class="qr-box my-2">
                                <div id="${qrId}"></div>
                            </div>
                            <small class="d-block text-center text-light mt-1" style="font-size: 0.75rem;">Scan at entrance for entry</small>
                        </div>
                    </div>
                `;

                setTimeout(() => {
                    new QRCode(document.getElementById(qrId), {
                        text: passPayload,
                        width: 100,
                        height: 100
                    });
                }, 50);
            }
        } else {
            // Render Consolidated Group Pass
            qrCounter++;
            const qrId = `qrcode-group-${qrCounter}`;
            const groupPayload = `PASS-GROUP | Ref: ${ticket.bookingRef} | Event: ${ticket.title} | Tier: ${ticket.tier} | Total Admit: ${ticket.quantity}`;

            container.innerHTML += `
                <div class="col-12">
                    <div class="ticket-card text-white">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge bg-warning text-dark">Group Pass (Admit ${ticket.quantity})</span>
                            <small class="text-light">${ticket.bookingRef}</small>
                        </div>
                        <h5 class="fw-bold mb-1">${ticket.title}</h5>
                        <p class="small text-light mb-1">Tier: <strong>${ticket.tier}</strong> | Quantity: <strong>${ticket.quantity} Passes</strong></p>
                        <p class="small text-light mb-2"><i class="bi bi-geo-alt me-1"></i>${ticket.location} | ${ticket.date}</p>
                        
                        <div class="qr-box my-2">
                            <div id="${qrId}"></div>
                        </div>
                        <small class="d-block text-center text-light mt-1" style="font-size: 0.75rem;">Group Check-in Code</small>
                    </div>
                </div>
            `;

            setTimeout(() => {
                new QRCode(document.getElementById(qrId), {
                    text: groupPayload,
                    width: 120,
                    height: 120
                });
            }, 50);
        }
    });
}
