// Retirement Cash Flow Planner JS
// Placeholder for chart and data logic

document.addEventListener('DOMContentLoaded', function () {
  const ctx = document.getElementById('projectionChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array.from({length: 30}, (_, i) => 2025 + i),
      datasets: [
        {
          label: 'Net Worth',
          data: Array(30).fill(0),
          borderColor: '#58a6ff',
          backgroundColor: 'rgba(88,166,255,0.1)',
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: '#e0e0e0'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#e0e0e0' },
          grid: { color: '#2c313c' }
        },
        y: {
          ticks: { color: '#e0e0e0' },
          grid: { color: '#2c313c' }
        }
      }
    }
  });
});

// Data Model
const ITEM_TYPES = ['inflows', 'outflows', 'bank', 'investments', 'property', 'vehicles', 'rentals'];

function getDefaultItem() {
  return {
    type: '',
    category: '',
    name: '',
    amount: 0,
    rate: 0,
    startYear: 2025,
    endYear: 2055,
    createdAt: new Date().toISOString()
  };
}

// LocalStorage Logic
function loadItems() {
  const data = localStorage.getItem('rcfa_items');
  return data ? JSON.parse(data) : [];
}

function saveItems(items) {
  localStorage.setItem('rcfa_items', JSON.stringify(items));
}

// CRUD Operations
function addItem(item) {
  const items = loadItems();
  items.push(item);
  saveItems(items);
  renderItems();
}

function editItem(index, updatedItem) {
  const items = loadItems();
  items[index] = updatedItem;
  saveItems(items);
  renderItems();
}

function deleteItem(index) {
  const items = loadItems();
  items.splice(index, 1);
  saveItems(items);
  renderItems();
}

// Section Switching
let currentSection = 'dashboard';
function switchSection(section) {
  currentSection = section;
  renderItems();
}

// Render Items and Badges
function renderItems() {
  const items = loadItems();
  // Filter by section
  let filtered = items;
  if (currentSection && currentSection !== 'dashboard') {
    filtered = items.filter(item => item.type === currentSection);
  }
  // Render item list
  const itemList = document.getElementById('itemList');
  itemList.innerHTML = filtered.length ? filtered.map((item, idx) => `
    <div class="card bg-dark text-light border-secondary mb-2">
      <div class="card-body d-flex justify-content-between align-items-center">
        <div>
          <strong>${item.name}</strong> <span class="badge bg-secondary">${item.category}</span><br>
          <span class="text-muted">${item.type} | $${item.amount} | ${item.rate}% | ${item.startYear}-${item.endYear}</span>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-primary me-2" onclick="openItemModal(${idx})">Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${idx})">Delete</button>
        </div>
      </div>
    </div>
  `).join('') : '<div class="text-muted">No items found for this section.</div>';

  // Update badges
  ITEM_TYPES.forEach(type => {
    const count = items.filter(item => item.type === type).length;
    document.querySelectorAll(`.nav-link:contains('${capitalize(type)}') .badge`).forEach(badge => {
      badge.textContent = count;
    });
  });

  // Update stats and chart
  const stats = calculateStats(items);
  updateStats(stats);
  updateChart(items);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Stats Calculation
function calculateStats(items) {
  let totalAssets = 0, annualInflow = 0, annualOutflow = 0;
  items.forEach(item => {
    if (['bank', 'investments', 'property', 'vehicles', 'rentals'].includes(item.type)) {
      totalAssets += item.amount;
    } else if (item.type === 'inflows') {
      annualInflow += item.amount;
    } else if (item.type === 'outflows') {
      annualOutflow += item.amount;
    }
  });
  return { totalAssets, annualInflow, annualOutflow };
}

function updateStats(stats) {
  document.querySelector('.card-title:contains("Total Assets")').nextElementSibling.textContent = `$${stats.totalAssets.toLocaleString()}`;
  document.querySelector('.card-title:contains("Annual Inflow")').nextElementSibling.textContent = `$${stats.annualInflow.toLocaleString()}`;
  document.querySelector('.card-title:contains("Annual Outflow")').nextElementSibling.textContent = `$${stats.annualOutflow.toLocaleString()}`;
}

// Chart Update
function updateChart(items) {
  const ctx = document.getElementById('projectionChart').getContext('2d');
  // Calculate net worth projection (simple sum for now)
  const years = Array.from({length: 30}, (_, i) => 2025 + i);
  let netWorth = years.map(() => 0);
  items.forEach(item => {
    for (let y = item.startYear; y <= item.endYear; y++) {
      const idx = y - 2025;
      if (idx >= 0 && idx < netWorth.length) {
        if (['bank', 'investments', 'property', 'vehicles', 'rentals'].includes(item.type)) {
          netWorth[idx] += item.amount * Math.pow(1 + item.rate / 100, y - item.startYear);
        } else if (item.type === 'inflows') {
          netWorth[idx] += item.amount;
        } else if (item.type === 'outflows') {
          netWorth[idx] -= item.amount;
        }
      }
    }
  });
  if (window.projectionChart) {
    window.projectionChart.data.datasets[0].data = netWorth;
    window.projectionChart.update();
  } else {
    window.projectionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Net Worth',
            data: netWorth,
            borderColor: '#58a6ff',
            backgroundColor: 'rgba(88,166,255,0.1)',
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            labels: {
              color: '#e0e0e0'
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#e0e0e0' },
            grid: { color: '#2c313c' }
          },
          y: {
            ticks: { color: '#e0e0e0' },
            grid: { color: '#2c313c' }
          }
        }
      }
    });
  }
}

// Update everything
function renderItems() {
  const items = loadItems();
  // Filter by section
  let filtered = items;
  if (currentSection && currentSection !== 'dashboard') {
    filtered = items.filter(item => item.type === currentSection);
  }
  // Render item list
  const itemList = document.getElementById('itemList');
  itemList.innerHTML = filtered.length ? filtered.map((item, idx) => `
    <div class="card bg-dark text-light border-secondary mb-2">
      <div class="card-body d-flex justify-content-between align-items-center">
        <div>
          <strong>${item.name}</strong> <span class="badge bg-secondary">${item.category}</span><br>
          <span class="text-muted">${item.type} | $${item.amount} | ${item.rate}% | ${item.startYear}-${item.endYear}</span>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-primary me-2" onclick="openItemModal(${idx})">Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${idx})">Delete</button>
        </div>
      </div>
    </div>
  `).join('') : '<div class="text-muted">No items found for this section.</div>';

  // Update badges
  ITEM_TYPES.forEach(type => {
    const count = items.filter(item => item.type === type).length;
    document.querySelectorAll(`.nav-link:contains('${capitalize(type)}') .badge`).forEach(badge => {
      badge.textContent = count;
    });
  });

  // Update stats and chart
  const stats = calculateStats(items);
  updateStats(stats);
  updateChart(items);
}

// SheetJS Excel Import/Export
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const exportBtn = document.getElementById('exportBtn');

importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const workbook = XLSX.read(e.target.result, {type: 'binary'});
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    // Overwrite localStorage
    saveItems(data);
    renderItems();
  };
  reader.readAsBinaryString(file);
});

exportBtn.addEventListener('click', function() {
  const items = loadItems();
  const ws = XLSX.utils.json_to_sheet(items);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Items');
  XLSX.writeFile(wb, 'retirement-cash-flow.xlsx');
});

// Event Listeners (sidebar nav, modal, etc.)
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    const section = this.textContent.trim().toLowerCase().replace(/\s+/g, '');
    switchSection(section);
  });
});

// Initial render
renderItems();
