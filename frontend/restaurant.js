// Restaurant Panel Logic

const API_BASE = 'http://localhost:5000/api';
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        currentUser = JSON.parse(userStr);
        if (currentUser.role !== 'Restaurant') {
            window.location.href = 'login.html';
            return;
        }
        document.getElementById('profileName').textContent = currentUser.name;
        document.getElementById('profileRole').textContent = currentUser.role + ' Mode';
        
        // Hide other sidebar menus
        document.querySelectorAll('.nav-menu a').forEach(a => {
            if (!a.href.includes('restaurant-portal')) a.style.display = 'none';
        });

        loadDashboard();
    } else {
        window.location.href = 'login.html';
    }
});

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

async function loadDashboard() {
    try {
        const res = await fetch(`${API_BASE}/food?donorId=${currentUser._id}`);
        const data = await res.json();
        if (data.success) {
            renderRecentDonations(data.data);
        }
        
        loadNgoRequests();
        
        // Populate static settings
        document.getElementById('setOrg').value = currentUser.name;
        document.getElementById('setContact').value = currentUser.contactDetails || 'N/A';
        document.getElementById('setLoc').value = currentUser.location || 'N/A';
        
    } catch (err) {
        console.error(err);
    }
}

function renderRecentDonations(foods) {
    const activeList = document.getElementById('activeInventoryList');
    const pickupList = document.getElementById('enRouteList');
    const completedList = document.getElementById('completedDonationsList');
    
    activeList.innerHTML = '';
    pickupList.innerHTML = '';
    completedList.innerHTML = '';
    
    let taxTotal = 0;
    
    const pendingFoods = [];
    const enRouteFoods = [];
    const completedFoods = [];

    foods.forEach(f => {
        if (f.deliveryStatus === 'Completed') {
            taxTotal += (f.quantity * 5); // $5 per kg tax deduction estimation
            completedFoods.push(f);
        } else if (f.deliveryStatus === 'EnRoute') {
            enRouteFoods.push(f);
        } else {
            pendingFoods.push(f);
        }
    });

    // Render Pending
    if (pendingFoods.length === 0) {
        activeList.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No active pending items.</p>';
    } else {
        pendingFoods.forEach(f => {
            const item = document.createElement('div');
            item.className = 'match-item';
            item.style.padding = "0.8rem 0";
            item.innerHTML = `
                <div class="match-info">
                    <h4 style="font-size:0.95rem; margin-bottom:0.1rem;">${f.name}</h4>
                    <p style="font-size:0.8rem;">Status: <span style="font-weight:500; color:var(--warning)">${f.deliveryStatus}</span></p>
                </div>
                <div style="text-align:right; display:flex; gap:0.5rem; align-items:center;">
                    <p style="font-weight:600; font-size:0.9rem; margin-right:0.5rem;">${f.quantity} ${f.unit || 'kg'}</p>
                    <button class="outline-btn" onclick="openDeleteModal('${f._id}')" style="padding:0.2rem 0.5rem; color:#ef4444; border-color:#fca5a5;" title="Delete this entry">🗑️</button>
                </div>
            `;
            activeList.appendChild(item);
        });
    }

    // Render En Route Pickup
    if (enRouteFoods.length === 0) {
        pickupList.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No scheduled logicstics pickups.</p>';
    } else {
        enRouteFoods.forEach(f => {
            const item = document.createElement('div');
            item.className = 'match-item';
            item.style.padding = "0.8rem 0";
            item.innerHTML = `
                <div class="match-info">
                    <h4 style="font-size:0.95rem; margin-bottom:0.1rem;">${f.name}</h4>
                    <p style="font-size:0.8rem;">Status: <span style="font-weight:500; color:#0ea5e9;">Driver En-Route 🚚</span></p>
                </div>
                <div style="text-align:right;">
                    <p style="font-weight:600; font-size:0.9rem;">${f.quantity} ${f.unit || 'kg'}</p>
                </div>
            `;
            pickupList.appendChild(item);
        });
    }

    // Render Completed
    if (completedFoods.length === 0) {
        completedList.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No completed donations yet.</p>';
    } else {
        const groups = {};
        completedFoods.forEach(f => {
            const dateStr = new Date(f.updatedAt || f.createdAt).toLocaleDateString();
            if(!groups[dateStr]) groups[dateStr] = {};
            
            const unit = f.unit || 'kg';
            const key = f.name.trim() + '|' + unit;
            if(!groups[dateStr][key]) {
                groups[dateStr][key] = { name: f.name.trim(), quantity: 0, unit: unit };
            }
            groups[dateStr][key].quantity += Number(f.quantity);
        });

        Object.keys(groups).forEach(date => {
            const dailyBlock = document.createElement('div');
            dailyBlock.style.cssText = "border:1px solid rgba(16, 185, 129, 0.2); border-radius:8px; padding:1.2rem; margin-bottom:1.5rem; background:rgba(16, 185, 129, 0.02);";
            
            let dailyKg = 0;
            let dailyTax = 0;
            let itemsHtml = '';
            
            Object.values(groups[date]).forEach(item => {
                const kg = Number(item.quantity);
                dailyKg += kg;
                dailyTax += (kg * 5);
                itemsHtml += `
                    <div style="display:flex; justify-content:space-between; padding: 0.5rem 0; border-bottom:1px dashed rgba(16, 185, 129, 0.2);">
                        <p style="font-weight:500; font-size:0.9rem; color:var(--text-main); margin:0;">${item.name}</p>
                        <p style="font-weight:600; font-size:0.9rem; color:var(--text-main);">${kg} ${item.unit}</p>
                    </div>
                `;
            });

            dailyBlock.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem; padding-bottom:0.8rem; border-bottom:2px solid rgba(16, 185, 129, 0.2);">
                    <h4 style="font-size:1.05rem; color:var(--primary); display:flex; align-items:center; gap:0.5rem;">📅 ${date}</h4>
                    <div style="text-align:right;">
                        <span style="display:block; font-weight:700; font-size:0.9rem; color:var(--primary);">+ $${dailyTax.toFixed(2)} Tax Impact</span>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${dailyKg} kg Donated Total</span>
                    </div>
                </div>
                <div>
                    ${itemsHtml}
                </div>
            `;
            completedList.appendChild(dailyBlock);
        });
    }

    document.getElementById('totalTaxImpact').textContent = `$${taxTotal.toFixed(2)}`;
}

async function submitFood() {
    const name = document.getElementById('foodName').value;
    const quantity = document.getElementById('foodQty').value;
    const unit = document.getElementById('foodUnit').value;
    const days = document.getElementById('foodDays').value;
    const storage = document.getElementById('foodStorage').value;
    const hoursValid = document.getElementById('foodHoursValid').value;

    if (!name || !quantity || !days) {
        alert("Please fill all fields!");
        return;
    }

    try {
        const payload = {
            name,
            quantity: Number(quantity),
            unit: unit || 'kg',
            days: Number(days),
            storage,
            hoursValid: Number(hoursValid) || null,
            donorId: currentUser._id
        };

        const res = await fetch(`${API_BASE}/food/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            alert("Food item logged successfully!");
            document.getElementById('manualEntryModal').style.display='none';
            loadDashboard(); // reload table
            
            // clear form
            document.getElementById('foodName').value = '';
            document.getElementById('foodQty').value = '';
            document.getElementById('foodDays').value = '';
        } else {
            alert("Error: " + data.error);
        }
    } catch (e) {
        alert("Server error");
    }
}

let pendingDeleteId = null;

function openDeleteModal(id) {
    pendingDeleteId = id;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
    pendingDeleteId = null;
    document.getElementById('deleteModal').style.display = 'none';
}

// Bind process event
document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) {
        confirmBtn.onclick = processDelete;
    }
});

// Polyfill if DOMContentLoaded already fired 
setTimeout(() => {
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) confirmBtn.onclick = processDelete;
}, 500);

async function processDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    closeDeleteModal();

    try {
        const res = await fetch(`${API_BASE}/food/${id}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            loadDashboard(); // reload UI seamlessly
        } else {
            alert(data.error || "Could not delete food. It may have already been claimed.");
        }
    } catch (e) {
        alert("Server Error while attempting to delete.");
    }
}

window.switchRestTab = function(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
    document.getElementById('tab-' + tabId).style.display = 'block';
    
    const titles = {
        'home': 'Home',
        'addFood': 'Log Surplus',
        'donations': 'Active Donations',
        'pickup': 'Pickup Status',
        'requests': 'Direct Requests',
        'reports': 'Historical Reports',
        'settings': 'Account Settings'
    };
    const titleEl = document.getElementById('pageTitle');
    if(titleEl) titleEl.textContent = titles[tabId];
    if (el) el.classList.add('active');
}

async function loadNgoRequests() {
    try {
        const res = await fetch(`${API_BASE}/requests/restaurant/${currentUser._id}`);
        const data = await res.json();
        const list = document.getElementById('ngoRequestsList');
        if (!list) return;
        
        list.innerHTML = '';
        if (data.success && data.data.length > 0) {
            data.data.forEach(req => {
                const item = document.createElement('div');
                item.style.cssText = "border:1px solid rgba(16,185,129,0.2); background:rgba(16,185,129,0.02); padding:1rem; border-radius:8px; margin-bottom:1rem;";
                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h4 style="margin-bottom:0.2rem; display:flex; align-items:center; gap:0.5rem;"><span style="color:var(--primary);">🏢 ${req.ngoId.name}</span> <span class="status-badge" style="background:#fefce8; color:#a16207;">Urgency: ${req.urgencyLevel}</span></h4>
                            <p style="color:var(--text-main); font-weight:600;">Needs: ${req.quantityNeeded} ${req.unit} of ${req.foodType}</p>
                            <p style="color:var(--text-muted); font-size:0.8rem; margin-top:0.2rem;">Location: ${req.ngoId.location}</p>
                        </div>
                        <button class="btn bg-green" onclick="fulfillNgoRequest('${req._id}')">Fulfill Request</button>
                    </div>
                `;
                list.appendChild(item);
            });
        } else {
            list.innerHTML = '<p style="color:var(--text-muted);">No active direct requests matching your profile.</p>';
        }
    } catch(err) {
        console.error(err);
    }
}

window.fulfillNgoRequest = async function(id) {
    try {
        const res = await fetch(`${API_BASE}/requests/fulfill/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restId: currentUser._id })
        });
        const data = await res.json();
        if(data.success) {
            alert('Request Fulfilled Successfully! Logistics route auto-generated.');
            loadDashboard(); // Refresh all state
        } else {
            alert(data.error);
        }
    } catch(err) {
        alert("Server Error");
    }
}

