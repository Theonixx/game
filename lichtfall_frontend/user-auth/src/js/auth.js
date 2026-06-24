document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const authMessage = document.getElementById("authMessage");
    const guestBtn = document.getElementById("guestBtn");

    // Detect if running locally or on a public server
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    
    // TODO: Change this to your deployed backend API URL (e.g. "https://lichtfall-backend.onrender.com")
    const PRODUCTION_API_URL = "https://lichtfall-backend.onrender.com";
    
    const API_BASE_URL = isLocal 
        ? "http://127.0.0.1:8000/api/auth" 
        : `${PRODUCTION_API_URL}/api/auth`;

    // Helper function to display messages in the UI
    function showMessage(message, isError = true) {
        authMessage.style.display = "block";
        authMessage.textContent = message;
        authMessage.style.color = isError ? "#ff4d4d" : "#4dff4d";
        authMessage.style.border = `1px solid ${isError ? "#ff4d4d" : "#4dff4d"}`;
        authMessage.style.padding = "10px";
        authMessage.style.marginBottom = "15px";
        authMessage.style.borderRadius = "5px";
        authMessage.style.backgroundColor = "rgba(0,0,0,0.5)";
    }

    // --- REGISTRATION FLOW ---
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("registerUsername").value;
            const email = document.getElementById("registerEmail").value;
            const password = document.getElementById("registerPassword").value;

            try {
                const response = await fetch(`${API_BASE_URL}/register/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                if (response.status === 201) {
                    showMessage("Account created successfully! Redirecting to login...", false);
                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 2000);
                } else {
                    // Display specific error messages from Django (e.g., username taken)
                    let errorMsg = "Registration failed.";
                    if (data.username) errorMsg = `Username: ${data.username[0]}`;
                    else if (data.email) errorMsg = `Email: ${data.email[0]}`;
                    else if (data.password) errorMsg = `Password: ${data.password[0]}`;
                    showMessage(errorMsg);
                }
            } catch (error) {
                showMessage("A network error occurred. Is the backend running?");
                console.error("Registration error:", error);
            }
        });
    }

    // --- LOGIN FLOW ---
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("loginUsername").value;
            const password = document.getElementById("loginPassword").value;

            try {
                const response = await fetch(`${API_BASE_URL}/login/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // Save the username for pure Django API requests
                    localStorage.setItem("username", data.username);
                    localStorage.removeItem("refreshToken"); // cleanup old JWT
                    showMessage("Login successful! Entering the game...", false);
                    setTimeout(() => {
                        window.location.href = "../homepage/mainPage.html";
                    }, 1000);
                } else {
                    showMessage("Invalid credentials. Please try again.");
                }
            } catch (error) {
                showMessage("A network error occurred. Is the backend running?");
                console.error("Login error:", error);
            }
        });
    }

    // --- GUEST FLOW ---
    if (guestBtn) {
        guestBtn.addEventListener("click", async () => {
            // Generate a random guest account
            const guestUsername = "Guest_" + Math.floor(Math.random() * 1000000);
            const guestEmail = guestUsername + "@lichtfall.local";
            const guestPassword = "guestpassword123";

            try {
                // Automatically register the guest
                const regResponse = await fetch(`${API_BASE_URL}/register/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: guestUsername, email: guestEmail, password: guestPassword })
                });

                if (regResponse.status === 201) {
                    // Log them in immediately
                    const loginResponse = await fetch(`${API_BASE_URL}/login/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ username: guestUsername, password: guestPassword })
                    });
                    
                    if (loginResponse.ok) {
                        localStorage.setItem("username", guestUsername);
                        showMessage("Playing as Guest...", false);
                        setTimeout(() => {
                            window.location.href = "../homepage/mainPage.html";
                        }, 1000);
                    }
                }
            } catch (error) {
                showMessage("Failed to connect to server for guest login.");
            }
        });
    }
});
