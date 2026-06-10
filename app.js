const STORAGE_KEYS = {
  favorites: "garden-quiz-favorites",
  wrongBook: "garden-quiz-wrong-book",
  stats: "garden-quiz-stats",
  history: "garden-quiz-history",
};

const VIEW_CONFIG = [
  { id: "practice", label: "练习" },
  { id: "wrong", label: "错题本" },
  { id: "favorites", label: "收藏夹" },
  { id: "exam", label: "模拟考" },
  { id: "resources", label: "资料库" },
];

const TYPE_CONFIG = [
  { id: "all", label: "全部" },
  { id: "single", label: "单选" },
  { id: "multi", label: "多选" },
  { id: "judge", label: "判断" },
];

const PRACTICE_ORDER_CONFIG = [
  { id: "sequence", label: "顺序刷" },
  { id: "random", label: "随机刷" },
];

const EXAM_QUESTION_COUNT = 30;
const EXAM_DURATION_MINUTES = 40;

const state = {
  questionMap: new Map(),
  allQuestions: [],
  resources: [],
  currentView: "practice",
  typeFilter: "all",
  practiceOrder: "sequence",
  practiceSession: [],
  practiceIndex: 0,
  practiceSelection: [],
  practiceSubmitted: false,
  favorites: new Set(),
  wrongBook: new Map(),
  stats: {
    answered: 0,
    correct: 0,
  },
  history: [],
  exam: {
    questions: [],
    index: 0,
    answers: {},
    startedAt: null,
    endsAt: null,
    submitted: false,
    score: null,
  },
  countdownTimer: null,
};

const elements = {
  statGrid: document.querySelector("#statGrid"),
  sourceStrip: document.querySelector("#sourceStrip"),
  viewTabs: document.querySelector("#viewTabs"),
  typeFilters: document.querySelector("#typeFilters"),
  practiceOrderTabs: document.querySelector("#practiceOrderTabs"),
  practiceControls: document.querySelector("#practiceControls"),
  questionArea: document.querySelector("#questionArea"),
  examCard: document.querySelector("#examCard"),
  historyArea: document.querySelector("#historyArea"),
  shareButton: document.querySelector("#shareButton"),
  installHintButton: document.querySelector("#installHintButton"),
  tipsDialog: document.querySelector("#tipsDialog"),
  closeTipsButton: document.querySelector("#closeTipsButton"),
};

function safeJsonParse(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function loadStorage() {
  state.favorites = new Set(safeJsonParse(localStorage.getItem(STORAGE_KEYS.favorites), []));
  state.wrongBook = new Map(safeJsonParse(localStorage.getItem(STORAGE_KEYS.wrongBook), []));
  state.stats = safeJsonParse(localStorage.getItem(STORAGE_KEYS.stats), state.stats);
  state.history = safeJsonParse(localStorage.getItem(STORAGE_KEYS.history), []);
}

function saveStorage() {
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify([...state.favorites]));
  localStorage.setItem(STORAGE_KEYS.wrongBook, JSON.stringify([...state.wrongBook.entries()]));
  localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(state.stats));
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history.slice(0, 8)));
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function normalizeAnswer(answer) {
  return [...answer].sort().join("");
}

function isCorrectAnswer(question, selection) {
  return normalizeAnswer(selection) === normalizeAnswer(question.answer);
}

function formatType(type) {
  return TYPE_CONFIG.find((item) => item.id === type)?.label ?? type;
}

function getQuestionSource() {
  let questions = [...state.allQuestions];

  if (state.typeFilter !== "all") {
    questions = questions.filter((item) => item.type === state.typeFilter);
  }

  if (state.currentView === "wrong") {
    questions = questions.filter((item) => state.wrongBook.has(item.id));
  }

  if (state.currentView === "favorites") {
    questions = questions.filter((item) => state.favorites.has(item.id));
  }

  return state.practiceOrder === "random" ? shuffle(questions) : questions;
}

function rebuildPracticeSession(keepQuestionId = null) {
  const source = getQuestionSource();
  state.practiceSession = source;

  if (!source.length) {
    state.practiceIndex = 0;
    state.practiceSelection = [];
    state.practiceSubmitted = false;
    return;
  }

  const nextIndex = keepQuestionId
    ? Math.max(
        0,
        source.findIndex((item) => item.id === keepQuestionId),
      )
    : Math.min(state.practiceIndex, source.length - 1);

  state.practiceIndex = nextIndex === -1 ? 0 : nextIndex;
  state.practiceSelection = [];
  state.practiceSubmitted = false;
}

function createButtonGroup(target, items, activeId, onClick) {
  target.innerHTML = "";
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.label;
    if (item.id === activeId) {
      button.classList.add("is-active");
    }
    button.addEventListener("click", () => onClick(item.id));
    target.append(button);
  });
}

function renderStats() {
  const accuracy = state.stats.answered
    ? `${Math.round((state.stats.correct / state.stats.answered) * 100)}%`
    : "--";

  const stats = [
    { label: "题库总数", value: state.allQuestions.length },
    { label: "收藏题目", value: state.favorites.size },
    { label: "错题累计", value: state.wrongBook.size },
    { label: "练习正确率", value: accuracy },
  ];

  elements.statGrid.innerHTML = stats
    .map(
      (item) => `
        <article class="stat-card">
          <p class="stat-card__label">${item.label}</p>
          <p class="stat-card__value">${item.value}</p>
        </article>
      `,
    )
    .join("");

  const sources = [];
  const publicCount = state.allQuestions.filter((item) => item.source !== "学校理论题库").length;
  const schoolCount = state.allQuestions.filter((item) => item.source === "学校理论题库").length;
  if (publicCount) sources.push(`公开模拟题 ${publicCount} 题`);
  if (schoolCount) sources.push(`学校理论题库 ${schoolCount} 题`);

  elements.sourceStrip.innerHTML = sources
    .map((text) => `<span class="badge">${text}</span>`)
    .join("");
}

function updateWrongBook(question, correct) {
  if (correct) {
    return;
  }

  const record = state.wrongBook.get(question.id) ?? {
    wrongCount: 0,
    lastWrongAt: "",
  };

  record.wrongCount += 1;
  record.lastWrongAt = new Date().toISOString();
  state.wrongBook.set(question.id, record);
}

function updatePracticeStats(correct) {
  state.stats.answered += 1;
  if (correct) {
    state.stats.correct += 1;
  }
}

function currentPracticeQuestion() {
  return state.practiceSession[state.practiceIndex] ?? null;
}

function toggleFavorite(questionId) {
  if (!questionId) {
    return;
  }

  if (state.favorites.has(questionId)) {
    state.favorites.delete(questionId);
  } else {
    state.favorites.add(questionId);
  }
  saveStorage();
  render();
}

function movePractice(offset) {
  const nextIndex = state.practiceIndex + offset;
  if (nextIndex < 0 || nextIndex >= state.practiceSession.length) {
    return;
  }

  state.practiceIndex = nextIndex;
  state.practiceSelection = [];
  state.practiceSubmitted = false;
  render();
}

function handlePracticeChoice(key) {
  const question = currentPracticeQuestion();
  if (!question || state.practiceSubmitted) {
    return;
  }

  if (question.type === "multi") {
    state.practiceSelection = state.practiceSelection.includes(key)
      ? state.practiceSelection.filter((item) => item !== key)
      : [...state.practiceSelection, key];
  } else {
    state.practiceSelection = [key];
    submitPracticeAnswer();
  }
  render();
}

function submitPracticeAnswer() {
  const question = currentPracticeQuestion();
  if (!question || !state.practiceSelection.length || state.practiceSubmitted) {
    return;
  }

  state.practiceSubmitted = true;
  const correct = isCorrectAnswer(question, state.practiceSelection);
  updatePracticeStats(correct);
  updateWrongBook(question, correct);
  saveStorage();
  render();
}

function renderPracticeQuestion(question) {
  if (!question) {
    return `
      <div class="empty-state">
        <h3>这里暂时没有题目</h3>
        <p class="muted">切换题型，或者先做几道题再回来查看错题本和收藏夹。</p>
      </div>
    `;
  }

  const progress = ((state.practiceIndex + 1) / state.practiceSession.length) * 100;
  const isFavorite = state.favorites.has(question.id);
  const correct = state.practiceSubmitted && isCorrectAnswer(question, state.practiceSelection);
  const hasWrong = state.practiceSubmitted && !correct;

  const resultBox = state.practiceSubmitted
    ? `
      <div class="result-box" data-tone="${correct ? "success" : "danger"}">
        <h3>${correct ? "答对了，继续保持。" : "这题先记到错题本里了。"}</h3>
        <p>正确答案：${question.answerText}</p>
        <p class="muted">${question.explanation}</p>
      </div>
    `
    : "";

  return `
    <div class="question-shell">
      <div class="question-meta">
        <span class="badge">${formatType(question.type)}</span>
        <span class="badge">${question.source ?? "综合题库"}</span>
        <span class="badge badge--accent">第 ${state.practiceIndex + 1} / ${state.practiceSession.length} 题</span>
        <span class="badge">${question.type === "multi" ? "可多选，选完后提交" : "单击即可作答"}</span>
      </div>
      <div class="progress-bar" aria-hidden="true">
        <div class="progress-bar__fill" style="width:${progress.toFixed(2)}%"></div>
      </div>
      <h2 class="question-title">${question.prompt}</h2>
      <div class="option-list">
        ${question.options
          .map((option) => {
            const selected = state.practiceSelection.includes(option.key);
            const correctChoice = state.practiceSubmitted && question.answer.includes(option.key);
            const wrongChoice = state.practiceSubmitted && selected && !question.answer.includes(option.key);
            const classes = ["option-button"];

            if (selected) classes.push("is-selected");
            if (correctChoice) classes.push("is-correct");
            if (wrongChoice) classes.push("is-wrong");

            return `
              <button
                class="${classes.join(" ")}"
                data-option-key="${option.key}"
                type="button"
              >
                <span class="option-button__key">${option.key}</span>
                <span>${option.text}</span>
              </button>
            `;
          })
          .join("")}
      </div>
      ${resultBox}
      <div class="action-row">
        <button class="button--muted button" type="button" data-action="prev">上一题</button>
        <button class="button--muted button" type="button" data-action="next">下一题</button>
        ${
          question.type === "multi"
            ? `<button class="button" type="button" data-action="submit-practice">提交答案</button>`
            : ""
        }
        <button class="button ${isFavorite ? "button--danger" : ""}" type="button" data-action="toggle-favorite">
          ${isFavorite ? "取消收藏" : "收藏本题"}
        </button>
        ${
          hasWrong
            ? `<button class="button button--light" type="button" data-action="retry">重新作答</button>`
            : ""
        }
      </div>
    </div>
  `;
}

function resetPracticeCurrent() {
  state.practiceSelection = [];
  state.practiceSubmitted = false;
  render();
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyArea.innerHTML = `
      <div class="empty-state">
        <h3>还没有考试记录</h3>
        <p class="muted">做完一套模拟考后，这里会自动保存最近成绩。</p>
      </div>
    `;
    return;
  }

  elements.historyArea.innerHTML = `
    <div class="history-list">
      ${state.history
        .map(
          (item) => `
            <div class="history-item">
              <div>
                <strong>${item.score} 分</strong>
                <div class="muted">${item.correctCount}/${item.total} 题正确</div>
              </div>
              <div class="muted">${item.when}</div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function createExamSession() {
  const candidates = state.typeFilter === "all"
    ? [...state.allQuestions]
    : state.allQuestions.filter((item) => item.type === state.typeFilter);

  const questions = shuffle(candidates).slice(0, Math.min(EXAM_QUESTION_COUNT, candidates.length));

  state.exam = {
    questions,
    index: 0,
    answers: {},
    startedAt: Date.now(),
    endsAt: Date.now() + EXAM_DURATION_MINUTES * 60 * 1000,
    submitted: false,
    score: null,
  };

  startCountdown();
  render();
}

function stopCountdown() {
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }
}

function startCountdown() {
  stopCountdown();
  state.countdownTimer = window.setInterval(() => {
    if (!state.exam.startedAt || state.exam.submitted) {
      stopCountdown();
      return;
    }

    if (Date.now() >= state.exam.endsAt) {
      submitExam();
      return;
    }

    renderExamCard();
    attachExamCardEvents();
  }, 1000);
}

function formatCountdown() {
  if (!state.exam.endsAt) {
    return "--:--";
  }

  const diff = Math.max(0, state.exam.endsAt - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function currentExamQuestion() {
  return state.exam.questions[state.exam.index] ?? null;
}

function handleExamChoice(key) {
  const question = currentExamQuestion();
  if (!question || state.exam.submitted) {
    return;
  }

  const current = state.exam.answers[question.id] ?? [];
  state.exam.answers[question.id] =
    question.type === "multi"
      ? current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
      : [key];

  render();
}

function jumpToExam(index) {
  state.exam.index = index;
  render();
}

function submitExam() {
  if (!state.exam.questions.length || state.exam.submitted) {
    return;
  }

  stopCountdown();
  let correctCount = 0;

  state.exam.questions.forEach((question) => {
    if (isCorrectAnswer(question, state.exam.answers[question.id] ?? [])) {
      correctCount += 1;
    } else {
      updateWrongBook(question, false);
    }
  });

  const score = Math.round((correctCount / state.exam.questions.length) * 100);
  state.exam.submitted = true;
  state.exam.score = score;
  state.history = [
    {
      score,
      total: state.exam.questions.length,
      correctCount,
      when: new Date().toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    ...state.history,
  ].slice(0, 8);
  saveStorage();
  render();
}

function renderExamCard() {
  if (!state.exam.questions.length) {
    elements.examCard.innerHTML = `
      <div class="summary-box">
        <h3>40 分钟模拟考</h3>
        <p class="muted">默认从当前题型筛选里随机抽 30 题，适合考前冲刺。</p>
        <button class="button" type="button" data-action="start-exam">开始抽题</button>
      </div>
    `;
    return;
  }

  const answeredCount = Object.values(state.exam.answers).filter((answer) => answer?.length).length;

  const summary = state.exam.submitted
    ? `
      <div class="summary-box">
        <h3>本次得分 ${state.exam.score} 分</h3>
        <p>已完成 ${state.exam.questions.length} 题，答对 ${
          state.history[0]?.correctCount ?? 0
        } 题。</p>
        <button class="button" type="button" data-action="restart-exam">再来一套</button>
      </div>
    `
    : `
      <div class="summary-box">
        <h3>考试进行中</h3>
        <p>已作答 ${answeredCount}/${state.exam.questions.length} 题</p>
        <p class="muted">剩余时间 ${formatCountdown()}</p>
        <div class="action-row">
          <button class="button" type="button" data-action="submit-exam">交卷</button>
          <button class="button button--muted" type="button" data-action="restart-exam">重开本套</button>
        </div>
      </div>
    `;

  elements.examCard.innerHTML = `
    ${summary}
    <div class="exam-grid">
      ${state.exam.questions
        .map((question, index) => {
          const answered = (state.exam.answers[question.id] ?? []).length > 0;
          const classes = ["exam-option"];
          if (index === state.exam.index) classes.push("is-current");
          if (answered) classes.push("is-answered");
          return `
            <button class="${classes.join(" ")}" data-exam-index="${index}" type="button">
              ${index + 1}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderExamQuestion(question) {
  if (!question) {
    return `
      <div class="empty-state">
        <h3>还没有开始模拟考试</h3>
        <p class="muted">点右侧“开始抽题”就能进入 40 分钟冲刺模式。</p>
      </div>
    `;
  }

  const progress = ((state.exam.index + 1) / state.exam.questions.length) * 100;
  const selection = state.exam.answers[question.id] ?? [];
  const answerReview = state.exam.submitted
    ? `
      <div class="result-box" data-tone="${isCorrectAnswer(question, selection) ? "success" : "danger"}">
        <h3>${isCorrectAnswer(question, selection) ? "本题答对" : "本题答错"}</h3>
        <p>正确答案：${question.answerText}</p>
        <p class="muted">${question.explanation}</p>
      </div>
    `
    : "";

  return `
    <div class="question-shell">
      <div class="question-meta">
        <span class="badge">模拟考试</span>
        <span class="badge">${question.source ?? "综合题库"}</span>
        <span class="badge badge--accent">第 ${state.exam.index + 1} / ${state.exam.questions.length} 题</span>
        <span class="badge">${formatType(question.type)}</span>
      </div>
      <div class="progress-bar" aria-hidden="true">
        <div class="progress-bar__fill" style="width:${progress.toFixed(2)}%"></div>
      </div>
      <h2 class="question-title">${question.prompt}</h2>
      <div class="option-list">
        ${question.options
          .map((option) => {
            const classes = ["option-button"];
            const selected = selection.includes(option.key);
            if (selected) classes.push("is-selected");

            if (state.exam.submitted && question.answer.includes(option.key)) {
              classes.push("is-correct");
            }

            if (state.exam.submitted && selected && !question.answer.includes(option.key)) {
              classes.push("is-wrong");
            }

            return `
              <button class="${classes.join(" ")}" type="button" data-exam-option-key="${option.key}">
                <span class="option-button__key">${option.key}</span>
                <span>${option.text}</span>
              </button>
            `;
          })
          .join("")}
      </div>
      ${answerReview}
      <div class="action-row">
        <button class="button button--muted" type="button" data-action="exam-prev">上一题</button>
        <button class="button button--muted" type="button" data-action="exam-next">下一题</button>
        ${
          state.exam.submitted
            ? `<button class="button" type="button" data-action="restart-exam">再来一套</button>`
            : `<button class="button" type="button" data-action="submit-exam">交卷</button>`
        }
      </div>
    </div>
  `;
}

function renderQuestionArea() {
  const hidePracticeControls = state.currentView === "exam" || state.currentView === "resources";
  const hideTypeFilters = state.currentView === "resources";
  elements.practiceControls.style.display = hidePracticeControls ? "none" : "grid";
  elements.typeFilters.parentElement.style.display = hideTypeFilters ? "none" : "grid";

  if (state.currentView === "exam") {
    elements.questionArea.innerHTML = renderExamQuestion(currentExamQuestion());
  } else if (state.currentView === "resources") {
    elements.questionArea.innerHTML = renderResourcesView();
  } else {
    elements.questionArea.innerHTML = renderPracticeQuestion(currentPracticeQuestion());
  }
}

function renderResourcesView() {
  const resources = state.resources.length
    ? state.resources
    : [
        {
          title: "资料暂未加载",
          description: "请确认 resources.json 和 resources 目录都已经部署成功。",
          href: "./data/resources.json",
          type: "json",
        },
      ];

  return `
    <div class="question-shell">
      <div class="question-meta">
        <span class="badge">学校资料库</span>
        <span class="badge badge--accent">${resources.length} 份资料</span>
        <span class="badge">识别题、主观题、速记文档都放这里</span>
      </div>
      <div class="resource-grid">
        ${resources
          .map(
            (item) => `
              <article class="resource-card">
                <div class="resource-card__type">${item.type.toUpperCase()}</div>
                <h3>${item.title}</h3>
                <p class="muted">${item.description}</p>
                <div class="resource-card__actions">
                  <a class="button link-button" href="${item.href}" target="_blank" rel="noopener noreferrer">打开资料</a>
                  <a class="button button--muted link-button" href="${item.href}" download>下载保存</a>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function attachQuestionEvents() {
  elements.questionArea.querySelectorAll("[data-option-key]").forEach((button) => {
    button.addEventListener("click", () => handlePracticeChoice(button.dataset.optionKey));
  });

  elements.questionArea.querySelectorAll("[data-exam-option-key]").forEach((button) => {
    button.addEventListener("click", () => handleExamChoice(button.dataset.examOptionKey));
  });

  elements.questionArea.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;

      if (action === "prev") movePractice(-1);
      if (action === "next") movePractice(1);
      if (action === "submit-practice") submitPracticeAnswer();
      if (action === "toggle-favorite") toggleFavorite(currentPracticeQuestion()?.id);
      if (action === "retry") resetPracticeCurrent();
      if (action === "exam-prev" && state.exam.index > 0) jumpToExam(state.exam.index - 1);
      if (action === "exam-next" && state.exam.index < state.exam.questions.length - 1) {
        jumpToExam(state.exam.index + 1);
      }
      if (action === "submit-exam") submitExam();
      if (action === "restart-exam" || action === "start-exam") createExamSession();
    });
  });
}

function attachExamCardEvents() {
  elements.examCard.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "start-exam" || action === "restart-exam") createExamSession();
      if (action === "submit-exam") submitExam();
    });
  });

  elements.examCard.querySelectorAll("[data-exam-index]").forEach((button) => {
    button.addEventListener("click", () => jumpToExam(Number(button.dataset.examIndex)));
  });
}

function render() {
  renderStats();

  createButtonGroup(elements.viewTabs, VIEW_CONFIG, state.currentView, (viewId) => {
    const keepId = currentPracticeQuestion()?.id ?? null;
    state.currentView = viewId;

    if (viewId !== "exam") {
      rebuildPracticeSession(keepId);
    }
    render();
  });

  createButtonGroup(elements.typeFilters, TYPE_CONFIG, state.typeFilter, (filterId) => {
    state.typeFilter = filterId;
    if (state.currentView === "exam") {
      render();
      return;
    }
    rebuildPracticeSession();
    render();
  });

  createButtonGroup(elements.practiceOrderTabs, PRACTICE_ORDER_CONFIG, state.practiceOrder, (orderId) => {
    const keepId = currentPracticeQuestion()?.id ?? null;
    state.practiceOrder = orderId;
    rebuildPracticeSession(keepId);
    render();
  });

  renderQuestionArea();
  renderExamCard();
  renderHistory();
  attachQuestionEvents();
  attachExamCardEvents();
}

async function shareSite() {
  const sharePayload = {
    title: "园林高级工刷题站",
    text: "这个刷题站我已经做好了，手机和微信里都能打开。",
    url: window.location.href,
  };

  if (navigator.share) {
    try {
      await navigator.share(sharePayload);
      return;
    } catch {
      // Fall through to clipboard copy.
    }
  }

  try {
    await navigator.clipboard.writeText(window.location.href);
    window.alert("链接已经复制，可以直接发到微信。");
  } catch {
    window.alert(`请手动复制链接：${window.location.href}`);
  }
}

function registerAppEvents() {
  elements.shareButton.addEventListener("click", shareSite);
  elements.installHintButton.addEventListener("click", () => elements.tipsDialog.showModal());
  elements.closeTipsButton.addEventListener("click", () => elements.tipsDialog.close());

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

async function boot() {
  loadStorage();
  const [questionResponse, resourceResponse] = await Promise.all([
    fetch("./data/questions.json"),
    fetch("./data/resources.json").catch(() => null),
  ]);
  const payload = await questionResponse.json();
  const resourcePayload = resourceResponse ? await resourceResponse.json() : { resources: [] };

  state.allQuestions = payload.questions;
  state.resources = resourcePayload.resources ?? [];
  state.questionMap = new Map(payload.questions.map((item) => [item.id, item]));
  rebuildPracticeSession();
  registerAppEvents();
  render();
}

boot().catch((error) => {
  console.error(error);
  elements.questionArea.innerHTML = `
    <div class="empty-state">
      <h3>题库加载失败</h3>
      <p class="muted">请确认 data/questions.json 文件存在，或者重新部署站点后再试。</p>
    </div>
  `;
});
