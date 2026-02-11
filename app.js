// 
const AUDIO_SRC = "music.mp3";
const CORRECT_ANSWERS = ["13", "18","19"];

// 
const FORM_RESPONSE_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeExXdt2She7pOIeMIjmwb7JL_oRmrVwCZxoVN4dSemzHr4aQ/formResponse";

// entry.* 
const FORM_FIELDS = {
  sessionId: "entry.53703048",
  questionId: "entry.944260219",
  questionTitle: "entry.960165383",
  answerText: "entry.378002717",
  answerChoice: "entry.1420466812",
  answerMulti: "entry.966787247",
  isCorrect: "entry.580079395",
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

// HELPERS 
function normalize(s) {
  return (s ?? "").trim().toLowerCase();
}
function isCorrectAnswer(raw) {
  const v = normalize(raw);
  return CORRECT_ANSWERS.map(normalize).includes(v);
}

// ТАПЫ

function clearGlobalTaps() {
  clickCatcher.onclick = null;
  deck.onclick = null;
}

function setGlobalTapToNext(onlyWhenCanAdvance = false) {
  
  clickCatcher.classList.add("active");
  const handler = (e) => {
    if (
      e?.target &&
      (e.target.closest("input") || e.target.closest("button") || e.target.closest("a"))
    ) {
      return;
    }
    if (onlyWhenCanAdvance && !canAdvance) return;
    slideToNext();
  };
  clickCatcher.onclick = handler;
  deck.onclick = handler;
}

function setCardTapToNext(wrap, onlyWhenCanAdvance = false, customNext) {
  
  clickCatcher.classList.remove("active");
  clearGlobalTaps();

  const go = () => {
    if (onlyWhenCanAdvance && !canAdvance) return;
    if (typeof customNext === "function") customNext();
    else slideToNext();
  };

  wrap.addEventListener("click", (e) => {
    if (
      e?.target &&
      (e.target.closest("input") || e.target.closest("button") || e.target.closest("a"))
    ) {
      return;
    }
    go();
  });
}

// АНИМАЦИЯ ПЕРЕХОДА 
function slideTo(targetStep) {
  if (targetStep < 0 || targetStep >= cards.length) return;
  if (targetStep === step) return;

  cardEl.classList.remove("slide-out");
  void cardEl.offsetWidth;
  cardEl.classList.add("slide-out");

  const finish = () => {
    cardEl.removeEventListener("animationend", finish);
    cardEl.classList.remove("slide-out");

    step = targetStep;
    renderCard();
  };

  cardEl.addEventListener("animationend", finish, { once: true });
}

function slideToNext() {
  if (step >= cards.length - 1) return;
  slideTo(step + 1);
}

//КАРТОЧКИ
const cards = [
  //  Приветствие 
  {
    id: "welcome",
    render() {
      canAdvance = false;

      tapHint.classList.remove("show");
      clickCatcher.classList.remove("active");
      clearGlobalTaps();

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Здравствуйте:0</h1>
        <p>Это некий скам-опрос</p>
        <p>Если готовы, то можете начинать&lt;3</p>
        <div class="spacer"></div>
        <button class="btn" id="startBtn" type="button">Начать</button>
      `;

      setTimeout(() => {
        document.getElementById("startBtn")?.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            audio.play().catch(() => {});
            slideToNext();
          },
          { once: true }
        );
      }, 0);

      return wrap;
    },
  },

  //  2) Ввод ответа 
  {
    id: "answer",
    render() {
      canAdvance = false;

      tapHint.classList.remove("show");
      clickCatcher.classList.remove("active");
      clearGlobalTaps();

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Проверка подшар-отдела🗿</h1>
        <p>Сколько песен в альбоме с данной композицией?🤔</p>
        <p>:0</p>

        <div class="field">
          <input id="answerInput" type="text" placeholder="поискать придется а что поделать" autocomplete="off" />
          <div class="status" id="status"></div>
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
            
            setGlobalTapToNext(true);
          } else {
            status.textContent = "";
            status.classList.remove("ok");
            canAdvance = false;

            tapHint.classList.remove("show");
            clickCatcher.classList.remove("active");
            clearGlobalTaps();
          }
        }

        input?.addEventListener("input", () => {
          lastValue = input.value;
          okNow = isCorrectAnswer(lastValue);
          updateUI();
        });

        
        input?.addEventListener("pointerdown", (e) => e.stopPropagation());
        input?.addEventListener("click", (e) => e.stopPropagation());

        
        const originalSlideToNext = slideToNext;
        function goNextWithSave() {
          if (!canAdvance) return;

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

          originalSlideToNext();
        }

        
        
        clickCatcher.onclick = (e) => {
          if (
            e?.target &&
            (e.target.closest("input") || e.target.closest("button") || e.target.closest("a"))
          ) {
            return;
          }
          goNextWithSave();
        };
        deck.onclick = clickCatcher.onclick;
      }, 0);

      return wrap;
    },
  },

  // ---------- 3) Просто текст ----------
  {
    id: "after-answer-text",
    render() {
      canAdvance = true;

      tapHint.classList.add("show");
      
      setGlobalTapToNext(false);

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>К делу</h1>
        <p>👍🏻🤷‍♂️</p>
      `;
      return wrap;
    },
  },

  // 4) Вопрос Да/Нет 
  {
    id: "yesno",
    render() {
      canAdvance = false;

      tapHint.classList.remove("show");
      clickCatcher.classList.remove("active");
      clearGlobalTaps();

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Согласна ли ты провести 14 февраля со мной👉🏻👈🏻?</h1>
        <p>да нет</p>

        <div class="btn-row">
          <button class="btn" id="yesBtn" type="button">Да</button>
          
          <button class="btn" id="noBtn" type="button">Нет</button>
        </div>
      `;

      setTimeout(() => {
        const yesBtn = document.getElementById("yesBtn");
        const noBtn = document.getElementById("noBtn");

        const yesStartIdx = cards.findIndex((c) => c.id === "yes-1");
        const noCommentIdx = cards.findIndex((c) => c.id === "comment-no");

        let saved = false;
        function saveChoice(choice) {
          if (saved) return;
          saved = true;

          submitRowToGoogleForm({
            sessionId: SESSION_ID,
            questionId: "q2",
            questionTitle: "да нет",
            answerText: "",
            answerChoice: choice,
            answerMulti: "",
            isCorrect: false,
          });
        }

        yesBtn?.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            saveChoice("Да");
            slideTo(yesStartIdx);
          },
          { once: true }
        );

        noBtn?.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            saveChoice("Нет");
            slideTo(noCommentIdx);
          },
          { once: true }
        );
      }, 0);

      return wrap;
    },
  },

  // ВЕТКА "ДА" 

  //  yes-1 
  {
    id: "yes-1",
    render() {
      canAdvance = true;
      tapHint.classList.add("show");
      setGlobalTapToNext(false);

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Я очень рад!🎆:0💝</h1>
        <p>Однако есть некая грустность😔, надеюсь, вы простите меня(я чуть, а мб и не чуть накосячил xd)</p>
      `;
      return wrap;
    },
  },

  // 6) yes-2 
  {
    id: "yes-2",
    render() {
      canAdvance = true;
      tapHint.classList.add("show");
      setGlobalTapToNext(false);

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>НО!</h1>
        <p>Все будет, но немного не в том тайминге, котором я хотел:((</p>
        <p>Не судите строго мое первое 14 февраля пхахпаах, я чуть волнуюсь😩</p>
      `;
      return wrap;
    },
  },

  // 7) comment-yes
  {
  id: "comment-yes",
  render() {
    canAdvance = true;

    tapHint.classList.add("show");

    // ВАЖНО: clickCatcher выключаем, иначе он перекроет input
    clickCatcher.classList.remove("active");
    clickCatcher.onclick = null;
    deck.onclick = null;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <h1>По желанию</h1>
      <p>Можешь оставить комментарии/возражения, что угодно(я увижу)</p>

      <div class="field">
        <input id="commentYesInput" type="text"
               placeholder="🎁"
               autocomplete="off" />
        <div class="status" id="commentYesStatus"></div>
      </div>
    `;

    setTimeout(() => {
      const input = document.getElementById("commentYesInput");
      const status = document.getElementById("commentYesStatus");

      let saved = false;

      function saveAndGo() {
        if (saved) return;
        saved = true;

        const comment = input?.value ?? "";

        submitRowToGoogleForm({
          sessionId: SESSION_ID,
          questionId: "comment_yes",
          questionTitle: "Комментарий (ветка Да)",
          answerText: comment,
          answerChoice: "",
          answerMulti: "",
          isCorrect: false,
        });

        const endYesIdx = cards.findIndex((c) => c.id === "end-yes");
        slideTo(endYesIdx);
      }

      
      input?.addEventListener("pointerdown", (e) => e.stopPropagation());
      input?.addEventListener("click", (e) => e.stopPropagation());

      
      cardEl.onpointerdown = (e) => {
        if (e?.target && e.target.closest("input")) return;
        saveAndGo();
      };

      function updateStatus() {
        const hasText = ((input?.value ?? "").trim().length > 0);
        status.textContent = hasText
          ? "Тапни по карточке, чтобы сохранить"
          : "Чтобы скипнуть и не писать ничего - просто тапни по карточке";
        status.classList.toggle("ok", hasText);
      }

      input?.addEventListener("input", updateStatus);
      updateStatus();
    }, 0);

    return wrap;
  }
},



  //  8) Финал ветки "ДА" 
  {
    id: "end-yes",
    render() {
      canAdvance = false;

      tapHint.classList.remove("show");
      clickCatcher.classList.remove("active");
      clearGlobalTaps();

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Спасибо, что прошли этот опрос!❤️</h1>
        <p>Можете закрыть/обновить вкладку, чтоб произведение остановилось</p>
        
        
      `;
      return wrap;
    },
  },

  //ВЕТКА "НЕТ" 

  //  9) comment-no 
  {
  id: "comment-no",
  render() {
    canAdvance = true;

    tapHint.classList.add("show");

    // ВАЖНО: clickCatcher выключаем, иначе он перекроет input
    clickCatcher.classList.remove("active");
    clickCatcher.onclick = null;
    deck.onclick = null;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <h1>По желанию</h1>
      <p>Можешь написать что-то(я увижу)</p>

      <div class="field">
        <input id="commentNoInput" type="text"
               placeholder="🧐"
               autocomplete="off" />
        <div class="status" id="commentNoStatus"></div>
      </div>
    `;

    setTimeout(() => {
      const input = document.getElementById("commentNoInput");
      const status = document.getElementById("commentNoStatus");

      let saved = false;

      function saveAndGo() {
        if (saved) return;
        saved = true;

        const comment = input?.value ?? "";

        submitRowToGoogleForm({
          sessionId: SESSION_ID,
          questionId: "comment_no",
          questionTitle: "По желанию",
          answerText: comment,
          answerChoice: "",
          answerMulti: "",
          isCorrect: false,
        });

        const endNoIdx = cards.findIndex((c) => c.id === "end-no");
        slideTo(endNoIdx);
      }

      // Тап по input НЕ должен листать
      input?.addEventListener("pointerdown", (e) => e.stopPropagation());
      input?.addEventListener("click", (e) => e.stopPropagation());

      // Тап по КАРТОЧКЕ (вне input) = сохранить и перейти
      cardEl.onpointerdown = (e) => {
        if (e?.target && e.target.closest("input")) return;
        saveAndGo();
      };

      function updateStatus() {
        const hasText = ((input?.value ?? "").trim().length > 0);
        status.textContent = hasText
          ? "Тапни по карточке, чтобы сохранить"
          : "Тапни по карточке, можно ничего не писать";
        status.classList.toggle("ok", hasText);
      }

      input?.addEventListener("input", updateStatus);
      updateStatus();
    }, 0);

    return wrap;
  }
},



  // ---------- 10) Финал ветки "НЕТ" ----------
  {
    id: "end-no",
    render() {
      canAdvance = false;

      tapHint.classList.remove("show");
      clickCatcher.classList.remove("active");
      clearGlobalTaps();

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Вот так вот да, нууу понятно блин:/</h1>
        <p>Можешь закрыть/обновить вкладку, чтоб произведение остановилось</p>
        
      `;
      return wrap;
    },
  },
];

// ================== РЕНДЕР ==================
function renderCard() {
  // чтобы обработчик с прошлой карточки не оставался
  cardEl.onclick = null;
  cardEl.onpointerdown = null;

  cardEl.classList.remove("deal-in");
  cardEl.innerHTML = "";
  cardEl.appendChild(cards[step].render());
  requestAnimationFrame(() => cardEl.classList.add("deal-in"));
}


// старт
renderCard();


