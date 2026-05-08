const API_BASE = 'http://localhost:5000/api';
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        currentUser = JSON.parse(userStr);
        if (currentUser.role !== 'Admin') {
            window.location.href = 'login.html';
            return;
        }
        document.getElementById('profileName').textContent = currentUser.name;
        document.getElementById('profileRole').textContent = currentUser.role + ' Mode';

        // Hide other sidebar menus
        document.querySelectorAll('.nav-menu a').forEach(a => {
            if (!a.href.includes('admin-overview')) a.style.display = 'none';
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
        // Fetch stats
        const resStats = await fetch(`${API_BASE}/stats`);
        const dataStats = await resStats.json();
        if (dataStats.success) {
            document.getElementById('statFood').textContent = dataStats.data.totalFoodSaved;
            document.getElementById('statMeals').textContent = dataStats.data.mealsProvided;
            document.getElementById('statCO2').textContent = dataStats.data.co2Reduced;
            document.getElementById('statPartners').textContent = dataStats.data.activePartners;
            document.getElementById('statPartnerDetails').textContent = `${dataStats.data.restaurantCount} Restaurants, ${dataStats.data.ngoCount} NGOs`;
        }

        // Fetch recent items
        const resFoods = await fetch(`${API_BASE}/food`);
        const dataFoods = await resFoods.json();
        if (dataFoods.success) {
            renderRecentMatches(dataFoods.data.slice(0, 10)); // Top 10
        }
    } catch (err) {
        console.error(err);
    }
}

function renderRecentMatches(foods) {
    const list = document.getElementById('adminRecentMatches');
    list.innerHTML = '';

    foods.forEach(f => {
        let urgencyBadge = '';
        if (f.status === 'Expiring') urgencyBadge = '<span class="status-badge bg-red">High Urgency</span>';
        else urgencyBadge = '<span class="status-badge bg-orange">Good Condition</span>';
        
        const donorName = f.donorId ? f.donorId.name : 'Unknown Donor';
        const dateStr = new Date(f.createdAt).toLocaleDateString();

        const item = document.createElement('div');
        item.className = 'match-item';
        item.style.padding = '1.5rem 0';
        
        item.innerHTML = `
            <div class="match-info" style="width:100%;">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.8rem;">
                    ${urgencyBadge}
                    <span style="color:var(--text-muted); font-size:0.8rem;">${dateStr}</span>
                </div>
                <h4>${f.name} (${f.quantity} ${f.unit || 'kg'})</h4>
                <p style="display:flex; align-items:center; gap:0.5rem;">${donorName} <span style="color:var(--text-muted);">→</span> Status: ${f.deliveryStatus}</p>
            </div>
        `;
        list.appendChild(item);
    });
}
