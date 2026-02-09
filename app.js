// ================== НАСТРОЙКИ ==================
const AUDIO_SRC = "music.mp3";

// 2+ варианта правильного ответа (заполни)
const CORRECT_ANSWERS = ["justin bieber", "джастин бибер"]; // например: ["котик", "котёнок"]

// Google Form endpoint (ВАЖНО: /formResponse)
const FORM_RESPONSE_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeExXdt2She7pOIeMIjmwb7JL_oRmrVwCZxoVN4dSemzHr4aQ/formResponse";

// entry.* из твоей предзаполненной ссылки
const FORM_FIELDS = {
  sessionId:     "entry.53703048",     // AAA
  questionId:    "entry.944260219",    // BBB
  questionTitle: "entry.960165383",    // CCC
  answerText:    "entry.378002717",    // DDD
  answerChoice:  "entry.1420466812",   // EEE
  answerMulti:   "entry.966787247",    // FFF
  isCorrect:     "entry.580079395",    // GGG
};

// Доп. поле для идентификации сессии (один ID на всё прохождение)
const SESSION_ID = crypto.randomUUID();

// ================== АУДИО ==================
const audio = new Audio(AUDIO_SRC);
audio.loop = true;
audio.preload = "auto";

// ================== DOM ==================
const deck = document.getElementById("deck");
const cardEl = document.getElementById("card");
const tapHint = document.getElementById("tapHint");
const clickCatcher = document.getElementById("clickCatcher");

// ================== STATE ==================
let step = 0;
let canAdvance = false;

// ================== GOOGLE FORMS SUBMIT ==================
function submitRowToGoogleForm(row) {
  // row: {sessionId, questionId, questionTitle, answerText, answerChoice, answerMulti, isCorrect}
  // Отправка через скрытый form+iframe (без CORS проблем).
  const iframeName = "hidden_iframe_" + Math.random().toString(16).slice(2);

  const iframe = document.createElement("iframe");
  iframe.name = iframeName;
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  const form = document.createElement("form");
  form.action = FORM_RESPONSE_URL;
  form.method = "POST";
  form.target = iframeName;
  form.style.display = "none";

  const add = (entryName, value) => {
    if (!entryName) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = entryName;
    input.value = value ?? "";
    form.appendChild(input);
  };

  add(FORM_FIELDS.sessionId, row.sessionId);
  add(FORM_FIELDS.questionId, row.questionId);
  add(FORM_FIELDS.questionTitle, row.questionTitle);
  add(FORM_FIELDS.answerText, row.answerText);
  add(FORM_FIELDS.answerChoice, row.answerChoice);
  add(FORM_FIELDS.answerMulti, row.answerMulti);
  add(FORM_FIELDS.isCorrect, String(!!row.isCorrect));

  document.body.appendChild(form);
  form.submit();

  setTimeout(() => {
    form.remove();
    iframe.remove();
  }, 2000);
}

// 1 строка на вопрос — сохранить только один раз
function createQuestionSaver({ questionId, questionTitle }) {
  let saved = false;

  return function saveOnce({ answerText = "", answerChoice = "", answerMulti = [], isCorrect = false } = {}) {
    if (saved) return;
    saved = true;

    const multi = Array.isArray(answerMulti) ? answerMulti.join(", ") : String(answerMulti ?? "");

    submitRowToGoogleForm({
      sessionId: SESSION_ID,
      questionId,
      questionTitle,
      answerText,
      answerChoice,
      answerMulti: multi,
      isCorrect: !!isCorrect,
    });
  };
}

// ================== КАРТОЧКИ ==================
const cards = [
  {
    id: "welcome",
    render() {
      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Привет ✨</h1>
        <p>Я сделал(а) маленькое приглашение на 14 февраля.</p>
        <p>Нажми «Начать» — включится музыка, и мы пойдём дальше.</p>
        <div class="spacer"></div>
        <button class="btn" id="startBtn">Начать</button>
        <div class="hint">*Если музыка не играет — проверь, что <code>music.mp3</code> лежит рядом.</div>
      `;

      setTimeout(() => {
        const btn = document.getElementById("startBtn");
        btn?.addEventListener("click", async (e) => {
          e.stopPropagation();
          try { await audio.play(); } catch (_) {}
          nextCard();
        });
      }, 0);

      return wrap;
    }
  },

  {
    id: "answer",
    render() {
      canAdvance = false;
      tapHint.classList.remove("show");
      clickCatcher.classList.remove("active");

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Мини-вопрос</h1>
        <p>Напиши правильный ответ (пока заглушка).</p>

        <div class="field">
          <input id="answerInput" type="text" placeholder="Введи ответ…" autocomplete="off" />
          <div class="status" id="status"></div>
          <div class="hint">Подсказку потом уберём 😉</div>
        </div>
      `;

      setTimeout(() => {
        const input = document.getElementById("answerInput");
        const status = document.getElementById("status");
        input?.focus();

        // сохраняем 1 строку на вопрос при уходе с карточки
        const saveQ1Once = createQuestionSaver({
          questionId: "q1",
          questionTitle: "Мини-вопрос",
        });

        let lastValue = "";
        let isCorrectNow = false;

        // Переход дальше: сначала сохранить строку, потом анимация/следующая карточка
        const goNext = () => {
          saveQ1Once({
            answerText: lastValue,   // последний введённый “черновик/финал”
            answerChoice: "",
            answerMulti: [],
            isCorrect: isCorrectNow,
          });
          nextCard();
        };

        // локальные обработчики клика "продолжить" на этой карточке
        const onContinueClick = (e) => {
          if (!canAdvance) return;
          if (e?.target && (e.target.tagName === "INPUT" || e.target.closest("input"))) return;
          goNext();
        };

        // Подключаем на время этой карточки
        clickCatcher.onclick = onContinueClick;
        deck.onclick = onContinueClick;

        input?.addEventListener("input", () => {
          lastValue = input.value;
          isCorrectNow = isCorrectAnswer(lastValue);

          if (isCorrectNow) {
            status.textContent = "Правильно ✓";
            status.classList.add("ok");

            canAdvance = true;
            tapHint.classList.add("show");
            clickCatcher.classList.add("active");
          } else {
            status.textContent = "";
            status.classList.remove("ok");

            canAdvance = false;
            tapHint.classList.remove("show");
            clickCatcher.classList.remove("active");
          }
        });
      }, 0);

      return wrap;
    }
  },

  {
    id: "stub",
    render() {
      canAdvance = false;
      tapHint.classList.remove("show");
      clickCatcher.classList.remove("active");

      // очищаем кастомные onclick, чтобы не мешали будущим карточкам
      clickCatcher.onclick = null;
      deck.onclick = null;

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Дальше будет продолжение…</h1>
        <p>Это заглушка. Следующие карточки добавим, когда начнём менять наполнение.</p>
      `;
      return wrap;
    }
  }
];

// ================== РЕНДЕР ==================
function renderCurrentCard() {
  cardEl.classList.remove("deal-in");
  cardEl.innerHTML = "";
  cardEl.appendChild(cards[step].render());
  requestAnimationFrame(() => cardEl.classList.add("deal-in"));
}

// ================== ПЕРЕХОД “СТЕКЛО” ==================
function shatterOut(currentCardEl, onDone) {
  const rect = currentCardEl.getBoundingClientRect();
  const cols = 6;
  const rows = 8;

  const shards = document.createElement("div");
  shards.className = "shards";
  shards.style.width = rect.width + "px";
  shards.style.height = rect.height + "px";

  const clone = currentCardEl.cloneNode(true);
  clone.classList.remove("deal-in");
  clone.style.margin = "0";
  clone.style.position = "absolute";
  clone.style.inset = "0";

  currentCardEl.style.visibility = "hidden";
  currentCardEl.parentElement.appendChild(shards);

  const pieceW = rect.width / cols;
  const pieceH = rect.height / rows;

  const animations = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const shard = document.createElement("div");
      shard.className = "shard";
      shard.style.left = (c * pieceW) + "px";
      shard.style.top = (r * pieceH) + "px";
      shard.style.width = pieceW + "px";
      shard.style.height = pieceH + "px";

      const inner = document.createElement("div");
      inner.className = "shard-inner";
      inner.style.width = rect.width + "px";
      inner.style.height = rect.height + "px";
      inner.style.transform = `translate(${-c * pieceW}px, ${-r * pieceH}px)`;
      inner.appendChild(clone.cloneNode(true));

      shard.appendChild(inner);
      shards.appendChild(shard);

      const cx = (c + 0.5) / cols - 0.5;
      const cy = (r + 0.5) / rows - 0.5;

      const dx = (cx * 260) + rand(-60, 60);
      const dy = (cy * 260) + rand(-60, 60);
      const rot = rand(-180, 180);

      const anim = shard.animate([
        { transform: "translate(0px, 0px) rotate(0deg)", opacity: 1, filter: "blur(0px)" },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0, filter: "blur(2px)" }
      ], {
        duration: 520 + rand(-80, 140),
        easing: "cubic-bezier(.2,.8,.2,1)",
        fill: "forwards"
      });

      animations.push(anim);
    }
  }

  Promise.all(animations.map(a => a.finished.catch(() => {}))).then(() => {
    shards.remove();
    currentCardEl.style.visibility = "visible";
    onDone?.();
  });
}

function nextCard() {
  if (step >= cards.length - 1) return;
  shatterOut(cardEl, () => {
    step++;
    renderCurrentCard();
  });
}

// ================== ПРОВЕРКА ОТВЕТА ==================
function isCorrectAnswer(raw) {
  const v = normalize(raw);
  return CORRECT_ANSWERS.map(normalize).includes(v);
}

// ================== HELPERS ==================
function normalize(s){ return (s ?? "").trim().toLowerCase(); }
function rand(min, max){ return Math.random() * (max - min) + min; }

// старт
renderCurrentCard();
