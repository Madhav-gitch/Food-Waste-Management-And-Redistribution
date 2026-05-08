const FEEDBACK_API_URL = 'http://localhost:5000/api/feedback';
const toast = document.getElementById('toast');

// We use localStorage to remember if they clicked Admin or User in the portal.
// For simplicity, if they clicked admin, we store role='admin'
const role = localStorage.getItem('role') || 'user'; 

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast hidden';
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    // Generate Sidebar Links based on role
    const nav = document.getElementById('feedbackNav');
    if (role === 'admin') {
        nav.innerHTML = `
            <a href="admin-dashboard.html">Admin Dashboard</a>
            <a href="feedback.html" class="active">View Feedback</a>
            <a href="support.html">Help & Support</a>
            <a href="index.html" class="logout-link">Logout</a>
        `;
        document.getElementById('adminFeedbackSection').style.display = 'block';
        fetchFeedback();
    } else {
        nav.innerHTML = `
            <a href="user-dashboard.html">Dashboard</a>
            <a href="feedback.html" class="active">Give Feedback</a>
            <a href="support.html">Help & Support</a>
            <a href="index.html" class="logout-link">Logout</a>
        `;
        document.getElementById('userFeedbackSection').style.display = 'block';
    }
});

// Setup Form Submission
const form = document.getElementById('feedbackForm');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        btn.textContent = 'Submitting...';
        btn.disabled = true;

        const payload = {
            name: document.getElementById('feedbackName').value,
            rating: document.getElementById('feedbackRating').value,
            message: document.getElementById('feedbackMessage').value
        };

        try {
            const res = await fetch(FEEDBACK_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showToast('Thank you for your feedback!', 'success');
                form.reset();
            } else {
                showToast('Failed to submit', 'error');
            }
        } catch (err) {
            showToast('Server Error', 'error');
        } finally {
            btn.textContent = 'Submit Feedback';
            btn.disabled = false;
        }
    });
}

// Fetch Feedback for Admins
async function fetchFeedback() {
    try {
        const res = await fetch(FEEDBACK_API_URL);
        const data = await res.json();
        
        if (data.success) {
            const tbody = document.getElementById('feedbackTableBody');
            tbody.innerHTML = '';
            
            data.data.forEach(item => {
                const tr = document.createElement('tr');
                const d = new Date(item.createdAt).toLocaleDateString();
                
                tr.innerHTML = `
                    <td><strong>${item.name}</strong></td>
                    <td><span style="color: gold;">${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}</span></td>
                    <td style="max-width:300px; white-space:pre-wrap;">${item.message}</td>
                    <td>${d}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        showToast('Error loading feedback', 'error');
    }
}
