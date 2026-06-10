import { aiApi } from "./api/ai.api.js";
import { authApi } from "./api/auth.api.js";
import { boardApi } from "./api/board.api.js";
import { clearToken, friendlyApiError, getToken, setToken } from "./api/client.js";
import { hospitalApi } from "./api/hospital.api.js";
import { questionnaireApi } from "./api/questionnaire.api.js";

const LAST_CONSULTATION_KEY = "aicloud.lastConsultationId";

const AGE_FILTERS = [
  { label: "전체", value: "전체" },
  { label: "0~6개월", value: "0-6" },
  { label: "7~12개월", value: "7-12" },
  { label: "13~24개월", value: "13-24" },
  { label: "25~36개월", value: "25-36" },
  { label: "37~60개월", value: "37-60" },
];

const INFO_CATEGORIES = ["예방접종", "주의사항", "발달", "영양", "질환정보", "응급징후", "공지"];

const SAMPLE_INFO_POSTS = [
  {
    id: "sample-emergency-all",
    category: "응급징후",
    targetAgeMonths: "전체",
    title: "바로 진료가 필요한 증상",
    content:
      "고열이 지속되거나 호흡이 힘들어 보임, 경련, 의식 저하, 탈수 증상이 의심되는 경우에는 지체하지 말고 의료기관에 문의하거나 진료를 받는 것이 좋습니다.",
    viewCount: 311,
    createdAt: "2026-05-26T00:00:00.000Z",
  },
  {
    id: "sample-ai-notice-all",
    category: "주의사항",
    targetAgeMonths: "전체",
    title: "AI 결과는 참고용입니다",
    content:
      "Ai클라우드의 문진 결과는 병원 방문 전 증상 정리를 돕기 위한 참고용이며, 의료진의 진단을 대체하지 않습니다.",
    viewCount: 212,
    createdAt: "2026-05-26T00:00:00.000Z",
  },
  {
    id: "sample-vaccine-0-6",
    category: "예방접종",
    targetAgeMonths: "0-6",
    title: "생후 초기 예방접종 체크",
    content:
      "생후 초기에는 여러 예방접종 일정이 포함될 수 있습니다. 접종 시기와 차수는 아이의 출생일과 이전 접종 이력에 따라 달라질 수 있으므로, 질병관리청 예방접종도우미 또는 의료기관 안내를 확인하세요.",
    viewCount: 128,
    createdAt: "2026-05-26T00:00:00.000Z",
  },
  {
    id: "sample-fever-0-6",
    category: "주의사항",
    targetAgeMonths: "0-6",
    title: "생후 초기 발열 시 주의",
    content:
      "어린 영아의 발열은 보호자가 임의로 판단하기보다 아이의 컨디션, 수유량, 호흡 상태를 함께 관찰하고 필요 시 의료기관에 문의하는 것이 좋습니다.",
    viewCount: 143,
    createdAt: "2026-05-26T00:00:00.000Z",
  },
  {
    id: "sample-food-7-12",
    category: "영양",
    targetAgeMonths: "7-12",
    title: "이유식 시작 시 확인할 점",
    content:
      "새로운 음식을 시작할 때는 한 번에 여러 가지를 섞기보다 하나씩 천천히 시도하면서 발진, 구토, 설사 등 이상 반응을 관찰하는 것이 좋습니다.",
    viewCount: 117,
    createdAt: "2026-05-26T00:00:00.000Z",
  },
  {
    id: "sample-crawling-7-12",
    category: "발달",
    targetAgeMonths: "7-12",
    title: "기어다니기 시기 안전관리",
    content:
      "아이가 기어다니기 시작하면 작은 물건 삼킴, 콘센트, 모서리, 낙상 위험을 줄이기 위해 생활 공간을 점검하는 것이 좋습니다.",
    viewCount: 96,
    createdAt: "2026-05-26T00:00:00.000Z",
  },
  {
    id: "sample-walk-13-24",
    category: "발달",
    targetAgeMonths: "13-24",
    title: "걷기 시작 시기 안전관리",
    content:
      "걷기 시작하면 낙상과 충돌 위험이 늘어납니다. 미끄럼 방지, 모서리 보호, 계단 접근 차단 등 실내 안전 환경을 점검하세요.",
    viewCount: 88,
    createdAt: "2026-05-26T00:00:00.000Z",
  },
  {
    id: "sample-infection-13-24",
    category: "주의사항",
    targetAgeMonths: "13-24",
    title: "감염 증상 관찰하기",
    content:
      "외부 활동이 늘어나면 감기, 장염 등 감염 증상이 나타날 수 있습니다. 열, 수분 섭취, 소변량, 활동성을 함께 관찰하세요.",
    viewCount: 122,
    createdAt: "2026-05-26T00:00:00.000Z",
  },
  {
    id: "sample-toilet-25-36",
    category: "발달",
    targetAgeMonths: "25-36",
    title: "배변훈련 준비하기",
    content:
      "배변훈련은 아이의 준비 상태에 따라 천천히 진행하는 것이 좋습니다. 실패를 혼내기보다 반복적인 루틴을 만들어주는 것이 도움이 됩니다.",
    viewCount: 73,
    createdAt: "2026-05-26T00:00:00.000Z",
  },
  {
    id: "sample-burn-25-36",
    category: "주의사항",
    targetAgeMonths: "25-36",
    title: "화상과 삼킴 사고 예방",
    content: "뜨거운 음식, 전기포트, 작은 장난감, 동전, 약품은 아이 손이 닿지 않는 곳에 보관하세요.",
    viewCount: 104,
    createdAt: "2026-05-26T00:00:00.000Z",
  },
  {
    id: "sample-daycare-37-60",
    category: "질환정보",
    targetAgeMonths: "37-60",
    title: "어린이집 감염질환 주의",
    content:
      "단체 생활을 하면서 감기, 수족구, 장염 등 감염질환 노출이 늘 수 있습니다. 손씻기와 개인 물품 관리가 중요합니다.",
    viewCount: 156,
    createdAt: "2026-05-26T00:00:00.000Z",
  },
  {
    id: "sample-language-37-60",
    category: "발달",
    targetAgeMonths: "37-60",
    title: "언어와 사회성 관찰",
    content:
      "또래와의 상호작용, 말하기, 감정 표현이 활발해지는 시기입니다. 발달에 대한 걱정이 있다면 전문기관이나 의료진 상담을 고려할 수 있습니다.",
    viewCount: 81,
    createdAt: "2026-05-26T00:00:00.000Z",
  },
];

const state = {
  adminPosts: [],
  children: [],
  infoAgeFilter: "전체",
  infoPosts: [],
  lastConsultationId: localStorage.getItem(LAST_CONSULTATION_KEY) || null,
  me: null,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function isValidBirthDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function assertBirthDate(form, fieldName) {
  const value = form.elements[fieldName]?.value || "";
  if (isValidBirthDate(value)) return value;
  throw new Error("아이의 생년월일을 연도, 월, 일까지 선택해 주세요.");
}

function populateBirthdatePickers() {
  const yearOptions = document.getElementById("birthYearOptions");
  const currentYear = new Date().getFullYear();
  if (yearOptions) {
    yearOptions.innerHTML = Array.from({ length: 27 }, (_, index) => currentYear - index)
      .map((year) => `<option value="${year}"></option>`)
      .join("");
  }

  document.querySelectorAll("[data-birthdate-picker]").forEach((picker) => {
    const yearInput = picker.querySelector('[data-birthdate-part="year"]');
    const monthSelect = picker.querySelector('[data-birthdate-part="month"]');
    const daySelect = picker.querySelector('[data-birthdate-part="day"]');
    const hiddenInput = picker.parentElement.querySelector("[data-birthdate-value]");

    monthSelect.innerHTML =
      '<option value="">월</option>' +
      Array.from({ length: 12 }, (_, index) => {
        const month = String(index + 1).padStart(2, "0");
        return `<option value="${month}">${index + 1}월</option>`;
      }).join("");

    function syncDays() {
      const year = Number(yearInput.value);
      const month = Number(monthSelect.value);
      const previousDay = daySelect.value;
      const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 31;

      daySelect.innerHTML =
        '<option value="">일</option>' +
        Array.from({ length: daysInMonth }, (_, index) => {
          const day = String(index + 1).padStart(2, "0");
          return `<option value="${day}">${index + 1}일</option>`;
        }).join("");

      if (previousDay && Number(previousDay) <= daysInMonth) {
        daySelect.value = previousDay;
      }
    }

    function syncValue() {
      const year = yearInput.value.trim();
      const month = monthSelect.value;
      const day = daySelect.value;
      hiddenInput.value = year && month && day ? `${year}-${month}-${day}` : "";
    }

    yearInput.addEventListener("input", () => {
      yearInput.value = yearInput.value.replace(/\D/g, "").slice(0, 4);
      syncDays();
      syncValue();
    });
    monthSelect.addEventListener("change", () => {
      syncDays();
      syncValue();
    });
    daySelect.addEventListener("change", syncValue);
    syncDays();
  });
}

function formatDateTime(value) {
  if (!value) return "날짜 미기재";
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "날짜 미기재";
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function normalizeAgeValue(value) {
  const raw = String(value || "전체").trim();
  const compact = raw.replaceAll("개월", "").replaceAll("~", "-");
  const matched = AGE_FILTERS.find((item) => item.value === raw || item.label === raw || item.value === compact);
  return matched?.value || raw;
}

function ageLabel(value) {
  const normalized = normalizeAgeValue(value);
  return AGE_FILTERS.find((item) => item.value === normalized)?.label || normalized;
}

function normalizeInfoPost(post) {
  const targetAgeMonths = normalizeAgeValue(post.targetAgeMonths || post.target_age_months || "전체");
  return {
    ...post,
    admin: post.admin || post.user,
    category: post.category || "공지",
    targetAgeMonths,
    viewCount: post.viewCount ?? post.view_count ?? 0,
    createdAt: post.createdAt || post.created_at,
  };
}

function samplePostsForAge(targetAgeMonths = "전체") {
  const target = normalizeAgeValue(targetAgeMonths);
  return SAMPLE_INFO_POSTS.filter(
    (post) => target === "전체" || normalizeAgeValue(post.targetAgeMonths) === "전체" || normalizeAgeValue(post.targetAgeMonths) === target,
  );
}

function mergeInfoPosts(apiPosts, samplePosts) {
  const apiPostKeys = new Set(apiPosts.map((post) => `${post.category}:${post.targetAgeMonths}:${post.title}`));
  const uniqueSamples = samplePosts.filter(
    (post) => !apiPostKeys.has(`${post.category}:${normalizeAgeValue(post.targetAgeMonths)}:${post.title}`),
  );
  return [...apiPosts, ...uniqueSamples];
}

function routeName() {
  return (location.hash.replace("#/", "") || "login").split("?")[0];
}

function routeQuery() {
  return new URLSearchParams(location.hash.split("?")[1] || "");
}

function navigate(page) {
  location.hash = `#/${page}`;
}

function isAdmin() {
  return state.me?.role === "ADMIN";
}

function updateRoleUi() {
  document.querySelectorAll("[data-admin-nav], [data-admin-only]").forEach((element) => {
    element.hidden = !isAdmin();
  });
}

function renderNotice(targetId, title, message) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = `
    <article class="info-card">
      <strong>${escapeHtml(title)}</strong>
      <p class="subtle">${escapeHtml(message)}</p>
    </article>
  `;
}

function setLastConsultationId(id) {
  state.lastConsultationId = id;
  localStorage.setItem(LAST_CONSULTATION_KEY, id);
}

function normalizeChild(child) {
  return {
    id: child.id || child.childId || child.child_id,
    name: child.name || child.childName || "아이",
    birthDate: child.birthDate || child.birth_date || "",
    gender: child.gender || child.childGender || "",
  };
}

function childOptionMarkup(children, includeAll = false) {
  if (!children.length) {
    return includeAll
      ? '<option value="">전체 아이</option>'
      : '<option value="">등록된 아이가 없습니다</option>';
  }

  const firstOption = includeAll ? '<option value="">전체 아이</option>' : '<option value="">아이 선택</option>';
  return `${firstOption}${children
    .map((child) => `<option value="${escapeHtml(child.id)}">${escapeHtml(child.name)} (${escapeHtml(child.gender || "성별 미기재")})</option>`)
    .join("")}`;
}

function renderChildren(targetId, children) {
  const target = document.getElementById(targetId);
  if (!target) return;

  if (!children.length) {
    renderNotice(targetId, "등록된 아이가 없습니다", "마이페이지에서 아이 정보를 먼저 등록해 주세요.");
    return;
  }

  const canEdit = targetId === "childList";
  target.innerHTML = children
    .map(
      (child) => `
        <article class="child-card">
          <strong>${escapeHtml(child.name)}</strong>
          <small>${escapeHtml(child.birthDate || "생년월일 미기재")} · ${escapeHtml(child.gender || "성별 미기재")}</small>
          <span class="badge-soft">${escapeHtml(child.id)}</span>
          ${
            canEdit
              ? `<button class="ghost-button slim" data-child-edit="${escapeHtml(child.id)}" type="button">수정</button>`
              : ""
          }
        </article>
      `,
    )
    .join("");

  if (canEdit) {
    document.querySelectorAll("[data-child-edit]").forEach((button) => {
      button.addEventListener("click", () => updateChild(button.dataset.childEdit));
    });
  }
}

async function safeLoadMe(renderProfile = false) {
  try {
    state.me = await authApi.me();
  } catch (error) {
    state.me = null;
    updateRoleUi();
    const message = friendlyApiError(error, "auth");
    if (renderProfile) {
      document.getElementById("meBox").innerHTML = `<p class="profile-error">${escapeHtml(message)}</p>`;
    }
    const greeting = document.getElementById("homeGreeting");
    if (greeting) greeting.textContent = message;
    return null;
  }

  updateRoleUi();

  if (renderProfile) {
    document.getElementById("meBox").innerHTML = `
      <dl class="profile-fields">
        <div>
          <dt>이메일</dt>
          <dd>${escapeHtml(state.me.email)}</dd>
        </div>
        <div>
          <dt>닉네임</dt>
          <dd>${escapeHtml(state.me.nickname)}</dd>
        </div>
      </dl>
    `;
  }

  const greeting = document.getElementById("homeGreeting");
  if (greeting) {
    greeting.textContent = `${state.me.nickname || "보호자"}님, 오늘도 아이의 건강을 차분히 살펴볼게요`;
  }
  return state.me;
}

async function safeLoadChildren() {
  try {
    state.children = (await authApi.children()).map(normalizeChild);
  } catch (error) {
    state.children = [];
    const message = friendlyApiError(error, "auth");
    renderNotice("homeChildList", "아이 정보를 불러올 수 없습니다", message);
    renderNotice("childList", "아이 정보를 불러올 수 없습니다", message);
  }
  return state.children;
}

async function loadChildren() {
  const children = await safeLoadChildren();
  const childSelect = document.getElementById("childSelect");
  const historyChildFilter = document.getElementById("historyChildFilter");

  if (childSelect) childSelect.innerHTML = childOptionMarkup(children);
  if (historyChildFilter) historyChildFilter.innerHTML = childOptionMarkup(children, true);

  renderChildren("homeChildList", children);
  renderChildren("childList", children);
}

async function loadHome() {
  await safeLoadMe();
  await loadChildren();
}

async function loadMypage() {
  await safeLoadMe(true);
  await loadChildren();
}

async function updateChild(childId) {
  const child = state.children.find((item) => item.id === childId);
  if (!child) return;

  const name = prompt("아이 이름", child.name);
  if (name === null) return;
  const birthDate = prompt("아이의 생년월일(YYYY-MM-DD)", child.birthDate);
  if (birthDate === null) return;
  const gender = prompt("성별(male/female)", child.gender || "male");
  if (gender === null) return;

  try {
    await authApi.updateChild(childId, { name, birthDate, gender });
    await loadMypage();
  } catch (error) {
    alert(`아이 정보를 수정하지 못했습니다. ${friendlyApiError(error, "auth")}`);
  }
}

function setShell(pageName) {
  updateRoleUi();
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("is-active"));
  document.getElementById(`${pageName}Page`)?.classList.add("is-active");
  document.getElementById("topbar").classList.toggle("is-hidden", pageName === "login" || pageName === "signup");
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.nav === pageName);
  });
}

async function show(pageName = routeName()) {
  const protectedPages = ["home", "consultation", "result", "hospitals", "history", "mypage", "info", "admin"];
  if (protectedPages.includes(pageName) && !getToken()) {
    pageName = "login";
  }

  setShell(pageName);

  if (pageName === "home") loadHome();
  if (pageName === "consultation") loadChildren();
  if (pageName === "history") loadHistoryPage();
  if (pageName === "mypage") loadMypage();
  if (pageName === "info") loadInfoPage();
  if (pageName === "admin") loadAdminPage();
  if (pageName === "hospitals") loadHospitals();
  if (pageName === "result") {
    showResult(routeQuery().get("id") || state.lastConsultationId);
  }
}

document.getElementById("signupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    assertBirthDate(form, "childBirthDate");
  } catch (error) {
    alert(error.message);
    return;
  }

  try {
    const data = formData(form);
    await authApi.signup(data);
    clearToken();
    form.reset();
    alert("회원가입이 완료되었습니다. 로그인 후 이용해 주세요.");
    navigate("login");
  } catch (error) {
    alert(`회원가입에 실패했습니다. ${friendlyApiError(error, "auth")}`);
  }
});

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = formData(event.currentTarget);
  try {
    const payload = await authApi.login(data);
    const token = payload.token || payload.accessToken;
    if (!token) throw new Error("로그인 응답에 token이 없습니다.");
    setToken(token);
    navigate("home");
  } catch (error) {
    alert(`로그인에 실패했습니다. ${friendlyApiError(error, "auth")}`);
  }
});

document.getElementById("logoutButton").addEventListener("click", () => {
  clearToken();
  navigate("login");
});

document.getElementById("childForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    assertBirthDate(form, "birthDate");
  } catch (error) {
    alert(error.message);
    return;
  }

  try {
    await authApi.createChild(formData(form));
    form.reset();
    await loadMypage();
  } catch (error) {
    alert(`아이 정보를 저장하지 못했습니다. ${friendlyApiError(error, "auth")}`);
  }
});

document.getElementById("questionnaireForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = formData(event.currentTarget);
  try {
    const created = await questionnaireApi.create(payload);
    setLastConsultationId(created.consultationId);
    try {
      await aiApi.analyzeMock(created.consultationId);
    } catch (error) {
      alert(`문진은 저장되었습니다. AI mock 분석은 나중에 다시 실행해 주세요. ${friendlyApiError(error, "ai")}`);
    }
    navigate(`result?id=${created.consultationId}`);
  } catch (error) {
    alert(`문진 저장에 실패했습니다. ${friendlyApiError(error, "questionnaire")}`);
  }
});

async function loadHistoryPage() {
  await loadChildren();
  await loadHistory();
}

async function loadHistory() {
  const childId = document.getElementById("historyChildFilter").value;
  let items = [];
  try {
    items = await questionnaireApi.history(childId);
  } catch (error) {
    renderNotice("historyList", "진료 내역을 불러올 수 없습니다", friendlyApiError(error, "questionnaire"));
    return;
  }

  if (!items.length) {
    renderNotice("historyList", "진료 내역이 없습니다", "아이 증상을 입력하면 이곳에서 날짜별 문진 기록을 확인할 수 있습니다.");
    return;
  }

  document.getElementById("historyList").innerHTML = items
    .map(
      (item) => `
        <article class="history-item">
          <div>
            <small>${escapeHtml(formatDateTime(item.createdAt))}</small>
            <strong>${escapeHtml(item.title || "문진 기록")}</strong>
            <p class="subtle">${escapeHtml(item.symptomSummary || "")}</p>
          </div>
          <div>
            <span class="risk-badge ${escapeHtml(String(item.riskLevel || "UNKNOWN").toLowerCase())}">위험도: ${escapeHtml(
              item.riskLevel || "UNKNOWN",
            )}</span>
            <button class="ghost-button" data-result-id="${escapeHtml(item.consultationId)}" type="button">상세보기</button>
          </div>
        </article>
      `,
    )
    .join("");

  document.querySelectorAll("[data-result-id]").forEach((button) => {
    button.addEventListener("click", () => {
      setLastConsultationId(button.dataset.resultId);
      navigate(`result?id=${button.dataset.resultId}`);
    });
  });
}

document.getElementById("loadHistoryButton").addEventListener("click", loadHistory);

async function showResult(id) {
  if (!id) {
    document.getElementById("resultCard").innerHTML = `
      <div class="result-body">
        <h2>선택된 문진이 없습니다</h2>
        <p class="subtle">문진을 작성하거나 진료 내역에서 결과를 선택해 주세요.</p>
        <a class="primary-link" href="#/consultation">문진 입력으로 이동</a>
      </div>
    `;
    return;
  }

  let result = null;
  try {
    result = await questionnaireApi.result(id);
  } catch (error) {
    document.getElementById("resultCard").innerHTML = `
      <div class="result-body">
        <h2>결과를 불러올 수 없습니다</h2>
        <p class="subtle">${escapeHtml(friendlyApiError(error, "questionnaire"))}</p>
      </div>
    `;
    return;
  }

  const data = result?.resultJson || {
    summary_title: "AI 분석 결과 생성 대기",
    summary: "문진은 저장되었지만 AI 분석 결과가 아직 생성되지 않았습니다.",
    risk_level: "UNKNOWN",
    department_hint: "확인 필요",
    recommendation: "AI mock 분석을 실행하거나 잠시 뒤 다시 확인해 주세요.",
    disclaimer: "본 결과는 의료진 진단을 대체하지 않는 참고용입니다.",
  };
  const risk = String(data.risk_level || "UNKNOWN").toLowerCase();

  document.getElementById("resultCard").innerHTML = `
    <div class="result-visual">
      <span class="risk-badge ${escapeHtml(risk)}">${result?.resultJson ? "분석 완료" : "분석 대기"}</span>
    </div>
    <div class="result-body">
      <div class="risk-box">
        <span>위험도 ${escapeHtml(data.risk_level || "UNKNOWN")}</span>
        <span>${data.risk_level === "LOW" ? "관찰 가능" : "주의 깊게 살펴봐 주세요"}</span>
      </div>
      <section>
        <h2>${escapeHtml(data.summary_title || "AI 문진 요약")}</h2>
        <p class="subtle">${escapeHtml(data.summary || "")}</p>
      </section>
      <section>
        <h2>추천 진료과</h2>
        <p>${escapeHtml(data.department_hint || "소아청소년과")}</p>
      </section>
      <section>
        <h2>권장 사항</h2>
        <p class="subtle">${escapeHtml(data.recommendation || "")}</p>
        <p class="disclaimer">본 결과는 의료진 진단을 대체하지 않는 참고용입니다.</p>
      </section>
      <div class="inline-actions">
        ${
          result?.resultJson
            ? ""
            : `<button class="ghost-button" data-run-mock-result="${escapeHtml(id)}" type="button">AI mock 분석 실행</button>`
        }
        <button class="primary-button" data-pdf-key="${escapeHtml(result?.pdfS3Key || "")}" type="button">${
          result?.pdfS3Key ? "PDF 다운로드" : "PDF 준비 중"
        }</button>
      </div>
    </div>
  `;

  document.querySelector("[data-run-mock-result]")?.addEventListener("click", async (event) => {
    try {
      await aiApi.analyzeMock(event.currentTarget.dataset.runMockResult);
      await showResult(id);
    } catch (error) {
      alert(`AI mock 분석을 실행하지 못했습니다. ${friendlyApiError(error, "ai")}`);
    }
  });

  document.querySelector("[data-pdf-key]")?.addEventListener("click", (event) => {
    const pdfKey = event.currentTarget.dataset.pdfKey;
    if (!pdfKey) return;
    alert(`PDF 파일 경로: ${pdfKey}`);
  });
}

document.getElementById("hospitalForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadHospitals(formData(event.currentTarget));
});

async function loadHospitals(form = { department: "소아청소년과", region: "서울 강남구" }) {
  let hospitals = [];
  try {
    hospitals = await hospitalApi.recommend(form);
  } catch (error) {
    renderNotice("hospitalList", "병원 추천을 불러올 수 없습니다", friendlyApiError(error, "hospital"));
    return;
  }

  if (!hospitals.length) {
    renderNotice("hospitalList", "추천 병원이 없습니다", "추천 진료과와 지역을 바꿔 다시 검색해 주세요.");
    return;
  }

  document.getElementById("hospitalList").innerHTML = hospitals
    .map(
      (hospital) => `
        <article class="hospital-card">
          <span class="badge-soft">${escapeHtml(hospital.distance || "거리 확인 필요")}</span>
          <strong>${escapeHtml(hospital.name)}</strong>
          <small>${escapeHtml(hospital.address || "")}</small>
          <small>${escapeHtml(hospital.openingHours || "운영시간 확인 필요")}</small>
          <span class="risk-badge ${hospital.isOpen ? "low" : "medium"}">${hospital.isOpen ? "진료 중" : "확인 필요"}</span>
        </article>
      `,
    )
    .join("");
}

async function loadInfoPage() {
  await safeLoadMe();
  renderAgeFilter();
  await loadInfo(state.infoAgeFilter);
}

function renderAgeFilter() {
  const target = document.getElementById("infoAgeFilters");
  if (!target) return;
  target.innerHTML = AGE_FILTERS.map(
    (filter) => `
      <button
        class="age-chip ${filter.value === state.infoAgeFilter ? "is-active" : ""}"
        type="button"
        data-age-filter="${escapeHtml(filter.value)}"
      >
        ${escapeHtml(filter.label)}
      </button>
    `,
  ).join("");

  document.querySelectorAll("[data-age-filter]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.infoAgeFilter = button.dataset.ageFilter || "전체";
      document.getElementById("infoDetail").innerHTML = "";
      renderAgeFilter();
      await loadInfo(state.infoAgeFilter);
    });
  });
}

async function loadInfo(targetAgeMonths = "전체") {
  const normalizedTargetAgeMonths = normalizeAgeValue(targetAgeMonths);
  let remotePosts = [];
  let posts = [];
  let fallbackMessage = "";
  try {
    remotePosts = (await boardApi.posts({ targetAgeMonths: normalizedTargetAgeMonths })).map(normalizeInfoPost);
  } catch (error) {
    fallbackMessage = `서비스 연결이 원활하지 않아 로컬 샘플 콘텐츠를 보여줍니다. ${friendlyApiError(error, "board")}`;
  }

  const samplePosts = samplePostsForAge(normalizedTargetAgeMonths).map(normalizeInfoPost);
  posts = mergeInfoPosts(remotePosts, samplePosts);

  if (!remotePosts.length && !fallbackMessage && samplePosts.length) {
    fallbackMessage = "등록된 콘텐츠가 없어 로컬 샘플 콘텐츠를 보여줍니다.";
  }

  if (!posts.length) {
    renderNotice("infoList", "등록된 정보가 없습니다", "관리자 콘텐츠가 등록되면 월령별로 표시됩니다.");
    return;
  }

  const fallback = document.getElementById("infoFallbackNotice");
  if (fallback && fallbackMessage) {
    fallback.textContent = fallbackMessage;
    fallback.hidden = false;
  } else if (fallback) {
    fallback.hidden = true;
  }

  state.infoPosts = posts;
  document.getElementById("infoList").innerHTML = INFO_CATEGORIES.map((category) => {
    const categoryPosts = posts.filter((post) => post.category === category);
    if (!categoryPosts.length) return "";
    return `
      <section class="info-category-section">
        <h2><span>${escapeHtml(category)}</span></h2>
        <div class="guide-card-grid">
          ${categoryPosts
            .map((post) => {
              const preview = String(post.content || "").slice(0, 126);
              return `
                <article class="guide-card" data-info-card="${escapeHtml(post.id)}" tabindex="0">
                  <div class="guide-badges">
                    <span class="age-badge">${escapeHtml(ageLabel(post.targetAgeMonths))}</span>
                    <span class="category-badge">${escapeHtml(post.category)}</span>
                  </div>
                  <strong>${escapeHtml(post.title)}</strong>
                  <p>${escapeHtml(preview)}${String(post.content || "").length > 126 ? "..." : ""}</p>
                  <footer>
                    <span>${escapeHtml(formatDate(post.createdAt))}</span>
                    <span>조회 ${escapeHtml(post.viewCount || 0)}</span>
                  </footer>
                  <button class="text-arrow" data-info-id="${escapeHtml(post.id)}" type="button">자세히 보기</button>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }).join("");

  bindInfoButtons(posts);
}

function bindInfoButtons() {
  document.querySelectorAll("[data-info-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      loadInfoDetail(button.dataset.infoId);
    });
  });
  document.querySelectorAll("[data-info-card]").forEach((card) => {
    card.addEventListener("click", () => loadInfoDetail(card.dataset.infoCard));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        loadInfoDetail(card.dataset.infoCard);
      }
    });
  });
}

async function loadInfoDetail(id) {
  const sample = state.infoPosts.find((post) => post.id === id && String(post.id).startsWith("sample-"));
  try {
    const post = sample || normalizeInfoPost(await boardApi.post(id));
    document.getElementById("infoDetail").innerHTML = `
      <div class="guide-badges">
        <span class="age-badge">${escapeHtml(ageLabel(post.targetAgeMonths))}</span>
        <span class="category-badge">${escapeHtml(post.category)}</span>
      </div>
      <strong>${escapeHtml(post.title)}</strong>
      <p>${escapeHtml(post.content)}</p>
      <small>${escapeHtml(post.admin?.nickname || "관리자")} · ${escapeHtml(formatDate(post.createdAt))} · 조회 ${escapeHtml(post.viewCount || 0)}</small>
      <div class="info-disclaimer">
        이 정보는 일반적인 건강 정보 제공 목적이며, 아이의 상태에 따라 다를 수 있습니다. 정확한 접종 일정과 진료 판단은 의료진 또는 보건소에 확인하세요.
      </div>
    `;
  } catch (error) {
    renderNotice("infoDetail", "상세 정보를 불러올 수 없습니다", friendlyApiError(error, "board"));
  }
}

async function loadAdminPage() {
  const user = await safeLoadMe();
  const gate = document.getElementById("adminGate");
  const workspace = document.getElementById("adminWorkspace");
  if (!user) {
    workspace.hidden = true;
    gate.innerHTML = `
      <article class="info-card admin-denied">
        <strong>로그인이 필요합니다</strong>
        <p class="subtle">관리자 페이지는 로그인 후 이용할 수 있습니다.</p>
        <a class="primary-link" href="#/login">로그인으로 이동</a>
      </article>
    `;
    return;
  }

  if (!isAdmin()) {
    workspace.hidden = true;
    gate.innerHTML = `
      <article class="info-card admin-denied">
        <strong>관리자 권한이 필요합니다</strong>
        <p class="subtle">현재 계정은 정보공유 글을 관리할 수 없습니다.</p>
        <a class="primary-link" href="#/home">홈으로 이동</a>
      </article>
    `;
    return;
  }

  gate.innerHTML = "";
  workspace.hidden = false;
  await loadAdminPosts();
}

function resetAdminPostForm() {
  const form = document.getElementById("adminPostForm");
  form.reset();
  form.elements.postId.value = "";
  document.getElementById("adminPostSubmitButton").textContent = "글 등록";
  document.getElementById("adminPostStatus").textContent = "";
}

async function loadAdminPosts() {
  let posts = [];
  try {
    posts = (await boardApi.posts()).map(normalizeInfoPost);
  } catch (error) {
    renderNotice("adminPostList", "정보공유 글을 불러올 수 없습니다", friendlyApiError(error, "board"));
    return;
  }

  state.adminPosts = posts;
  if (!posts.length) {
    renderNotice("adminPostList", "등록된 정보공유 글이 없습니다", "왼쪽 폼에서 첫 정보를 등록해 주세요.");
    return;
  }

  document.getElementById("adminPostList").innerHTML = posts
    .map(
      (post) => `
        <article class="admin-post-item">
          <div>
            <div class="guide-badges">
              <span class="age-badge">${escapeHtml(ageLabel(post.targetAgeMonths))}</span>
              <span class="category-badge">${escapeHtml(post.category)}</span>
            </div>
            <strong>${escapeHtml(post.title)}</strong>
            <small>${escapeHtml(formatDateTime(post.createdAt))} · 조회수 ${escapeHtml(post.viewCount || 0)}</small>
            <p class="subtle">${escapeHtml(String(post.content || "").slice(0, 110))}${String(post.content || "").length > 110 ? "..." : ""}</p>
          </div>
          <div class="inline-actions">
            <button class="ghost-button slim" data-admin-edit="${escapeHtml(post.id)}" type="button">수정</button>
            <button class="ghost-button slim danger" data-admin-delete="${escapeHtml(post.id)}" type="button">삭제</button>
          </div>
        </article>
      `,
    )
    .join("");

  document.querySelectorAll("[data-admin-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const post = state.adminPosts.find((item) => item.id === button.dataset.adminEdit);
      if (!post) return;
      const form = document.getElementById("adminPostForm");
      form.elements.postId.value = post.id;
      form.elements.category.value = post.category || "예방접종";
      form.elements.targetAgeMonths.value = post.targetAgeMonths || "전체";
      form.elements.title.value = post.title || "";
      form.elements.content.value = post.content || "";
      document.getElementById("adminPostSubmitButton").textContent = "수정 저장";
      document.getElementById("adminPostStatus").textContent = "수정할 내용을 확인한 뒤 저장해 주세요.";
      form.elements.title.focus();
    });
  });

  document.querySelectorAll("[data-admin-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("이 정보공유 글을 삭제할까요?")) return;
      try {
        await boardApi.deletePost(button.dataset.adminDelete);
        resetAdminPostForm();
        await loadAdminPosts();
      } catch (error) {
        alert(`삭제하지 못했습니다. ${friendlyApiError(error, "board")}`);
      }
    });
  });
}

document.getElementById("adminPostForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isAdmin()) {
    alert("관리자 권한이 필요합니다.");
    return;
  }

  const data = formData(event.currentTarget);
  const payload = {
    category: data.category,
    targetAgeMonths: data.targetAgeMonths,
    title: data.title,
    content: data.content,
  };
  try {
    const statusMessage = data.postId ? "정보공유 글이 수정되었습니다." : "정보공유 글이 등록되었습니다.";
    if (data.postId) {
      await boardApi.updatePost(data.postId, payload);
    } else {
      await boardApi.createPost(payload);
    }
    resetAdminPostForm();
    document.getElementById("adminPostStatus").textContent = statusMessage;
    await loadAdminPosts();
  } catch (error) {
    alert(`저장하지 못했습니다. ${friendlyApiError(error, "board")}`);
  }
});

document.getElementById("adminPostResetButton").addEventListener("click", resetAdminPostForm);
document.getElementById("adminPostReloadButton").addEventListener("click", loadAdminPosts);

window.addEventListener("hashchange", () => show(routeName()));

populateBirthdatePickers();

if (!location.hash) {
  navigate("login");
} else {
  show(routeName());
}
