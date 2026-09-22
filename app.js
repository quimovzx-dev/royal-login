const API_URL = "/api/index.py";

let mode = "login";

const app = document.getElementById("root");

function render() {
  const isLogin = mode === "login";

  app.innerHTML = `
    <main class="app">
      <section class="auth-card">

        <div class="logo-area">
          <div class="crown">♛</div>
          <div class="logo">ROYAL</div>
          <div class="tagline">Premium Authentication</div>
        </div>

        <h1 class="auth-title">
          ${isLogin ? "Welcome Back" : "Join the Royal Circle"}
        </h1>

        <p class="auth-subtitle">
          ${
            isLogin
              ? "Enter your credentials to continue"
              : "Create your account and enter the realm"
          }
        </p>

        <div id="message"></div>

        <form id="authForm">

          ${
            !isLogin
              ? `
                <div class="form-group">
                  <label class="form-label">Full Name</label>

                  <input
                    id="name"
                    class="form-input"
                    type="text"
                    placeholder="Your name"
                    autocomplete="name"
                    required
                  />
                </div>
              `
              : ""
          }

          <div class="form-group">
            <label class="form-label">Email Address</label>

            <input
              id="email"
              class="form-input"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>

            <div class="input-wrapper">
              <input
                id="password"
                class="form-input"
                type="password"
                placeholder="${
                  isLogin
                    ? "Enter your password"
                    : "Minimum 8 characters"
                }"
                autocomplete="${
                  isLogin
                    ? "current-password"
                    : "new-password"
                }"
                required
              />

              <button
                type="button"
                class="password-toggle"
                id="togglePassword"
              >
                SHOW
              </button>
            </div>
          </div>

          ${
            isLogin
              ? `
                <div class="form-options">
                  <label class="remember">
                    <input type="checkbox" />
                    Remember me
                  </label>

                  <a href="#" class="forgot">
                    Forgot password?
                  </a>
                </div>
              `
              : ""
          }

          <button
            type="submit"
            class="primary-button"
            id="submitButton"
          >
            ${isLogin ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>

        </form>

        <div class="divider">
          <span>OR</span>
        </div>

        <div class="auth-footer">
          ${
            isLogin
              ? "Don't have an account?"
              : "Already have an account?"
          }

          <button id="switchMode">
            ${isLogin ? "Create one" : "Sign in"}
          </button>
        </div>

      </section>
    </main>
  `;

  setupEvents();
}


function setupEvents() {
  const form = document.getElementById("authForm");
  const toggle = document.getElementById("togglePassword");
  const switchButton = document.getElementById("switchMode");

  toggle.addEventListener("click", () => {
    const password = document.getElementById("password");

    if (password.type === "password") {
      password.type = "text";
      toggle.textContent = "HIDE";
    } else {
      password.type = "password";
      toggle.textContent = "SHOW";
    }
  });

  switchButton.addEventListener("click", () => {
    mode = mode === "login" ? "register" : "login";
    render();
  });

  form.addEventListener("submit", handleSubmit);
}


async function handleSubmit(event) {
  event.preventDefault();

  const submitButton = document.getElementById("submitButton");
  const message = document.getElementById("message");

  const email = document
    .getElementById("email")
    .value
    .trim();

  const password = document
    .getElementById("password")
    .value;

  let payload;

  if (mode === "register") {
    const name = document
      .getElementById("name")
      .value
      .trim();

    if (name.length < 2) {
      showError("Please enter your name.");
      return;
    }

    if (password.length < 8) {
      showError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    payload = {
      name,
      email,
      password
    };
  } else {
    payload = {
      email,
      password
    };
  }

  submitButton.disabled = true;

  submitButton.innerHTML = `
    <span class="loading">
      <span class="spinner"></span>
      ${
        mode === "login"
          ? "SIGNING IN"
          : "CREATING ACCOUNT"
      }
    </span>
  `;

  try {
    const endpoint =
      mode === "login"
        ? `${API_URL}/login`
        : `${API_URL}/register`;

    const response = await fetch(endpoint, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Something went wrong."
      );
    }

    localStorage.setItem(
      "royal_token",
      data.token
    );

    localStorage.setItem(
      "royal_user",
      JSON.stringify(data.user)
    );

    showSuccess(
      mode === "login"
        ? "Welcome back. Entering the royal realm..."
        : "Your royal account has been created."
    );

    setTimeout(() => {
      showDashboard(data.user);
    }, 700);

  } catch (error) {
    showError(
      error.message ||
      "Unable to connect to the server."
    );

    resetButton();
  }
}


function showError(message) {
  const container =
    document.getElementById("message");

  if (!container) return;

  container.innerHTML = `
    <div class="error-message">
      ${escapeHTML(message)}
    </div>
  `;
}


function showSuccess(message) {
  const container =
    document.getElementById("message");

  if (!container) return;

  container.innerHTML = `
    <div class="success-message">
      ${escapeHTML(message)}
    </div>
  `;
}


function resetButton() {
  const button =
    document.getElementById("submitButton");

  if (!button) return;

  button.disabled = false;

  button.textContent =
    mode === "login"
      ? "SIGN IN"
      : "CREATE ACCOUNT";
}


function showDashboard(user) {
  app.innerHTML = `
    <main class="dashboard">

      <section class="dashboard-card">

        <div class="crown">♛</div>

        <h1 class="dashboard-title">
          Welcome, ${escapeHTML(user.name)}
        </h1>

        <p class="dashboard-text">
          You are successfully authenticated.
        </p>

        <button
          class="logout-button"
          id="logoutButton"
        >
          LOG OUT
        </button>

      </section>

    </main>
  `;

  document
    .getElementById("logoutButton")
    .addEventListener("click", logout);
}


function logout() {
  localStorage.removeItem("royal_token");
  localStorage.removeItem("royal_user");

  mode = "login";

  render();
}


function escapeHTML(value) {
  const div = document.createElement("div");

  div.textContent = value;

  return div.innerHTML;
}


/*
  Check if a user is already logged in.
*/

function checkExistingSession() {
  const token =
    localStorage.getItem("royal_token");

  const user =
    localStorage.getItem("royal_user");

  if (!token || !user) {
    render();
    return;
  }

  try {
    const parsedUser = JSON.parse(user);

    showDashboard(parsedUser);

  } catch {
    localStorage.removeItem("royal_token");
    localStorage.removeItem("royal_user");

    render();
  }
}


checkExistingSession();
