// ==========================================
// CONFIGURATION
// ==========================================
const API_URL = "https://script.google.com/macros/s/AKfycbz_3FC8B4sxTfdeM7NGCx2NVsh0Vay6HeaBVCcKABcvKlcdPW8Hx0tjn5MJMZlBDxL4/exec"; // REPLACE THIS URL

document.getElementById('registrationForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const errorMsg = document.getElementById('errorMessage');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  errorMsg.classList.add('hidden');
  errorMsg.innerText = '';

  // Gather form data
  const formData = new FormData(form);
  const dataObj = Object.fromEntries(formData.entries());

  // Validate Google Drive Link
  const driveLink = dataObj.googleDriveLink.toLowerCase();
  if (!driveLink.includes("drive.google.com") && !driveLink.includes("docs.google.com")) {
    showError("Please provide a valid Google Drive link for your Pitch Deck.");
    return;
  }

  // Set Loading State
  submitBtn.disabled = true;
  btnText.innerText = "Submitting your registration...";
  btnSpinner.classList.remove('hidden');

  try {
    // Send payload to Google Apps Script
    // We use text/plain content-type so browsers don't trigger CORS Preflight OPTIONS
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "register",
        data: dataObj
      })
    });

    const result = await response.json();

    if (result.success) {
      window.location.href = `success.html?id=${result.registrationId}`;
    } else {
      showError(result.message || "Registration failed. Please try again.");
      resetButton();
    }

  } catch (error) {
    showError("Network error. Please ensure the Apps Script Web App URL is correct.");
    resetButton();
  }

  function showError(msg) {
    errorMsg.innerText = msg;
    errorMsg.classList.remove('hidden');
  }

  function resetButton() {
    submitBtn.disabled = false;
    btnText.innerText = "Submit Registration";
    btnSpinner.classList.add('hidden');
  }
});