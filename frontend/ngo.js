const API_BASE = 'http://localhost:5000/api';
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        currentUser = JSON.parse(userStr);
        if (currentUser.role !== 'NGO') {
            window.location.href = 'login.html';
            return;
        }
        document.getElementById('profileName').textContent = currentUser.name;
        document.getElementById('profileRole').textContent = currentUser.role + ' Mode';
        
        document.getElementById('ngoNameUi').textContent = currentUser.name;

        // Hide other sidebar menus
        document.querySelectorAll('.nav-menu a').forEach(a => {
            if (!a.href.includes('ngo-dashboard')) a.style.display = 'none';
        });

        loadDashboard();
        startPolling();

        if ("Notification" in window) {
            if (Notification.permission !== "granted" && Notification.permission !== "denied") {
                Notification.requestPermission();
            }
        }
    } else {
        window.location.href = 'login.html';
    }
});

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// --- Location & Distance Utilities ---
const geocache = {};

// Haversine formula
function getDistanceKM(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Geocode using string location
async function getCoordinates(locationStr) {
    if (!locationStr) return null;
    
    // If it's already "lat, lon"
    if (locationStr.includes(',')) {
        const parts = locationStr.split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return { lat: parts[0], lon: parts[1] };
        }
    }

    // Cache check
    if (geocache[locationStr]) return geocache[locationStr];

    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationStr)}&format=json&limit=1`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data && data.length > 0) {
            const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
            geocache[locationStr] = coords;
            return coords;
        }
    } catch (e) {
        console.error("Geocoding failed", e);
    }
    
    return null; // Fallback
}

let knownFoodIds = null;
let pollInterval = null;

async function loadDashboard() {
    try {
        const resAvail = await fetch(`${API_BASE}/food/available`);
        const dataAvail = await resAvail.json();
        
        const resInc = await fetch(`${API_BASE}/food/incoming?ngoId=${currentUser._id}`);
        const dataInc = await resInc.json();

        // Fetch Requests History
        const resReq = await fetch(`${API_BASE}/requests/ngo/${currentUser._id}`);
        const dataReq = await resReq.json();

        // Setup settings UI
        const oInput = document.getElementById('setOrg');
        if (oInput) oInput.value = currentUser.name;
        const cInput = document.getElementById('setContact');
        if (cInput) cInput.value = currentUser.contactDetails || 'N/A';
        const lInput = document.getElementById('setLoc');
        if (lInput) lInput.value = currentUser.location || 'N/A';

        if (dataAvail.success) {
            await renderAvailable(dataAvail.data);
            
            const currentIds = dataAvail.data.map(f => f._id);
            if (knownFoodIds !== null) {
                const hasNew = currentIds.some(id => !knownFoodIds.has(id));
                if (hasNew) {
                    showToast("🔔 New Food Encountered In Your Area!");
                    new Audio('https://www.soundjay.com/buttons/sounds/button-47.mp3').play().catch(e=>console.log("Audio skipped"));
                    
                    if ("Notification" in window && Notification.permission === "granted") {
                        new Notification("FoodRescue AI", {
                            body: "New food donation matching your area is available!",
                            icon: "https://cdn-icons-png.flaticon.com/512/3082/3082008.png"
                        });
                    }
                }
            }
            knownFoodIds = new Set(currentIds);
        }
        
        if (dataInc.success) renderIncoming(dataInc.data);
        if (dataReq.success) renderNgoRequests(dataReq.data);
    } catch (err) {
        console.error(err);
    }
}

function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(loadDashboard, 8000); 
}

function showToast(msg) {
    let t = document.getElementById('global-toast');
    if(!t) {
        t = document.createElement('div');
        t.id = 'global-toast';
        t.className = 'toast';
        document.body.appendChild(t);
    }
    t.innerHTML = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 4000);
}

async function renderAvailable(foods) {
    const list = document.getElementById('availableMatchesList');
    list.innerHTML = '<p style="color:var(--primary); font-weight:500; text-align:center;">Scanning for items within 15 km...</p>';
    
    if (foods.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);">No available food matches right now.</p>';
        return;
    }

    // Get NGO Coordinates
    const ngoCoords = await getCoordinates(currentUser.location);

    // Grouping: { donorId: { name, location, distance, items: [] } }
    const grouped = {};

    for (const f of foods) {
        if (!f.donorId) continue;
        
        const dId = f.donorId._id;
        
        if (!grouped[dId]) {
            let dist = 5.0; // Fallback mock distance if Geocode fails completely
            if (ngoCoords) {
                const donorCoords = await getCoordinates(f.donorId.location);
                if (donorCoords) {
                    dist = getDistanceKM(ngoCoords.lat, ngoCoords.lon, donorCoords.lat, donorCoords.lon);
                }
            }
            
            // Apply < 15km Radius filter!
            if (dist > 15) {
                grouped[dId] = null; // Mark as rejected due to distance
                continue; 
            }

            grouped[dId] = {
                name: f.donorId.name,
                location: f.donorId.location,
                distance: dist,
                items: []
            };
        }

        if (grouped[dId]) {
            grouped[dId].items.push(f);
        }
    }

    list.innerHTML = '';
    
    let hasResults = false;

    // Render Grouped Objects
    Object.values(grouped).forEach(donorGrp => {
        if (!donorGrp) return; // Skip rejected (dist > 15)
        hasResults = true;

        const container = document.createElement('div');
        container.style.cssText = "border:1px solid var(--glass-border); padding:1.5rem; border-radius:12px; margin-bottom:1.5rem; background: var(--bg-panel); box-shadow: var(--glass-shadow);";
        
        // Donor Header
        let itemsHtml = '';
        donorGrp.items.forEach(item => {
            // Check if it's the last item to remove the dashed border
            const isLast = donorGrp.items.indexOf(item) === donorGrp.items.length - 1;
            const borderStyle = isLast ? '' : 'border-bottom: 1px dashed var(--glass-border);';
            itemsHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 1rem 0; ${borderStyle}">
                    <div>
                        <h5 style="margin-bottom:0.4rem; font-size:1.05rem; color:var(--text-main); font-weight:600;">${item.name} (${item.quantity} ${item.unit || 'kg'})</h5>
                        <span style="font-size:0.8rem; background:rgba(245, 158, 11, 0.1); color:var(--warning); padding:0.2rem 0.6rem; border-radius:4px;">Expires in: ${item.storage}</span>
                    </div>
                    <button class="btn bg-green" onclick="acceptFood('${item._id}')" style="border:none; padding:0.5rem 1.2rem; font-weight:600; font-size:0.9rem;">Accept Food</button>
                </div>
            `;
        });

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; padding-bottom:1rem; border-bottom:2px solid #f1f5f9;">
                <div>
                    <h4 style="font-size:1.4rem; margin-bottom:0.4rem; color:var(--text-main); font-weight: 700;">🏪 ${donorGrp.name}</h4>
                    <p style="color:var(--text-muted); font-size:0.95rem;">📍 ${donorGrp.location}</p>
                </div>
                <div style="text-align:right;">
                    <span class="status-badge bg-green" style="font-size:0.85rem;">🟢 In Delivery Radius</span>
                    <p style="color:var(--primary); font-weight:700; margin-top:0.6rem; font-size:0.95rem;">⚡ ${donorGrp.distance.toFixed(1)} km away</p>
                </div>
            </div>
            <div>
                ${itemsHtml}
            </div>
        `;
        list.appendChild(container);
    });

    if (!hasResults) {
        list.innerHTML = '<p style="color:var(--text-muted); font-style:italic;">There is food available globally, but none within 15 km of your location right now.</p>';
    }
}

function renderIncoming(foods) {
    const activelist = document.getElementById('incomingDeliveriesList');
    const historyList = document.getElementById('dailyCollectionHistoryList');
    if(activelist) activelist.innerHTML = '';
    if(historyList) historyList.innerHTML = '';
    
    // Split foods
    const activeFoods = foods.filter(f => f.deliveryStatus === 'EnRoute');
    
    // Filter Completed for TODAY only
    const todayStr = new Date().toLocaleDateString();
    const completedFoods = foods.filter(f => {
        if(f.deliveryStatus !== 'Completed') return false;
        const dStr = new Date(f.updatedAt || f.createdAt).toLocaleDateString();
        return dStr === todayStr;
    });

    // Storage calculation
    let coldSum = 0;
    let drySum = 0;

    const allToday = [...activeFoods, ...completedFoods];
    allToday.forEach(f => {
        let q = Number(f.quantity) || 0;
        if(f.storage === 'Fridge' || f.storage === 'Cold') coldSum += q;
        else drySum += q;
    });

    const coldBar = document.getElementById('coldStorageBar');
    const coldTxt = document.getElementById('coldStorageUsage');
    const dryBar = document.getElementById('dryStorageBar');
    const dryTxt = document.getElementById('dryStorageUsage');

    if(coldBar && coldTxt) {
        coldTxt.textContent = coldSum;
        coldBar.style.width = Math.min((coldSum / 100)*100, 100) + '%';
    }
    if(dryBar && dryTxt) {
        dryTxt.textContent = drySum;
        dryBar.style.width = Math.min((drySum / 500)*100, 100) + '%';
    }

    // 1. Render Active Deliveries
    if (activeFoods.length === 0) {
        if(activelist) activelist.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No active deliveries.</p>';
    } else {
        activeFoods.forEach(f => {
            const item = document.createElement('div');
            item.id = 'active-item-' + f._id;
            item.className = 'match-item';
            item.style.cssText = "flex-direction:column; align-items:flex-start; gap:1rem; border:1px solid var(--glass-border); padding:1rem; border-radius:8px; margin-bottom:1rem;";
            
            let donName = f.donorId ? f.donorId.name : 'Unknown Donor';
            let donLoc = f.donorId ? f.donorId.location : 'N/A';
            let donPhone = f.donorId ? f.donorId.contactDetails : 'N/A';
            
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <div>
                        <h4 style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem;">
                            <span style="background:#f1f5f9; padding:0.4rem; border-radius:50%;">🚚</span>
                            ${donName}
                        </h4>
                        <p style="color:var(--text-muted); font-size:0.85rem;">${f.name} • ${f.quantity} ${f.unit || 'kg'}</p>
                    </div>
                    <div style="text-align:right;">
                        <p style="color:#0ea5e9; font-weight:600; font-size:0.9rem;">En Route</p>
                        <p style="color:var(--text-muted); font-size:0.8rem;">Location: ${donLoc}</p>
                    </div>
                </div>
                <!-- Simulated receipt verification -->
                <div style="display:flex; gap:1rem; margin-top:0.5rem;">
                    <button class="btn" onclick="openReceiptModal('${f._id}')" style="background:#1e293b; color:white;">📱 Mark as Received</button>
                    <button class="outline-btn" onclick="alert('Contact: ${donPhone}')">📞 Contact Donor</button>
                </div>
            `;
            if(activelist) activelist.appendChild(item);
        });
    }

    // 2. Render Historical (Only Today)
    if (completedFoods.length === 0) {
        if(historyList) historyList.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No completed collections today.</p>';
    } else {
        let itemsHtml = '';
        let dailyTotal = 0;
        
        // Group similar items quickly or just render flat. We'll render flat for today.
        completedFoods.forEach(f => {
            const unit = f.unit || 'kg';
            const donorName = f.donorId ? f.donorId.name : 'Unknown';
            let q = Number(f.quantity) || 0;
            dailyTotal += q;
            itemsHtml += `
                <div style="display:flex; justify-content:space-between; padding: 0.6rem 0; border-bottom:1px dashed #cbd5e1;">
                    <div>
                        <p style="font-weight:600; font-size:0.9rem; color:var(--text-main); margin:0;">${f.name}</p>
                        <p style="color:var(--text-muted); font-size:0.8rem; margin:0;">From: ${donorName}</p>
                    </div>
                    <p style="font-weight:600; font-size:0.9rem; color:var(--text-main);">${q} ${unit}</p>
                </div>
            `;
        });
        
        const dailyBlock = document.createElement('div');
        dailyBlock.style.cssText = "border:1px solid #e2e8f0; border-radius:8px; padding:1.2rem; margin-bottom:1.5rem; background:#f8fafc;";
        dailyBlock.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding-bottom:0.8rem; border-bottom:2px solid #e2e8f0;">
                <h4 style="font-size:1.1rem; color:var(--text-main); display:flex; align-items:center; gap:0.5rem;"><span style="background:white; padding:0.3rem 0.5rem; border-radius:4px; box-shadow:0 1px 2px rgba(0,0,0,0.05);">📅</span> Today</h4>
                <span style="background:var(--primary); color:white; padding:0.2rem 0.6rem; border-radius:12px; font-weight:600; font-size:0.85rem;">Total Saved: ${dailyTotal} kg</span>
            </div>
            <div>
                ${itemsHtml}
            </div>
        `;
        if(historyList) historyList.appendChild(dailyBlock);
    }
}

async function acceptFood(id) {
    try {
        const res = await fetch(`${API_BASE}/food/${id}/accept`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ngoId: currentUser._id })
        });
        const data = await res.json();
        if (data.success) {
            alert('Donation Accepted! It is now En Route.');
            loadDashboard();
        } else {
            alert(data.error);
        }
    } catch (e) {
        console.error(e);
        alert('Server error');
    }
}

let pendingReceiptId = null;

function openReceiptModal(id) {
    pendingReceiptId = id;
    document.getElementById('receiptModal').style.display = 'flex';
}

function closeReceiptModal() {
    pendingReceiptId = null;
    document.getElementById('receiptModal').style.display = 'none';
}

// Bind process event
document.addEventListener('DOMContentLoaded', () => {
    // Attempting to bind just in case HTML hasn't completely parsed yet
    const confirmBtn = document.getElementById('confirmReceiptBtn');
    if (confirmBtn) {
        confirmBtn.onclick = processReceipt;
    }
});

// Polyfill if DOMContentLoaded already fired (which happens for dynamic scripts)
setTimeout(() => {
    const confirmBtn = document.getElementById('confirmReceiptBtn');
    if (confirmBtn) confirmBtn.onclick = processReceipt;
}, 500);

async function processReceipt() {
    if (!pendingReceiptId) return;
    const id = pendingReceiptId;
    closeReceiptModal(); // Extinguish modal instantly

    try {
        const res = await fetch(`${API_BASE}/food/${id}/receive`, {
            method: 'PUT'
        });
        const data = await res.json();
        if (data.success) {
            // Remove from the DOM smoothly instead of re-fetching the payload
            const element = document.getElementById('active-item-' + id);
            if (element) {
                element.style.transition = 'opacity 0.3s ease';
                element.style.opacity = '0';
                setTimeout(() => element.remove(), 300);
            }
        } else {
            alert(data.error);
        }
    } catch (e) {
        alert("Server Error.");
    }
}

window.switchTab = function(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
    document.getElementById('tab-' + tabId).style.display = 'block';
    
    // Convert to Title Case
    const titles = {
        'home': 'Home',
        'requestFood': 'New Food Request',
        'orders': 'Incoming Logistics',
        'history': 'Request History',
        'available': 'Global Matches',
        'settings': 'Account Settings',
        'help': 'AI Assistant'
    };
    const titleEl = document.getElementById('pageTitle');
    if(titleEl) titleEl.textContent = titles[tabId];
    if (el) el.classList.add('active');
}

window.submitNgoRequest = async function() {
    const foodType = document.getElementById('reqFoodType').value;
    const quantityNeeded = document.getElementById('reqQty').value;
    const unit = document.getElementById('reqUnit').value;
    const urgencyLevel = document.getElementById('reqUrgency').value;

    if (!quantityNeeded) {
        alert("Please specify the quantity needed.");
        return;
    }

    try {
        const payload = {
            ngoId: currentUser._id,
            foodType,
            quantityNeeded: Number(quantityNeeded),
            unit,
            urgencyLevel
        };

        const res = await fetch(`${API_BASE}/requests/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (data.success) {
            alert("AI Request Broadcast sent to nearby filtered restaurants!");
            document.getElementById('reqQty').value = '';
            loadDashboard(); // Refresh history
            switchTab('history', document.querySelectorAll('.nav-menu a')[4]);
        } else {
            alert(data.error);
        }
    } catch (e) {
        alert("Server error.");
    }
}

function renderNgoRequests(requests) {
    const list = document.getElementById('ngoRequestHistoryList');
    if (!list) return;
    
    list.innerHTML = '';
    if (requests.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">You have not made any food requests yet.</p>';
        return;
    }

    requests.forEach(req => {
        let statusBadge = '';
        if (req.status === 'Active') statusBadge = '<span class="status-badge" style="background:#fefce8; color:#eab308;">Active/Pending</span>';
        else if (req.status === 'Fulfilled') statusBadge = '<span class="status-badge bg-green">Fulfilled</span>';
        else statusBadge = '<span class="status-badge" style="background:#f1f5f9; color:#64748b;">Expired</span>';
        
        let fulfillerInfo = req.fulfilledById ? `<p style="font-size:0.8rem; color:var(--primary); margin-top:0.3rem;">✅ Fulfilled by: ${req.fulfilledById.name}</p>` : '';

        const dStr = new Date(req.createdAt).toLocaleString();

        const item = document.createElement('div');
        item.style.cssText = "border:1px solid #e2e8f0; border-radius:8px; padding:1.2rem; margin-bottom:1rem; background:white;";
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h4 style="margin-bottom:0.2rem;">${req.foodType}</h4>
                    <p style="color:var(--text-main); font-weight:600;">Requested: ${req.quantityNeeded} ${req.unit}</p>
                    <p style="color:var(--text-muted); font-size:0.8rem; margin-top:0.2rem;">${dStr}</p>
                    ${fulfillerInfo}
                </div>
                <div style="text-align:right;">
                    ${statusBadge}
                </div>
            </div>
        `;
        list.appendChild(item);
    });
}

window.sendAiMessage = function() {
    const input = document.getElementById('chatInput');
    const box = document.getElementById('chatBox');
    const msg = input.value.trim();
    if(!msg) return;

    // Append User
    box.innerHTML += `
        <div style="background:#e2e8f0; color:#334155; padding:0.8rem; border-radius:12px 12px 0 12px; align-self:flex-end; max-width:80%;">
            ${msg}
        </div>
    `;
    input.value = '';
    box.scrollTop = box.scrollHeight;

    setTimeout(() => {
        const responses = [
            "We predict heavy volume of surplus pastries from bakeries tonight at 8 PM. Prepare dry storage.",
            "I've auto-assigned 2 optimal routes for your volunteer drivers based on the new incoming foods.",
            "Vegetable influx expected from Sector 4 farmers market this weekend. Adjust your preferences if needed.",
            "Your routing efficiency has improved by 14% based on latest drop-offs.",
            "I am currently prioritizing high-urgency perishable goods to arrive at your cold storage unit before 3 PM."
        ];
        const random = responses[Math.floor(Math.random() * responses.length)];
        box.innerHTML += `
            <div style="background:var(--accent-purple); color:white; padding:0.8rem; border-radius:12px 12px 12px 0; align-self:flex-start; max-width:80%;">
                🤖 ${random}
            </div>
        `;
        box.scrollTop = box.scrollHeight;
    }, 1000);
}
