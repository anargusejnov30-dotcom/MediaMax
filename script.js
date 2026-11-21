"use strict";

(function () {
  const USERS_KEY = "mediaMax_users";
  const SESSION_KEY = "mediaMax_user";
  const REQUESTS_KEY = "mediaMax_requests";

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "");
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i += 1) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  function users() {
    const list = readJson(USERS_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveUsers(list) {
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
  }

  function publicUser(user) {
    return {
      name: String(user.name || "").trim(),
      email: String(user.email || "").trim().toLowerCase(),
      phone: String(user.phone || "").trim()
    };
  }

  function currentUser() {
    const user = readJson(SESSION_KEY, null);
    if (!user || !user.email) return null;
    return publicUser(user);
  }

  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(publicUser(user)));
  }

  function register(data) {
    const email = String(data.email || "").trim().toLowerCase();
    const list = users();
    if (list.some((user) => user.email === email)) {
      return { ok: false, error: "Пользователь с такой почтой уже существует." };
    }
    const record = {
      name: String(data.name || "").trim(),
      email,
      phone: String(data.phone || "").trim(),
      password: hashPassword(String(data.password || ""))
    };
    list.push(record);
    saveUsers(list);
    setSession(record);
    return { ok: true, user: publicUser(record) };
  }

  function login(email, password) {
    const normalized = String(email || "").trim().toLowerCase();
    const list = users();
    const user = list.find((item) => item.email === normalized);
    if (!user) return { ok: false, error: "Неверная почта или пароль." };
    const hashed = hashPassword(String(password || ""));
    const matchesHash = user.password === hashed;
    const matchesPlain = user.password === password;
    if (!matchesHash && !matchesPlain) return { ok: false, error: "Неверная почта или пароль." };
    if (matchesPlain) {
      user.password = hashed;
      saveUsers(list);
    }
    setSession(user);
    return { ok: true, user: publicUser(user) };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function updateProfile(fields) {
    const session = currentUser();
    if (!session) return { ok: false, error: "Сначала войдите в кабинет." };
    const list = users();
    const user = list.find((item) => item.email === session.email);
    if (!user) return { ok: false, error: "Учетная запись не найдена в этом браузере." };
    user.name = String(fields.name || "").trim();
    user.phone = String(fields.phone || "").trim();
    saveUsers(list);
    setSession(user);
    return { ok: true, user: publicUser(user) };
  }

  function saveRequest(entry) {
    const email = String(entry.email || "").trim().toLowerCase();
    if (!email) return null;
    const list = readJson(REQUESTS_KEY, []);
    const requests = Array.isArray(list) ? list : [];
    const item = {
      id: Date.now().toString(36),
      email,
      name: String(entry.name || "").trim(),
      phone: String(entry.phone || "").trim(),
      service: String(entry.service || "").trim(),
      message: String(entry.message || "").trim(),
      createdAt: new Date().toISOString()
    };
    requests.unshift(item);
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests.slice(0, 50)));
    return item;
  }

  function requestsFor(email) {
    const normalized = String(email || "").trim().toLowerCase();
    const list = readJson(REQUESTS_KEY, []);
    return (Array.isArray(list) ? list : []).filter((item) => item.email === normalized);
  }

  window.MediaMaxAuth = {
    currentUser,
    register,
    login,
    logout,
    updateProfile,
    saveRequest,
    requestsFor
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  const EMAIL = "anargusejnov30@gmail.com";

  function isValidEmail(value) {
    const email = String(value || "").trim().toLowerCase();
    if (!email || email.length > 254) return false;
    const parts = email.split("@");
    if (parts.length !== 2) return false;
    const local = parts[0];
    const domain = parts[1];
    if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
    if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return false;
    if (!domain || domain.includes("..") || domain.startsWith(".") || domain.endsWith(".")) return false;
    const labels = domain.split(".");
    if (labels.length < 2 || labels[labels.length - 1].length < 2) return false;
    return labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
  }

  function fieldMessage(input) {
    let node = input.nextElementSibling;
    if (!node || !node.classList.contains("field-error")) {
      node = document.createElement("p");
      node.className = "field-error";
      node.hidden = true;
      input.insertAdjacentElement("afterend", node);
    }
    return node;
  }

  function checkEmailField(input) {
    const value = input.value.trim();
    const empty = value.length === 0;
    const ok = !empty && isValidEmail(value);
    const message = fieldMessage(input);
    const invalid = empty ? input.required : !ok;
    input.classList.toggle("is-invalid", invalid);
    input.setCustomValidity(invalid ? "Введите почту в виде имя@домен.ru" : "");
    message.hidden = !invalid;
    message.textContent = empty ? "Укажите электронную почту." : "Почта должна быть в виде имя@домен.ru";
    return !invalid;
  }

  document.addEventListener("input", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "email") return;
    const cleaned = input.value.replace(/\s/g, "").toLowerCase();
    if (cleaned !== input.value) input.value = cleaned;
    if (input.classList.contains("is-invalid")) checkEmailField(input);
  });

  document.addEventListener("focusout", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "email") return;
    if (input.value.trim()) checkEmailField(input);
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const emails = [...form.querySelectorAll('input[type="email"]')];
    if (!emails.length) return;
    const valid = emails.every((input) => checkEmailField(input));
    if (!valid) {
      event.preventDefault();
      event.stopPropagation();
      emails.find((input) => input.classList.contains("is-invalid"))?.focus();
    }
  }, true);

  function paintTheme(light) {
    if (light) document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", light ? "#F4F7FB" : "#080A10");
    const button = document.querySelector("[data-theme-toggle]");
    if (!button) return;
    button.setAttribute("aria-pressed", String(light));
    button.setAttribute("aria-label", light ? "Включить темную тему" : "Включить светлую тему");
    const icon = button.querySelector(".theme-icon");
    if (icon) icon.textContent = light ? "☾" : "☀";
  }

  const themeButton = document.createElement("button");
  themeButton.type = "button";
  themeButton.className = "theme-toggle";
  themeButton.setAttribute("data-theme-toggle", "");
  themeButton.innerHTML = '<span class="theme-icon" aria-hidden="true">☀</span>';
  const header = document.querySelector("header.header");
  if (header) {
    const headerRight = header.querySelector(".header-right");
    if (headerRight) headerRight.insertBefore(themeButton, headerRight.firstChild);
    else header.appendChild(themeButton);
  }
  paintTheme(document.documentElement.getAttribute("data-theme") === "light");
  themeButton.addEventListener("click", () => {
    const light = document.documentElement.getAttribute("data-theme") !== "light";
    localStorage.setItem("mediaMax_theme", light ? "light" : "dark");
    paintTheme(light);
  });

  // Год в подвале
  document.querySelectorAll("[data-year], #current-year, #year").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // ==========================================
  // ВСПЛЫВАЮЩЕЕ УВЕДОМЛЕНИЕ (TOAST)
  // ==========================================
  function showToast(message, isError = false) {
    // Удаляем старое уведомление, если оно есть
    const oldToast = document.querySelector(".toast-notification");
    if (oldToast) oldToast.remove();

    // Создаем новое
    const toast = document.createElement("div");
    toast.className = `toast-notification ${isError ? "is-error" : ""}`;
    
    // Иконка (галочка или крестик)
    const icon = isError 
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>`;

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">${message}</div>
    `;

    document.body.appendChild(toast);

    // Показываем с анимацией
    setTimeout(() => toast.classList.add("is-visible"), 10);

    // Скрываем через 4 секунды
    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ==========================================
  // АВТОРИЗАЦИЯ (ИМИТАЦИЯ ЧЕРЕЗ LOCALSTORAGE)
  // ==========================================
  function getCurrentUser() {
    return window.MediaMaxAuth.currentUser();
  }

  function updateAccountButton() {
    const accountBtn = document.querySelector("[data-open-account]");
    if (!accountBtn) return;

    const user = getCurrentUser();
    const span = accountBtn.querySelector("span");

    if (user) {
      if (span) span.textContent = user.name;
      accountBtn.title = "Открыть личный кабинет";
    } else {
      if (span) span.textContent = "Аккаунт";
      accountBtn.title = "Войти или зарегистрироваться";
    }
  }

  if (header && !header.querySelector("[data-open-account]")) {
    const accountButton = document.createElement("button");
    accountButton.type = "button";
    accountButton.className = "account-trigger";
    accountButton.setAttribute("data-open-account", "");
    accountButton.setAttribute("aria-label", "Личный кабинет");
    accountButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="4"></circle>
        <path d="M4 21v-2a8 8 0 0 1 16 0v2"></path>
      </svg>
      <span>Аккаунт</span>
    `;

    const headerRight = header.querySelector(".header-right");
    if (headerRight) {
      headerRight.appendChild(accountButton);
    } else {
      const menuButton = header.querySelector(".menu-toggle");
      const navigation = header.querySelector(".navigation, .nav");
      if (menuButton) {
        menuButton.parentNode.insertBefore(accountButton, menuButton);
      } else if (navigation) {
        navigation.parentNode.insertBefore(accountButton, navigation);
      } else {
        header.appendChild(accountButton);
      }
    }
  }

  updateAccountButton();
  window.mediaMaxRefreshAccount = updateAccountButton;

  // ==========================================
  // МОБИЛЬНОЕ МЕНЮ
  // ==========================================
  document.querySelectorAll(".menu-toggle").forEach((button) => {
    const navId = button.getAttribute("aria-controls");
    const nav = navId
      ? document.getElementById(navId)
      : button.parentElement.querySelector(".nav, .navigation");

    if (!nav) return;

    button.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(open));
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
      });
    });
  });

  // ==========================================
  // МОДАЛЬНОЕ ОКНО АВТОРИЗАЦИИ
  // ==========================================
  let modal = document.getElementById("account-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "account-modal";
    modal.className = "account-modal";
    modal.setAttribute("aria-hidden", "true");

    modal.innerHTML = `
      <div class="account-backdrop" data-close-account></div>

      <section class="account-panel" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <button class="account-close" type="button" data-close-account aria-label="Закрыть окно">×</button>

        <p class="eyebrow">ООО «Медиа Макс»</p>
        <h2 id="account-title">Добро пожаловать</h2>
        <p class="account-description">Войдите в аккаунт или создайте новый.</p>

        <div class="account-tabs" role="tablist">
          <button type="button" class="account-tab is-active" data-account-tab="login">Войти</button>
          <button type="button" class="account-tab" data-account-tab="register">Регистрация</button>
        </div>

        <form class="account-form" id="modal-login-form">
          <label for="modal-login-email">Электронная почта</label>
          <input id="modal-login-email" name="email" type="email" autocomplete="email" placeholder="name@example.com" required>

          <label for="modal-login-password">Пароль</label>
          <div class="password-wrapper">
            <input id="modal-login-password" name="password" type="password" autocomplete="current-password" placeholder="Введите пароль" required>
            <button type="button" class="toggle-password" aria-label="Показать пароль">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>

          <button class="button button-primary form-submit" type="submit">Войти</button>
          <p class="account-status" role="status"></p>
        </form>

        <form class="account-form" id="modal-register-form" hidden>
          <label for="modal-register-name">Ваше имя</label>
          <input id="modal-register-name" name="name" autocomplete="name" placeholder="Как к вам обращаться" required minlength="2">

          <label for="modal-register-email">Электронная почта</label>
          <input id="modal-register-email" name="email" type="email" autocomplete="email" placeholder="name@example.com" required>

          <label for="modal-register-phone">Номер телефона</label>
          <input id="modal-register-phone" name="phone" type="tel" autocomplete="tel" placeholder="+7 (999) 123-45-67" required>

          <label for="modal-register-password">Придумайте пароль</label>
          <div class="password-wrapper">
            <input id="modal-register-password" name="password" type="password" autocomplete="new-password" placeholder="Не менее 6 символов" required minlength="6">
            <button type="button" class="toggle-password" aria-label="Показать пароль">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>

          <label for="modal-register-password-repeat">Повторите пароль</label>
          <div class="password-wrapper">
            <input id="modal-register-password-repeat" name="passwordRepeat" type="password" autocomplete="new-password" placeholder="Повторите пароль" required minlength="6">
            <button type="button" class="toggle-password" aria-label="Показать пароль">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>

          <button class="button button-primary form-submit" type="submit">Создать аккаунт</button>
          <p class="account-status" role="status"></p>
        </form>
        
        <div id="logged-in-view" hidden>
          <h2>Вы в системе</h2>
          <p class="account-description">Здравствуйте, <strong id="logged-user-name"></strong>.</p>
          <p class="account-description" id="logged-user-email"></p>
          <a class="button button-primary form-submit" href="account.html">Открыть кабинет</a>
          <button class="button button-ghost form-submit" id="logout-btn" type="button" style="margin-top: 12px; width: 100%;">Выйти из аккаунта</button>
        </div>
      </section>
    `;

    document.body.appendChild(modal);
  }

  const loginForm = modal.querySelector("#modal-login-form");
  const registerForm = modal.querySelector("#modal-register-form");
  const loggedInView = modal.querySelector("#logged-in-view");
  const tabs = modal.querySelectorAll("[data-account-tab]");
  const tabsContainer = modal.querySelector(".account-tabs");
  const description = modal.querySelector(".account-description");

  function showAccountTab(tabName) {
    const isLogin = tabName === "login";
    loginForm.hidden = !isLogin;
    registerForm.hidden = isLogin;
    loggedInView.hidden = true;
    tabsContainer.hidden = false;
    description.hidden = false;

    tabs.forEach((tab) => {
      const active = tab.dataset.accountTab === tabName;
      tab.classList.toggle("is-active", active);
    });

    modal.querySelector("#account-title").textContent = isLogin ? "Добро пожаловать" : "Создать аккаунт";
    description.textContent = isLogin ? "Войдите в личный кабинет." : "Заполните данные для создания аккаунта.";
  }

  function showLoggedInView(user) {
    loginForm.hidden = true;
    registerForm.hidden = true;
    tabsContainer.hidden = true;
    description.hidden = true;
    
    loggedInView.hidden = false;
    modal.querySelector("#account-title").textContent = "Личный кабинет";
    modal.querySelector("#logged-user-name").textContent = user.name;
    const emailLine = modal.querySelector("#logged-user-email");
    if (emailLine) emailLine.textContent = user.email;
  }

  function openAccount() {
    const user = getCurrentUser();
    if (user) {
      showLoggedInView(user);
    } else {
      showAccountTab("login");
    }
    
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("account-modal-open");
  }

  function closeAccount() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("account-modal-open");
  }

  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-account]");
    if (openButton) {
      event.preventDefault();
      const user = getCurrentUser();
      if (user && modal.classList.contains("is-open")) {
        closeAccount(); 
      } else {
        openAccount();
      }
      return;
    }

    if (event.target.closest("[data-close-account]")) {
      closeAccount();
      return;
    }

    const tab = event.target.closest("[data-account-tab]");
    if (tab) {
      showAccountTab(tab.dataset.accountTab);
    }

    const toggleBtn = event.target.closest(".toggle-password");
    if (toggleBtn) {
      const wrapper = toggleBtn.closest(".password-wrapper");
      const input = wrapper.querySelector("input");
      
      if (input.type === "password") {
        input.type = "text";
        toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
      } else {
        input.type = "password";
        toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) closeAccount();
  });

  // ==========================================
  // ЛОГИКА ВХОДА И РЕГИСТРАЦИИ
  // ==========================================
  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = registerForm.querySelector(".account-status");
    const data = new FormData(registerForm);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    const phone = String(data.get("phone") || "").trim();
    const password = String(data.get("password") || "");
    const passwordRepeat = String(data.get("passwordRepeat") || "");
    const emailInput = registerForm.querySelector('input[name="email"]');

    status.classList.remove("is-error");

    if (emailInput && !checkEmailField(emailInput)) {
      status.classList.add("is-error");
      status.textContent = "Проверьте электронную почту.";
      return;
    }

    if (password !== passwordRepeat) {
      status.classList.add("is-error");
      status.textContent = "Пароли не совпадают.";
      return;
    }

    const result = window.MediaMaxAuth.register({ name, email, phone, password });
    if (!result.ok) {
      status.classList.add("is-error");
      status.textContent = result.error;
      return;
    }

    registerForm.reset();
    updateAccountButton();
    showLoggedInView(result.user);
    document.dispatchEvent(new CustomEvent("mediamax-auth"));
  });

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = loginForm.querySelector(".account-status");
    const data = new FormData(loginForm);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const emailInput = loginForm.querySelector('input[name="email"]');

    status.classList.remove("is-error");

    if (emailInput && !checkEmailField(emailInput)) {
      status.classList.add("is-error");
      status.textContent = "Проверьте электронную почту.";
      return;
    }

    const result = window.MediaMaxAuth.login(email, password);
    if (result.ok) {
      loginForm.reset();
      updateAccountButton();
      showLoggedInView(result.user);
      document.dispatchEvent(new CustomEvent("mediamax-auth"));
    } else {
      status.classList.add("is-error");
      status.textContent = result.error;
    }
  });

  modal.querySelector("#logout-btn").addEventListener("click", () => {
    window.MediaMaxAuth.logout();
    updateAccountButton();
    showAccountTab("login");
    closeAccount();
    document.dispatchEvent(new CustomEvent("mediamax-auth"));
  });

  // ==========================================
  // УМНАЯ МАСКА ВВОДА
  // ==========================================
  function formatPhone(raw, country) {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return "";
    if (country === "LV") {
      const national = (digits.startsWith("371") ? digits.slice(3) : digits).slice(0, 8);
      let formatted = "+371";
      if (national.length) formatted += " " + national.slice(0, 4);
      if (national.length > 4) formatted += " " + national.slice(4);
      return formatted;
    }
    if (country === "US") {
      const national = (digits.startsWith("1") ? digits.slice(1) : digits).slice(0, 10);
      let formatted = "+1";
      if (national.length) formatted += " (" + national.slice(0, 3);
      if (national.length >= 3) formatted += ")";
      if (national.length > 3) formatted += " " + national.slice(3, 6);
      if (national.length > 6) formatted += "-" + national.slice(6);
      return formatted;
    }
    let ru = digits;
    if (ru.startsWith("8")) ru = "7" + ru.slice(1);
    if (!ru.startsWith("7")) ru = "7" + ru;
    ru = ru.slice(0, 11);
    let formatted = "+7";
    if (ru.length > 1) formatted += " (" + ru.slice(1, 4);
    if (ru.length >= 5) formatted += ") " + ru.slice(4, 7);
    if (ru.length >= 8) formatted += "-" + ru.slice(7, 9);
    if (ru.length >= 10) formatted += "-" + ru.slice(9, 11);
    return formatted;
  }

  function contactProblem(value) {
    const raw = String(value || "").trim();
    if (!raw) return "Укажите телефон или @username.";
    if (raw.startsWith("@") || /[a-zA-Zа-яА-ЯёЁ]/.test(raw)) {
      if (/^@[a-zA-Z][a-zA-Z0-9_]{2,31}$/.test(raw)) return "";
      return "Имя в мессенджере пишите как @username: латиница, от 3 символов.";
    }
    const digits = raw.replace(/\D/g, "");
    const ru = digits.startsWith("8") ? "7" + digits.slice(1) : digits;
    if (ru.length === 11 && ru.startsWith("7")) return "";
    return "Введите телефон полностью: +7 (999) 123-45-67.";
  }

  function checkContactField(input) {
    const problem = contactProblem(input.value);
    const message = fieldMessage(input);
    input.classList.toggle("is-invalid", Boolean(problem));
    input.setCustomValidity(problem);
    message.hidden = !problem;
    message.textContent = problem;
    return !problem;
  }

  const phoneInputs = [...document.querySelectorAll('input[type="tel"], input[name*="phone" i], #client-phone')]
    .filter((input) => input.id !== "register-phone" && input.id !== "cabinet-phone");

  phoneInputs.forEach((input) => {
    const isLead = input.closest(".lead-form, .repair-form");
    input.addEventListener("input", (event) => {
      const val = event.target.value;
      if (!/[a-zA-Zа-яА-ЯёЁ@]/.test(val)) event.target.value = formatPhone(val, "RU");
      if (isLead && input.classList.contains("is-invalid")) checkContactField(input);
    });
    if (isLead) {
      input.addEventListener("focusout", () => {
        if (input.value.trim()) checkContactField(input);
      });
    }
  });

  const registerPhone = document.querySelector("#register-phone");
  const registerCountry = document.querySelector("#register-country");
  function applyRegisterPhone() {
    if (!registerPhone) return;
    const country = registerCountry ? registerCountry.value : "RU";
    registerPhone.value = formatPhone(registerPhone.value, country);
    if (country === "LV") registerPhone.placeholder = "+371 2000 0000";
    else if (country === "US") registerPhone.placeholder = "+1 (999) 123-4567";
    else registerPhone.placeholder = "+7 (999) 123-45-67";
  }
  if (registerPhone) registerPhone.addEventListener("input", applyRegisterPhone);
  if (registerCountry) registerCountry.addEventListener("change", applyRegisterPhone);

  // ==========================================
  // ФОРМЫ ЗАЯВОК (С ОТПРАВКОЙ ЧЕРЕЗ WEB3FORMS)
  // ==========================================
  
  const ACCESS_KEY = "49af7e14-5670-4859-9125-0dfece8343d9"; 

  document.querySelectorAll(".lead-form, .repair-form").forEach((form) => {
    let lastSavedKey = "";

    function leadEntry(formData) {
      return {
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        service: formData.get("service"),
        message: [formData.get("device"), formData.get("message")].filter(Boolean).join(". ")
      };
    }

    function storeLead(entry) {
      const key = [entry.name, entry.email, entry.phone, entry.service, entry.message]
        .map((part) => String(part || "").trim().toLowerCase())
        .join("\u0001");
      if (key === lastSavedKey) return false;
      const item = window.MediaMaxAuth.saveRequest(entry);
      if (!item) return false;
      lastSavedKey = key;
      return true;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submitBtn = form.querySelector("button[type='submit']");
      if (!submitBtn || submitBtn.disabled) return;
      const phoneInput = form.querySelector("input[name='phone']");
      if (phoneInput && !checkContactField(phoneInput)) {
        phoneInput.focus();
        return;
      }

      const originalBtnText = submitBtn.innerHTML;
      const status = form.querySelector(".form-status");
      const formData = new FormData(form);
      const entry = leadEntry(formData);

      submitBtn.innerHTML = "Отправка...";
      submitBtn.disabled = true;
      if (status) {
        status.textContent = "";
        status.style.color = "";
      }

      formData.append("access_key", ACCESS_KEY);
      formData.append("subject", "Новая заявка с сайта Медиа Макс");
      formData.append("from_name", "Сайт Медиа Макс");

      function openMailDraft() {
        const lines = [
          "Имя: " + (formData.get("name") || ""),
          "Телефон: " + (formData.get("phone") || ""),
          "Почта: " + (formData.get("email") || ""),
          "Услуга: " + (formData.get("service") || ""),
          "Техника: " + (formData.get("device") || ""),
          "Задача: " + (formData.get("message") || "")
        ].filter((line) => !line.endsWith(": "));
        const link = document.createElement("a");
        link.href = "mailto:" + EMAIL
          + "?subject=" + encodeURIComponent("Заявка с сайта Медиа Макс")
          + "&body=" + encodeURIComponent(lines.join("\n"));
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      try {
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          storeLead(entry);
          showToast("Заявка успешно отправлена! Мы свяжемся с вами.", false);
          if (status) status.textContent = "";
          form.reset();
          form.querySelectorAll(".is-invalid").forEach((field) => field.classList.remove("is-invalid"));
          form.querySelectorAll(".field-error").forEach((node) => {
            node.hidden = true;
          });
          lastSavedKey = "";
        } else {
          openMailDraft();
          storeLead(entry);
          showToast("Через интернет письмо не ушло. Откройте его в почтовой программе.", true);
          if (status) status.textContent = "Заявка записана. Письмо открыто в почтовой программе.";
        }
      } catch (error) {
        openMailDraft();
        storeLead(entry);
        showToast("Нет отправки через интернет. Откройте письмо в почтовой программе.", true);
        if (status) status.textContent = "Заявка записана. Письмо открыто в почтовой программе.";
      } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  });

  document.querySelectorAll("[data-problem]").forEach((link) => {
    link.addEventListener("click", () => {
      const message = document.querySelector("#client-message, .lead-form textarea, .repair-form textarea");
      if (!message) return;
      const text = link.dataset.problem || "";
      if (!message.value.trim()) message.value = text;
      else if (!message.value.includes(text)) message.value = text + ". " + message.value;
      const deviceSelect = document.querySelector('select[name="device"]');
      if (deviceSelect) {
        const match = [...deviceSelect.options].find((option) => option.value === text || option.textContent.trim() === text);
        if (match) deviceSelect.value = match.value;
      }
    });
  });

  document.querySelectorAll("[data-service]").forEach((link) => {
    link.addEventListener("click", () => {
      const serviceSelect = document.querySelector(".lead-form select, .repair-form select");
      if (serviceSelect) {
        const requestedService = link.dataset.service;
        const matchingOption = [...serviceSelect.options].find(
          (option) => option.value === requestedService || option.textContent.trim() === requestedService
        );
        if (matchingOption) serviceSelect.value = matchingOption.value;
      }
    });
  });

  // ==========================================
  // АНИМАЦИЯ ПОЯВЛЕНИЯ
  // ==========================================
  const revealElements = document.querySelectorAll('.about-section, .reviews-section, .service-card, .advantage, .review-card, .process-step');
  if (revealElements.length > 0) {
    revealElements.forEach(el => el.classList.add('reveal'));
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    revealElements.forEach(el => revealObserver.observe(el));
  }
});