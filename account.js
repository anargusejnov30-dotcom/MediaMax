"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const auth = window.MediaMaxAuth;
  const yearElement = document.querySelector("#account-year");
  if (yearElement) yearElement.textContent = new Date().getFullYear();
  if (!auth) return;

  const tabs = document.querySelectorAll("[data-auth-tab]");
  const panels = document.querySelectorAll("[data-auth-panel]");
  const tabsContainer = document.querySelector(".account-tabs");
  const cabinetPanel = document.querySelector("#cabinet-panel");
  const requestList = document.querySelector("#cabinet-requests");
  const greeting = document.querySelector("#cabinet-greeting");
  const profileForm = document.querySelector("#profile-form");
  const profileStatus = document.querySelector("#profile-status");

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function showAuthPanel(mode) {
    if (tabsContainer) tabsContainer.hidden = false;
    if (cabinetPanel) cabinetPanel.hidden = true;
    tabs.forEach((tab) => {
      const active = tab.dataset.authTab === mode;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    panels.forEach((panel) => {
      if (panel === cabinetPanel) return;
      panel.hidden = panel.dataset.authPanel !== mode;
    });
  }

  function renderCabinet(user) {
    if (tabsContainer) tabsContainer.hidden = true;
    panels.forEach((panel) => {
      panel.hidden = panel !== cabinetPanel;
    });
    if (cabinetPanel) cabinetPanel.hidden = false;
    if (greeting) greeting.textContent = user.name + ", " + user.email;
    if (profileForm) {
      profileForm.elements.name.value = user.name;
      profileForm.elements.phone.value = user.phone || "";
    }
    if (!requestList) return;
    const requests = auth.requestsFor(user.email);
    if (!requests.length) {
      requestList.innerHTML = "<p class=\"cabinet-empty\">Обращений пока нет. Заявка с сайта появится здесь, если она отправлена с этой почты.</p>";
      return;
    }
    requestList.innerHTML = requests.map((item) => {
      const date = new Date(item.createdAt);
      const when = Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
      return `<article class="cabinet-request"><b>${escapeHtml(item.service || "Заявка")}</b><span>${escapeHtml(when)}</span><p>${escapeHtml(item.message || "Без описания")}</p></article>`;
    }).join("");
  }

  function render(event) {
    const user = auth.currentUser();
    if (user) renderCabinet(user);
    else if (event) showAuthPanel("login");
    if (window.mediaMaxRefreshAccount) window.mediaMaxRefreshAccount();
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => showAuthPanel(tab.dataset.authTab));
  });
  document.querySelectorAll("[data-show-login]").forEach((button) => {
    button.addEventListener("click", () => showAuthPanel("login"));
  });
  document.querySelectorAll("[data-show-register]").forEach((button) => {
    button.addEventListener("click", () => showAuthPanel("register"));
  });

  const registerForm = document.querySelector("#register-form");
  const registerStatus = document.querySelector("#register-status");
  if (registerForm && registerStatus) {
    registerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      registerStatus.classList.remove("is-error");
      registerStatus.textContent = "";
      if (!registerForm.reportValidity()) return;
      const password = registerForm.elements.password.value;
      if (password !== registerForm.elements.passwordConfirm.value) {
        registerStatus.classList.add("is-error");
        registerStatus.textContent = "Пароли не совпадают.";
        return;
      }
      const result = auth.register({
        name: registerForm.elements.name.value,
        email: registerForm.elements.email.value,
        phone: registerForm.elements.phone.value,
        password
      });
      if (!result.ok) {
        registerStatus.classList.add("is-error");
        registerStatus.textContent = result.error;
        return;
      }
      registerForm.reset();
      render();
    });
  }

  const loginForm = document.querySelector("#login-form");
  const loginStatus = document.querySelector("#login-status");
  if (loginForm && loginStatus) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      loginStatus.classList.remove("is-error");
      loginStatus.textContent = "";
      if (!loginForm.reportValidity()) return;
      const result = auth.login(loginForm.elements.email.value, loginForm.elements.password.value);
      if (!result.ok) {
        loginStatus.classList.add("is-error");
        loginStatus.textContent = result.error;
        return;
      }
      loginForm.reset();
      render();
    });
  }

  if (profileForm && profileStatus) {
    profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      profileStatus.classList.remove("is-error");
      const result = auth.updateProfile({
        name: profileForm.elements.name.value,
        phone: profileForm.elements.phone.value
      });
      if (!result.ok) {
        profileStatus.classList.add("is-error");
        profileStatus.textContent = result.error;
        return;
      }
      profileStatus.textContent = "Данные сохранены в этом браузере.";
      render();
    });
  }

  const logoutButton = document.querySelector("#cabinet-logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      auth.logout();
      if (profileStatus) profileStatus.textContent = "";
      render();
    });
  }

  document.addEventListener("mediamax-auth", render);
  render();
});
