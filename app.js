// ================== НАСТРОЙКИ ==================
const AUDIO_SRC = "music.mp3";

// 2+ варианта правильного ответа
const CORRECT_ANSWERS = ["justin bieber", "джастин бибер"];

// Google Form endpoint (ВАЖНО: /formResponse)
const FORM_RESPONSE_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeExXdt2She7pOIeMIjmwb7JL_oRmrVwCZxoVN4dSemzHr4aQ/formResponse";

// entry.* из твоей предзаполненной ссылки
const FORM_FIELDS = {
  sessionId:     "entry.53703048",
  questionId:    "entry.944260219",
  questionTitle: "entry.960165383",
  answerText:    "entry.378002717",
  answerChoice:  "entry.1420466812",
  answerMulti:   "entry.966787247",
  isCorrect:     "entry.580079395",
};

// ID прохождения (один на всю сессию)
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
let isTransitioning = false;

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
  }, 1500);
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

// ================== ЛОГИКА ПЕРЕХОДА (плавный слайд) ==================
function slideOut(currentCardEl, onDone) {
  if (isTransitioning) return;
  isTransitioning = true;

  currentCardEl.classList.remove("slide-out");
  // перезапуск анимации
  void currentCardEl.offsetWidth;
  currentCardEl.classList.add("slide-out");

  const finish = () => {
    currentCardEl.removeEventListener("animationend", finish);
    currentCardEl.classList.remove("slide-out");
    isTransitioning = false;
    onDone?.();
  };

  currentCardEl.addEventListener("animationend", finish, { once: true });
  // страховка на случай, если animationend не придёт
  setTimeout(finish, 450);
}

function nextCard() {
  if (step >= cards.length - 1) return;
  slideOut(cardEl, () => {
    step++;
    renderCurrentCard();
  });
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
          nextCard(); // переход только по нажатию на кнопку
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
          <div class="hint">Нажми на свободное место экрана, чтобы перейти дальше.</div>
        </div>
      `;

      setTimeout(() => {
        const input = document.getElementById("answerInput");
        const status = document.getElementById("status");
        input?.focus();

        const saveQ1Once = createQuestionSaver({
          questionId: "q1",
          questionTitle: "Мини-вопрос",
        });

        let lastValue = "";
        let isCorrectNow = false;

        const goNext = () => {
          // Переход ТОЛЬКО по касанию (тапу) и только если ответ верный
          if (!canAdvance || isTransitioning) return;

          // Сохраняем 1 строку на вопрос (последний ввод)
          saveQ1Once({
            answerText: lastValue,
            answerChoice: "",
            answerMulti: [],
            isCorrect: isCorrectNow,
          });

          nextCard();
        };

        // Тап по свободной области
        const onContinueTap = (e) => {
          // не реагируем на тап по инпуту/кнопкам внутри карточки
          if (e?.target && (e.target.tagName === "INPUT" || e.target.closest("input") || e.target.closest("button"))) {
            return;
          }
          goNext();
        };

        // Включаем возможность тапнуть “вне карточки”, когда ответ верный
        clickCatcher.onclick = onContinueTap;
        deck.onclick = onContinueTap;

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

// ================== ПРОВЕРКА ОТВЕТА ==================
function isCorrectAnswer(raw) {
  const v = normalize(raw);
  return CORRECT_ANSWERS.map(normalize).includes(v);
}

// ================== HELPERS ==================
function normalize(s){ return (s ?? "").trim().toLowerCase(); }

// старт
renderCurrentCard();
