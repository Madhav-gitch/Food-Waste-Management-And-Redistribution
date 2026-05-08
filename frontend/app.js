const API_URL = 'http://localhost:5000/api/food';
const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

// DOM Elements
const totalItemsEl = document.getElementById('totalItems');
const expiringItemsEl = document.getElementById('expiringItems');
const donatedItemsEl = document.getElementById('donatedItems');
const foodTableBody = document.getElementById('foodTableBody');
const foodForm = document.getElementById('foodForm');
const toast = document.getElementById('toast');

// Data
let foods = [];

// Matter.js Module Aliases
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Mouse = Matter.Mouse,
      MouseConstraint = Matter.MouseConstraint,
      Events = Matter.Events;

let engine, render, runner;
let binBody;
let physicsBodies = {}; // Map mongo _id to matter.js body

// Initialize Matter.js
function initPhysics() {
    if (typeof IS_ADMIN === 'undefined' || !IS_ADMIN) return;
    
    const canvasWrap = document.getElementById('physics-canvas');
    if (!canvasWrap) return;
    const width = canvasWrap.clientWidth;
    const height = canvasWrap.clientHeight;

    engine = Engine.create();
    
    render = Render.create({
        element: canvasWrap,
        engine: engine,
        options: {
            width,
            height,
            wireframes: false,
            background: 'transparent'
        }
    });

    // Create boundaries
    const ground = Bodies.rectangle(width / 2, height + 25, width, 50, { isStatic: true });
    const wallLeft = Bodies.rectangle(-25, height / 2, 50, height, { isStatic: true });
    const wallRight = Bodies.rectangle(width + 25, height / 2, 50, height, { isStatic: true });

    // Donation Bin (Sensor Region at the bottom right)
    const binWidth = 150;
    const binHeight = 80;
    binBody = Bodies.rectangle(width - 80, height - 40, binWidth, binHeight, {
        isStatic: true,
        isSensor: true, // Only detects collisions, doesn't bounce
        label: 'donation_bin',
        render: {
            fillStyle: 'rgba(99, 102, 241, 0.4)',
            strokeStyle: '#4f46e5',
            lineWidth: 2
        }
    });

    // Add bin text label (simulation hack)
    const binLabel = Bodies.rectangle(width - 80, height - 40, binWidth, binHeight, {
        isStatic: true,
        isSensor: true,
        render: {
            sprite: {
                texture: createTextTexture("📥 Donate Here!", binWidth, binHeight)
            }
        }
    });

    Composite.add(engine.world, [ground, wallLeft, wallRight, binBody, binLabel]);

    // Add Mouse Controls for Dragging
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.2,
            render: { visible: false }
        }
    });
    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse; // keep the mouse in sync with rendering

    // Handle Collisions (Dropping item in bin)
    Events.on(engine, 'collisionStart', function(event) {
        const pairs = event.pairs;
        
        for (let i = 0; i < pairs.length; i++) {
            const bodyA = pairs[i].bodyA;
            const bodyB = pairs[i].bodyB;

            // Check if one body is the bin and the other is a food item
            if (bodyA.label === 'donation_bin' || bodyB.label === 'donation_bin') {
                const foodBody = bodyA.label === 'donation_bin' ? bodyB : bodyA;
                
                if (foodBody.label === 'food_item' && !foodBody.isDonating) {
                    foodBody.isDonating = true;
                    Composite.remove(engine.world, foodBody);
                    handlePhysicsDonation(foodBody.foodId);
                }
            }
        }
    });

    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);
}

// Create a texture with text for Matter.js bodies
function createTextTexture(text, width=100, height=40, color="#f59e0b") {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 10);
    ctx.fill();
    
    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
    
    return canvas.toDataURL();
}

function spawnFoodBody(food) {
    if (physicsBodies[food._id]) return; // already spawned

    const canvasWrap = document.getElementById('physics-canvas');
    const width = canvasWrap.clientWidth;
    
    const x = Math.random() * (width - 100) + 50;
    const y = -50; // starts above

    const body = Bodies.rectangle(x, y, 100, 40, {
        label: 'food_item',
        restitution: 0.6,
        render: {
            sprite: {
                texture: createTextTexture(`${food.name} (${food.quantity})`, 100, 40, '#f59e0b')
            }
        }
    });
    
    body.foodId = food._id;
    body.isDonating = false;
    
    physicsBodies[food._id] = body;
    Composite.add(engine.world, body);
}

function clearDonatedBodies() {
    for (let id in physicsBodies) {
        let food = foods.find(f => f._id === id);
        if (food && food.donated && physicsBodies[id]) {
            Composite.remove(engine.world, physicsBodies[id]);
            delete physicsBodies[id];
        }
    }
}

// --------- APP LOGIC ---------

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast hidden';
    }, 3000);
}

async function fetchFoods() {
    try {
        let url = API_URL;
        if (currentUser && currentUser.role === 'Restaurant') {
            url = `${API_URL}?donorId=${currentUser._id}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            foods = data.data;
            renderDashboard();
        }
    } catch (error) {
        console.error('Error fetching foods:', error);
        showToast('Failed to load data', 'error');
    }
}

function renderDashboard() {
    // Stats
    const total = foods.length;
    const expiring = foods.filter(f => f.status === 'Expiring' && !f.donated).length;
    const donated = foods.filter(f => f.donated).length;

    totalItemsEl.textContent = total;
    expiringItemsEl.textContent = expiring;
    donatedItemsEl.textContent = donated;

    if (expiring > 0) {
        showToast(`Warning: ${expiring} item(s) expiring soon!`, 'warning');
    }

    // Table
    foodTableBody.innerHTML = '';
    
    // Clear old physics bodies if they are donated
    if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) clearDonatedBodies();

    foods.forEach(food => {
        const tr = document.createElement('tr');
        
        let statusDisplay = food.status;
        let statusClass = `status-${food.status.toLowerCase()}`;
        
        if (food.donated) {
            statusDisplay = 'Donated';
            statusClass = 'status-donated';
        }

        const isDonatable = food.status === 'Expiring' && !food.donated;

        tr.innerHTML = `
            <td><strong>${food.name}</strong></td>
            <td>${food.quantity}</td>
            <td>${food.days}</td>
            <td>${food.storage}</td>
            <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
            <td>
                <button class="donate-btn" 
                        onclick="donateItem('${food._id}')" 
                        ${!isDonatable ? 'disabled' : ''}>
                    ${food.donated ? 'Donated' : 'Donate'}
                </button>
            </td>
        `;
        foodTableBody.appendChild(tr);

        // Physics Logic
        if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN && food.status === 'Expiring' && !food.donated) {
            spawnFoodBody(food);
        }
    });
}

// Add Food
foodForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = foodForm.querySelector('button');
    submitBtn.textContent = 'Analyzing...';
    submitBtn.disabled = true;

    const payload = {
        name: document.getElementById('name').value,
        quantity: document.getElementById('quantity').value,
        days: document.getElementById('days').value,
        storage: document.getElementById('storage').value,
        donorId: currentUser ? currentUser._id : undefined
    };

    try {
        const response = await fetch(`${API_URL}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (data.success) {
            showToast('Food analyzed & added successfully!', 'success');
            foodForm.reset();
            fetchFoods();
        } else {
            showToast(data.error || 'Failed to add food', 'error');
        }
    } catch (error) {
        console.error('Add error:', error);
        showToast('Server error', 'error');
    } finally {
        submitBtn.textContent = 'Analyze & Add';
        submitBtn.disabled = false;
    }
});

// Donate Item via List
async function donateItem(id) {
    try {
        const response = await fetch(`${API_URL}/${id}/donate`, {
            method: 'PUT'
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('Item donated successfully! 🎁', 'success');
            fetchFoods();
        }
    } catch (error) {
        showToast('Failed to donate item', 'error');
    }
}

// Donate Item via Physics Engine
async function handlePhysicsDonation(id) {
    try {
        const response = await fetch(`${API_URL}/${id}/donate`, {
            method: 'PUT'
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('Physics Donation Successful! 🎁', 'success');
            fetchFoods();
        }
    } catch (error) {
        showToast('Failed to donate item via drag/drop', 'error');
    }
}

// Init
window.addEventListener('load', () => {
    initPhysics();
    fetchFoods();
    
    // Auto-refresh every 30 seconds
    setInterval(fetchFoods, 30000);
});

// Handle window resize for physics canvas
window.addEventListener('resize', () => {
    if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN && render && engine) {
        const canvasWrap = document.getElementById('physics-canvas');
        if (canvasWrap) {
            render.canvas.width = canvasWrap.clientWidth;
            render.canvas.height = canvasWrap.clientHeight;
        }
    }
});
