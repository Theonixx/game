# Specification: Frontend-Backend Authentication Integration

## 1. Overview
This specification defines the integration between the existing frontend HTML (`login.html` and `register.html`) and the Django REST Framework backend. It covers the JavaScript logic required to handle form submissions, make asynchronous API calls, store JWT access tokens, and handle UI error states.

## 2. Backend Endpoints (Django)
The backend is already configured to accept these requests natively at the following endpoints:
*   **Register URL**: `POST http://127.0.0.1:8000/api/auth/register/`
    *   **Payload**: `{ "username": "...", "email": "...", "password": "..." }`
    *   **Success Response**: `201 Created`
*   **Login URL**: `POST http://127.0.0.1:8000/api/auth/login/`
    *   **Payload**: `{ "username": "...", "password": "..." }`
    *   **Success Response**: `200 OK`, `{ "access": "<jwt_token>", "refresh": "<jwt_token>" }`

## 3. Frontend Logic (`auth.js`)
A single JavaScript file (`src/js/auth.js`) will handle the logic for both the Login and Registration pages by checking which form currently exists on the DOM.

### 3.1 Registration Flow
1.  **Event Listener**: Attach a `submit` event listener to `#registerForm`.
2.  **Prevent Default**: Prevent the page from reloading.
3.  **Data Extraction**: Extract `username`, `email`, and `password` from the input fields.
4.  **Fetch Request**: Send a `POST` request to the Register URL using the `fetch()` API with `Content-Type: application/json`.
5.  **Success Handling**: If the response is `201 Created`, display a success message in `#authMessage` and automatically redirect the user to `login.html` after a short delay.
6.  **Error Handling**: If the response is `400 Bad Request` (e.g., username taken, invalid email), parse the JSON error response and display the specific errors inside `#authMessage`.

### 3.2 Login Flow
1.  **Event Listener**: Attach a `submit` event listener to `#loginForm`.
2.  **Prevent Default**: Prevent the page from reloading.
3.  **Data Extraction**: Extract `username` and `password` from the input fields.
4.  **Fetch Request**: Send a `POST` request to the Login URL.
5.  **Success Handling**: 
    *   If the response is `200 OK`, extract the `access` and `refresh` tokens from the response JSON.
    *   Store these tokens securely in the browser's `localStorage` (e.g., `localStorage.setItem('accessToken', data.access)`).
    *   Redirect the user to the main game dashboard (`../homepage/mainPage.html`).
6.  **Error Handling**: If the response is `401 Unauthorized` (wrong password or username), display "Invalid credentials" in `#authMessage`.

### 3.3 Guest Play Flow (Optional/Future)
1.  **Event Listener**: Attach a `click` event listener to `#guestBtn`.
2.  **Logic**: Currently, either bypass authentication and redirect to `mainPage.html` in a localized state, or trigger an endpoint that generates a temporary "Guest" backend session.

## 4. UI/UX Elements
*   **`#authMessage` Container**: This `div` is currently hidden (`display: none;`). The JS will toggle its display to `block` and change its color based on the status:
    *   *Error*: Red text/border.
    *   *Success*: Green text/border.

## 5. Security & State Management
*   **Token Storage**: `localStorage` will be used to hold the JWT.
*   **Authenticated Requests**: Any future requests to the backend (e.g., starting a game, fetching inventory) will require the JS to attach the access token to the HTTP Headers:
    `Authorization: Bearer <accessToken>`
*   **Logout**: To log out, the JS simply needs to remove the tokens from `localStorage` (`localStorage.removeItem('accessToken')`) and redirect the user back to `login.html`.

## 6. Implementation Steps
1.  Create/Open `lichtfall_frontend/user-auth/src/js/auth.js`.
2.  Write the DOM selectors for the forms and message container.
3.  Implement the `registerUser` async function.
4.  Implement the `loginUser` async function.
5.  Test locally by running the frontend via Live Server (or similar) on port `8080` to match the backend CORS settings.
