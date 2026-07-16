import {
  getApp,
  getApps,
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  arrayRemove,
  arrayUnion,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

(() => {
  "use strict";

  const checks = Array.from(document.querySelectorAll(".progress-check"));
  const rows = Array.from(document.querySelectorAll(".check-row"));
  const searchBox = document.getElementById("searchBox");
  const progressText = document.getElementById("progressText");
  const progressFill = document.getElementById("progressFill");
  const resetButton = document.getElementById("resetButton");

  if (!checks.length || !searchBox || !progressText || !progressFill || !resetButton) {
    console.error("Nie znaleziono wymaganych elementów checklisty.");
    return;
  }

  const knownKeys = new Set(checks.map(check => check.dataset.key).filter(Boolean));
  let applyingRemoteState = false;
  let firebaseReady = false;

  const style = document.createElement("style");
  style.textContent = `
    .sync-status {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 24px;
      color: var(--muted);
      font-size: .84rem;
    }

    .sync-status::before {
      content: "";
      width: 8px;
      height: 8px;
      flex: 0 0 auto;
      border-radius: 50%;
      background: var(--muted);
      box-shadow: 0 0 0 3px rgba(163, 159, 152, .1);
    }

    .sync-status[data-state="ready"]::before {
      background: var(--success);
      box-shadow: 0 0 0 3px rgba(146, 184, 138, .12);
    }

    .sync-status[data-state="working"]::before {
      background: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }

    .sync-status[data-state="error"] {
      color: #e8b1a8;
    }

    .sync-status[data-state="error"]::before {
      background: var(--danger);
      box-shadow: 0 0 0 3px rgba(211, 123, 109, .12);
    }

    .progress-check:disabled,
    .reset-button:disabled {
      opacity: .55;
      cursor: wait;
    }
  `;
  document.head.appendChild(style);

  const syncStatus = document.createElement("div");
  syncStatus.id = "syncStatus";
  syncStatus.className = "sync-status";
  syncStatus.setAttribute("role", "status");
  syncStatus.setAttribute("aria-live", "polite");
  document.querySelector(".toolbar")?.appendChild(syncStatus);

  function setStatus(message, state = "working") {
    syncStatus.textContent = message;
    syncStatus.dataset.state = state;
  }

  function setControlsEnabled(enabled) {
    checks.forEach(check => {
      check.disabled = !enabled;
    });
    resetButton.disabled = !enabled;
  }

  function applyRowState(check) {
    const row = check.closest(".check-row");
    if (row) row.classList.toggle("done", check.checked);
  }

  function updateProgress() {
    const completed = checks.filter(check => check.checked).length;
    const percent = checks.length ? (completed / checks.length) * 100 : 0;
    progressText.textContent = `${completed} / ${checks.length}`;
    progressFill.style.width = `${percent}%`;

    document.querySelectorAll(".content-section").forEach(section => {
      const sectionChecks = Array.from(section.querySelectorAll(".progress-check"));
      const sectionDone = sectionChecks.filter(check => check.checked).length;
      const counter = section.querySelector(".section-counter");
      if (counter) counter.textContent = `${sectionDone} / ${sectionChecks.length}`;
    });
  }

  function applyRemoteState(checkedKeys) {
    const remoteKeys = new Set(
      checkedKeys.filter(key => typeof key === "string" && knownKeys.has(key))
    );

    applyingRemoteState = true;
    checks.forEach(check => {
      check.checked = remoteKeys.has(check.dataset.key);
      applyRowState(check);
    });
    updateProgress();
    applyingRemoteState = false;
  }

  function currentCheckedKeys() {
    return checks.filter(check => check.checked).map(check => check.dataset.key);
  }

  checks.forEach(check => {
    check.checked = false;
    applyRowState(check);
  });
  updateProgress();
  setControlsEnabled(false);
  setStatus("Łączenie z Firebase…", "working");

  searchBox.addEventListener("input", () => {
    const query = searchBox.value.trim().toLocaleLowerCase("pl");

    rows.forEach(row => {
      const haystack = row.dataset.search || row.textContent.toLocaleLowerCase("pl");
      row.classList.toggle("filtered-out", Boolean(query) && !haystack.includes(query));
    });

    document.querySelectorAll(".content-section").forEach(section => {
      const visibleRows = section.querySelectorAll(".check-row:not(.filtered-out)").length;
      section.style.display = visibleRows || !query ? "" : "none";
    });
  });

  const config = window.firebaseConfig;
  if (!config?.projectId || !config?.apiKey || !config?.appId) {
    setControlsEnabled(true);
    setStatus("Brak prawidłowej konfiguracji Firebase. Zmiany nie będą zapisywane.", "error");
    console.error("Brak prawidłowej konfiguracji Firebase.");
    return;
  }

  let progressRef;

  try {
    const app = getApps().length ? getApp() : initializeApp(config);
    const database = getFirestore(app);
    progressRef = doc(database, "DS2", "progress");
  } catch (error) {
    setControlsEnabled(true);
    setStatus("Nie udało się uruchomić Firebase. Zmiany nie będą zapisywane.", "error");
    console.error("Błąd inicjalizacji Firebase:", error);
    return;
  }

  checks.forEach(check => {
    check.addEventListener("change", async () => {
      applyRowState(check);
      updateProgress();

      if (applyingRemoteState || !firebaseReady) return;

      setStatus("Zapisywanie zmian…", "working");

      try {
        await setDoc(
          progressRef,
          {
            version: 1,
            checkedKeys: check.checked
              ? arrayUnion(check.dataset.key)
              : arrayRemove(check.dataset.key),
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      } catch (error) {
        setStatus("Nie udało się zapisać zmiany w Firebase.", "error");
        console.error("Błąd zapisu checkboxa:", error);
      }
    });
  });

  resetButton.addEventListener("click", async () => {
    const confirmed = window.confirm("Czy na pewno wyczyścić wszystkie zaznaczenia na wszystkich urządzeniach?");
    if (!confirmed) return;

    applyRemoteState([]);
    setStatus("Czyszczenie postępu…", "working");

    try {
      await setDoc(
        progressRef,
        {
          version: 1,
          checkedKeys: [],
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      setStatus("Nie udało się wyczyścić postępu w Firebase.", "error");
      console.error("Błąd czyszczenia postępu:", error);
    }
  });

  onSnapshot(
    progressRef,
    { includeMetadataChanges: true },
    snapshot => {
      if (!snapshot.exists()) {
        setStatus("Tworzenie dokumentu postępu…", "working");
        setDoc(progressRef, {
          version: 1,
          checkedKeys: [],
          updatedAt: serverTimestamp()
        }).catch(error => {
          setControlsEnabled(true);
          setStatus("Nie udało się utworzyć dokumentu postępu.", "error");
          console.error("Błąd tworzenia dokumentu postępu:", error);
        });
        return;
      }

      const data = snapshot.data() || {};
      const checkedKeys = Array.isArray(data.checkedKeys) ? data.checkedKeys : [];
      applyRemoteState(checkedKeys);

      firebaseReady = true;
      setControlsEnabled(true);

      if (snapshot.metadata.hasPendingWrites) {
        setStatus("Zapisywanie zmian…", "working");
      } else if (!navigator.onLine) {
        setStatus("Brak połączenia z internetem.", "error");
      } else {
        setStatus(`Zsynchronizowano ${currentCheckedKeys().length} z ${checks.length} kroków.`, "ready");
      }
    },
    error => {
      firebaseReady = false;
      setControlsEnabled(true);
      setStatus("Błąd połączenia z Firebase. Zmiany nie będą synchronizowane.", "error");
      console.error("Błąd nasłuchiwania Firestore:", error);
    }
  );

  window.addEventListener("offline", () => {
    setStatus("Brak połączenia z internetem.", "error");
  });

  window.addEventListener("online", () => {
    setStatus("Ponowne łączenie z Firebase…", "working");
  });
})();
