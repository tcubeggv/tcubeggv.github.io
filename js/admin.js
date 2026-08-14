// ==========================================
// CONFIGURATION
// ==========================================
// IMPORTANT: Replace this with your actual Google Apps Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbz_3FC8B4sxTfdeM7NGCx2NVsh0Vay6HeaBVCcKABcvKlcdPW8Hx0tjn5MJMZlBDxL4/exec"; 

let allData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 10;

// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('viewModal');

// Check for active session on page load
window.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem('adminToken');
  if (token) {
    loadDashboardData(token);
  }
});

// ==========================================
// LOGIN LOGIC (Secure - No hardcoded passwords)
// ==========================================
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Read exactly what the user typed in the inputs
  const user = document.getElementById('adminUser').value;
  const pass = document.getElementById('adminPass').value;
  
  const btn = document.getElementById('loginBtn');
  const spinner = document.getElementById('loginSpinner');
  const errorMsg = document.getElementById('loginError');
  
  btn.disabled = true;
  spinner.classList.remove('hidden');
  errorMsg.classList.add('hidden');

  try {
    // Securely send the login attempt to the Apps Script backend
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "login", username: user, password: pass })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Store the secure session token returned by the backend
      sessionStorage.setItem('adminToken', result.token);
      loadDashboardData(result.token);
    } else {
      // Show error if credentials don't match the Google Sheet
      errorMsg.innerText = result.message;
      errorMsg.classList.remove('hidden');
    }
  } catch (error) {
    errorMsg.innerText = "Connection failed. Please check your API URL.";
    errorMsg.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    spinner.classList.add('hidden');
  }
});

// ==========================================
// LOGOUT LOGIC
// ==========================================
document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('adminToken');
  dashboardSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
  document.getElementById('adminPass').value = '';
});

// ==========================================
// FETCH DASHBOARD DATA
// ==========================================
async function loadDashboardData(token) {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading records...</td></tr>';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "get_registrations", token: token })
    });
    
    const result = await response.json();
    
    if (result.success) {
      allData = result.data;
      filteredData = [...allData];
      renderTable();
    } else {
      // If token expired or invalid, log out automatically
      alert(result.message);
      document.getElementById('logoutBtn').click();
    }
  } catch (err) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:red;">Error loading data from server.</td></tr>';
  }
}

// ==========================================
// RENDER TABLE & PAGINATION
// ==========================================
function renderTable() {
  tableBody.innerHTML = '';
  
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedData = filteredData.slice(start, end);

  if (paginatedData.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No records found.</td></tr>';
    updatePagination();
    return;
  }

  paginatedData.forEach((row, index) => {
    // Format timestamp securely
    let dateStr = row["Timestamp"] ? new Date(row["Timestamp"]).toLocaleDateString() : 'N/A';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${row["Registration ID"] || 'N/A'}</strong></td>
      <td>${dateStr}</td>
      <td>${row["Startup Name"] || 'N/A'}</td>
      <td>${row["Founder/Team Name"] || 'N/A'}</td>
      <td>${row["Email"] || 'N/A'}</td>
      <td>
        ${row["Google Drive Link"] && row["Google Drive Link"] !== "N/A" 
          ? `<a href="${row["Google Drive Link"]}" target="_blank" class="btn btn-outline btn-sm">Open Link</a>` 
          : 'No Link'}
      </td>
      <td><button class="btn btn-primary btn-sm" onclick="viewDetails(${start + index})">View</button></td>
    `;
    tableBody.appendChild(tr);
  });

  updatePagination();
}

function updatePagination() {
  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  document.getElementById('pageInfo').innerText = `Page ${currentPage} of ${totalPages}`;
  
  document.getElementById('prevBtn').disabled = currentPage === 1;
  document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

// Pagination Controls
document.getElementById('prevBtn').addEventListener('click', () => { 
  if(currentPage > 1) { 
    currentPage--; 
    renderTable(); 
  } 
});

document.getElementById('nextBtn').addEventListener('click', () => { 
  const total = Math.ceil(filteredData.length / rowsPerPage); 
  if(currentPage < total) { 
    currentPage++; 
    renderTable(); 
  } 
});

// ==========================================
// SEARCH & FILTER
// ==========================================
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  
  filteredData = allData.filter(row => {
    return (
      (row["Registration ID"] && row["Registration ID"].toString().toLowerCase().includes(query)) ||
      (row["Startup Name"] && row["Startup Name"].toString().toLowerCase().includes(query)) ||
      (row["Founder/Team Name"] && row["Founder/Team Name"].toString().toLowerCase().includes(query)) ||
      (row["Email"] && row["Email"].toString().toLowerCase().includes(query))
    );
  });
  
  currentPage = 1; // Reset to page 1 on new search
  renderTable();
});

// ==========================================
// MODAL VIEW DETAILS
// ==========================================
window.viewDetails = function(dataIndex) {
  const row = filteredData[dataIndex];
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = '';

  const skipKeys = ["Timestamp"]; // Keys we don't want to show as raw text
  
  for (const [key, value] of Object.entries(row)) {
    if (skipKeys.includes(key)) continue;
    
    let displayVal = value;
    
    // Automatically turn URLs into clickable links for specific fields
    if (key === "Google Drive Link" || key === "Demo Link" || key === "Website/GitHub") {
      if(value && value !== "N/A" && value.trim() !== "") {
        displayVal = `<a href="${value}" target="_blank" style="color: var(--primary); text-decoration: underline;">Open Link</a>`;
      } else {
        displayVal = 'N/A';
      }
    }

    // Replace line breaks with HTML breaks for textareas like Problem Statement
    if (typeof displayVal === 'string' && displayVal.includes('\n') && !displayVal.includes('<a')) {
       displayVal = displayVal.replace(/\n/g, '<br>');
    }

    modalBody.innerHTML += `
      <div class="detail-grid">
        <strong>${key}:</strong>
        <span>${displayVal || 'N/A'}</span>
      </div>
    `;
  }
  
  modal.classList.remove('hidden');
}

// Close Modal Controls
document.getElementById('closeModal').addEventListener('click', () => modal.classList.add('hidden'));
window.addEventListener('click', (e) => { 
  if (e.target === modal) modal.classList.add('hidden'); 
});

// ==========================================
// EXPORT CSV
// ==========================================
document.getElementById('exportBtn').addEventListener('click', () => {
  if(filteredData.length === 0) return;
  
  const headers = Object.keys(filteredData[0]);
  const csvRows = [headers.join(',')];
  
  filteredData.forEach(row => {
    const values = headers.map(header => {
      // Escape quotes and wrap in quotes to handle commas in text
      const val = row[header] ? row[header].toString().replace(/"/g, '""') : "";
      return `"${val}"`;
    });
    csvRows.push(values.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `registrations_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});