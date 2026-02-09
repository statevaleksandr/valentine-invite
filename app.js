// ================== НАСТРОЙКИ ==================
const AUDIO_SRC = "music.mp3";
const CORRECT_ANSWERS = ["justin bieber", "джастин бибер"];

// Google Form endpoint (ВАЖНО: /formResponse)
const FORM_RESPONSE_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeExXdt2She7pOIeMIjmwb7JL_oRmrVwCZxoVN4dSemzHr4aQ/formResponse";

// entry.* (как у тебя, чтобы таблица НЕ слетела)
const FORM_FIELDS = {
  sessionId:     "entry.53703048",
  questionId:    "entry.944260219",
  questionTitle: "entry.960165383",
  answerText:    "entry.378002717",
  answerChoice:  "entry.1420466812",
  answerMulti:   "entry.966787247",
  isCorrect:     "entry.580079395",
};

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

// ================== HELPERS ==================
function normalize(s){ return (s ?? "").trim().toLowerCase(); }
function isCorrectAnswer(raw){
  const v = normalize(raw);
  return CORRECT_ANSWERS.map(normalize).includes(v);
}

// ================== АНИМАЦИЯ ПЕРЕХОДА ==================
function slideToNext() {
  if (step >= cards.length - 1) return;

  // запускаем CSS-анимацию ухода
  cardEl.classList.remove("slide-out");
  void cardEl.offsetWidth;
  cardEl.classList.add("slide-out");

  const finish = () => {
    cardEl.removeEventListener("animationend", finish);
    cardEl.classList.remove("slide-out");

    step++;
    renderCard();
  };

  cardEl.addEventListener("animationend", finish, { once: true });

  // простая страховка (на случай если animationend не придёт)
  setTimeout(() => {
    // если уже перешли — ничего не делаем
    if (step === cards.length - 1) return;
  }, 400);
}

// ================== КАРТОЧКИ ==================
const cards = [
  {
    id: "welcome",
    render() {
      canAdvance = false;
      tapHint.classList.remove("show");
      clickCatcher.classList.remove("active");

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>...👍🏻🤷‍♂️...</h1>
        <p>Если ты это читаешь, то все гуд. Это короткий скам-опрос, займет минуты 2</p>
        <p>Если ты готова, то можешь начинать</p>
        <div class="spacer"></div>
        <button class="btn" id="startBtn" type="button">Начать</button>
      `;

      setTimeout(() => {
        const btn = document.getElementById("startBtn");
        btn?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Музыка — пытаемся включить, но не блокируем переход
          audio.play().catch(() => {});

          slideToNext();
        }, { once: true });
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
        <h1><center>Проверка подшар-отдела</center></h1>
        <p>Кто исполняет под мелодию такую?</p>

        <div class="field">
          <input id="answerInput" type="text" placeholder="можно на русском и английском" autocomplete="off" />
          <div class="status" id="status"></div>
          <div class="hint">Нажм куда угодно, когда появится "Правильно ✓"</div>
        </div>
      `;

      setTimeout(() => {
        const input = document.getElementById("answerInput");
        const status = document.getElementById("status");
        input?.focus();

        let lastValue = "";
        let okNow = false;
        let saved = false;

        function updateUI() {
          if (okNow) {
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
        }

        input?.addEventListener("input", () => {
          lastValue = input.value;
          okNow = isCorrectAnswer(lastValue);
          updateUI();
        });

        function goNext() {
          if (!canAdvance) return;

          // 1 строка на вопрос — фиксируем то, что было введено на момент ухода
          if (!saved) {
            saved = true;
            submitRowToGoogleForm({
              sessionId: SESSION_ID,
              questionId: "q1",
              questionTitle: "Мини-вопрос",
              answerText: lastValue,
              answerChoice: "",
              answerMulti: "",
              isCorrect: okNow,
            });
          }

          slideToNext();
        }

        // Нажатие по свободной области
        function onTap(e) {
          if (e?.target && (e.target.tagName === "INPUT" || e.target.closest("input") || e.target.closest("button"))) {
            return;
          }
          goNext();
        }

        // Включаем “тап для продолжения” поверх экрана, но он активируется только когда canAdvance=true
        clickCatcher.onclick = onTap;
        deck.onclick = onTap;
      }, 0);

      return wrap;
    }
  },

  {
    id: "end",
    render() {
      canAdvance = false;
      tapHint.classList.remove("show");
      clickCatcher.classList.remove("active");
      clickCatcher.onclick = null;
      deck.onclick = null;

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Продолжение будет…</h1>
        <p>Готово! Дальше добавим следующие карточки и наполнение.</p>
      `;
      return wrap;
    }
  }
];

// ================== РЕНДЕР ==================
function renderCard() {
  cardEl.classList.remove("deal-in");
  cardEl.innerHTML = "";
  cardEl.appendChild(cards[step].render());
  requestAnimationFrame(() => cardEl.classList.add("deal-in"));
}

// старт
renderCard();

