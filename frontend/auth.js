const API_BASE = 'http://localhost:5000/api/auth';

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast hidden';
    }, 3000);
}

// Redirect if already logged in (when on auth pages)
const currentUser = localStorage.getItem('user');
if (currentUser && (window.location.pathname.includes('login') || window.location.pathname.includes('register'))) {
    const user = JSON.parse(currentUser);
    redirectBasedOnRole(user.role);
}

function redirectBasedOnRole(role) {
    if (role === 'Admin') window.location.href = 'admin-overview.html';
    else if (role === 'NGO') window.location.href = 'ngo-dashboard.html';
    else window.location.href = 'restaurant-portal.html';
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = loginForm.querySelector('button');
        btn.textContent = 'Signing in...';
        btn.disabled = true;

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.data));
                redirectBasedOnRole(data.data.role);
            } else {
                showToast(data.error || 'Login failed', 'error');
            }
        } catch (err) {
            showToast('Server Error', 'error');
        } finally {
            btn.textContent = 'Sign In';
            btn.disabled = false;
        }
    });
}

// Role selector toggle visibility and Map Logic
const regRoleSelect = document.getElementById('regRole');
const donorCredentials = document.getElementById('donorCredentials');

let map = null;
let marker = null;

function initMap() {
    if (map) return; // Only init once
    // Default to a generic location (e.g. Center of the US/World or current geolocation)
    map = L.map('locationMap').setView([51.505, -0.09], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Click on map to drop pin and reverse geocode
    map.on('click', async function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Reverse Geocode
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const data = await res.json();
            const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            setMarker(lat, lng, address);
        } catch (err) {
            setMarker(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
    });
}

function setMarker(lat, lng, displayName = null) {
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(map);
    map.setView([lat, lng], 15); // Zoom closely
    
    const displayVal = displayName || `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
    document.getElementById('regLocation').value = displayVal;
}

// Auto-Detect Location Button
const detectBtn = document.getElementById('detectLocBtn');
if (detectBtn) {
    detectBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            showToast('Geolocation is not supported by your browser', 'error');
            return;
        }
        detectBtn.textContent = 'Locating...';
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude.toFixed(5);
            const lng = position.coords.longitude.toFixed(5);
            setMarker(lat, lng);
            detectBtn.textContent = '📍 Auto-Detect';
            showToast('Location Found!', 'success');
        }, () => {
            showToast('Unable to retrieve your location', 'error');
            detectBtn.textContent = '📍 Auto-Detect';
        });
    });
}

// Sync country code
const countrySelect = document.getElementById('regCountry');
if (countrySelect) {
    countrySelect.addEventListener('change', (e) => {
        const code = e.target.options[e.target.selectedIndex].getAttribute('data-code');
        document.getElementById('regPhoneCode').value = code || '';
    });
}

if (regRoleSelect && donorCredentials) {
    // Initial check on load
    if (regRoleSelect.value === 'Restaurant') {
        setTimeout(initMap, 100);
    }
    
    regRoleSelect.addEventListener('change', (e) => {
        if (e.target.value === 'Restaurant') {
            donorCredentials.style.display = 'block';
            // Init map after it becomes visible so size calculates correctly
            setTimeout(() => {
                initMap();
                map.invalidateSize();
            }, 100);
        } else {
            donorCredentials.style.display = 'none';
        }
    });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = registerForm.querySelector('button');
        btn.textContent = 'Creating...';
        btn.disabled = true;

        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const role = document.getElementById('regRole').value;
        
        let payload = { name, email, password, role };
        
        // Add donor credentials if Restaurant
        if (role === 'Restaurant') {
            const phoneCode = document.getElementById('regPhoneCode').value;
            const contactStr = document.getElementById('regContact').value;
            payload.location = document.getElementById('regLocation').value;
            payload.contactDetails = `${phoneCode} ${contactStr}`;
            payload.founderName = document.getElementById('regFounder').value;
            payload.certificate = document.getElementById('regCertificate').value;
        }

        try {
            const res = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (data.success) {
                const modal = document.getElementById('successModal');
                if (modal) {
                    modal.classList.remove('hidden');
                } else {
                    showToast('Account created successfully! Please log in.', 'success');
                    setTimeout(() => window.location.href = 'login.html', 2000);
                }
            } else {
                showToast(data.error || 'Registration failed', 'error');
            }
        } catch (err) {
            showToast('Server Error', 'error');
        } finally {
            btn.textContent = 'Create Account';
            btn.disabled = false;
        }
    });
}

// Global Logout function
window.logout = function() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
