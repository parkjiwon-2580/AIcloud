import { aiApi } from "./api/ai.api.js";
import { authApi } from "./api/auth.api.js";
import { boardApi } from "./api/board.api.js";
import { clearToken, friendlyApiError, getToken, setToken } from "./api/client.js";
import { hospitalApi } from "./api/hospital.api.js";
import { questionnaireApi } from "./api/questionnaire.api.js";

const LAST_CONSULTATION_KEY = "aicloud.lastConsultationId";
const KAKAO_JS_KEY = "7ed4eb0a52edd0459d28de6073874a34";
const HOSPITAL_SEARCH_FALLBACK_REGION = "서울 강남구";
const KAKAO_SEARCH_TIMEOUT_MS = 3500;

const AGE_FILTERS = [
  { label: "전체", value: "전체" },
  { label: "0~6개월", value: "0-6" },
  { label: "7~12개월", value: "7-12" },
  { label: "13~24개월", value: "13-24" },
  { label: "25~36개월", value: "25-36" },
  { label: "37~60개월", value: "37-60" },
];

const INFO_CATEGORIES = ["예방접종", "주의사항", "발달", "영양", "질환정보", "응급징후", "공지"];

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
  if (!payload.childId) {
    alert("아이를 먼저 선택해 주세요. 아이가 없으면 마이페이지에서 아이 정보를 등록한 뒤 다시 시도해 주세요.");
    return;
  }
  if (!payload.symptomText?.trim()) {
    alert("증상을 입력해 주세요.");
    return;
  }

  try {
    const created = await questionnaireApi.create(payload);
    setLastConsultationId(created.consultationId);
    try {
      await aiApi.analyze(created.consultationId);
    } catch (error) {
      alert(`문진은 저장되었습니다. AI 분석은 나중에 다시 실행해 주세요. ${friendlyApiError(error, "ai")}`);
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
    recommendation: "AI 분석을 실행하거나 잠시 뒤 다시 확인해 주세요.",
    disclaimer: "본 결과는 의료진 진단을 대체하지 않는 참고용입니다.",
  };
  const riskLevel = data.risk_level || data.riskLevel || "UNKNOWN";
  const departmentHint = data.department_hint || data.departmentHint || "소아청소년과";
  const risk = String(riskLevel).toLowerCase();

  document.getElementById("resultCard").innerHTML = `
    <div class="result-visual">
      <span class="risk-badge ${escapeHtml(risk)}">${result?.resultJson ? "분석 완료" : "분석 대기"}</span>
    </div>
    <div class="result-body">
      <div class="risk-box">
        <span>위험도 ${escapeHtml(riskLevel)}</span>
        <span>${riskLevel === "LOW" ? "관찰 가능" : "주의 깊게 살펴봐 주세요"}</span>
      </div>
      <section>
        <h2>${escapeHtml(data.summary_title || "AI 문진 요약")}</h2>
        <p class="subtle">${escapeHtml(data.summary || "")}</p>
      </section>
      <section>
        <h2>추천 진료과</h2>
        <p>${escapeHtml(departmentHint)}</p>
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
            : `<button class="ghost-button" data-run-ai-analysis="${escapeHtml(id)}" type="button">AI 분석 실행</button>`
        }
        <button class="primary-button" data-pdf-key="${escapeHtml(result?.pdfS3Key || "")}" type="button">${
          result?.pdfS3Key ? "PDF 다운로드" : "PDF 준비 중"
        }</button>
      </div>
    </div>
  `;

  document.querySelector("[data-run-ai-analysis]")?.addEventListener("click", async (event) => {
    try {
      await aiApi.analyze(event.currentTarget.dataset.runAiAnalysis);
      await showResult(id);
    } catch (error) {
      alert(`AI 분석을 실행하지 못했습니다. ${friendlyApiError(error, "ai")}`);
    }
  });

  document.querySelector("[data-pdf-key]")?.addEventListener("click", async (event) => {
    const pdfKey = event.currentTarget.dataset.pdfKey;
    if (!pdfKey) return;
    try {
      const payload = await aiApi.reportDownload(id);
      if (payload?.downloadUrl) {
        window.open(payload.downloadUrl, "_blank", "noopener");
        return;
      }
      alert("PDF 다운로드 URL이 아직 준비되지 않았습니다.");
    } catch (error) {
      alert(`PDF 다운로드를 준비하지 못했습니다. ${friendlyApiError(error, "ai")}`);
    }
  });
}

document.getElementById("hospitalForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadHospitals(formData(event.currentTarget));
});

function kiwiTokenizeHospitalQuery(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[{}[\]":,]/g, " ")
    .split(/[\s/|·,]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function normalizeHospitalKeyword(keyword) {
  const tokens = kiwiTokenizeHospitalQuery(keyword);
  const compact = tokens.join("");
  const source = `${tokens.join(" ")} ${compact}`;

  if (/소아|아기|아이|영유아|어린이/.test(source)) return "소아청소년과";
  if (/이비인후|귀|코|목|중이염|비염/.test(source)) return "이비인후과";
  if (/피부|발진|두드러기|아토피/.test(source)) return "피부과";
  if (/응급|야간|심야/.test(source)) return "응급실";

  return tokens[0] || "소아청소년과";
}

function loadKakaoPlaces() {
  if (window.kakao?.maps?.services?.Places) {
    return Promise.resolve(window.kakao.maps.services);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector("script[data-kakao-sdk]");
    const script = existingScript || document.createElement("script");

    const onReady = () => {
      if (!window.kakao?.maps?.load) {
        reject(new Error("카카오 지도 SDK가 현재 도메인에서 활성화되지 않았습니다."));
        return;
      }
      window.kakao.maps.load(() => {
        if (window.kakao?.maps?.services?.Places) {
          resolve(window.kakao.maps.services);
          return;
        }
        reject(new Error("카카오 장소 검색 라이브러리를 불러오지 못했습니다."));
      });
    };

    if (!existingScript) {
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false`;
      script.async = true;
      script.dataset.kakaoSdk = "true";
    }

    script.addEventListener("load", onReady, { once: true });
    script.addEventListener("error", () => reject(new Error("카카오 지도 SDK를 불러오지 못했습니다.")));

    if (existingScript && script.dataset.loaded === "true") {
      onReady();
      return;
    }

    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
    }, { once: true });

    if (!existingScript) document.head.appendChild(script);
  });
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
}

function searchKakaoHospitals(query) {
  return loadKakaoPlaces().then(
    (services) =>
      new Promise((resolve, reject) => {
        const places = new services.Places();
        places.keywordSearch(query, (data, status) => {
          if (status === services.Status.OK) {
            resolve(data.slice(0, 9).map((item, index) => normalizeKakaoHospital(item, index)));
            return;
          }
          if (status === services.Status.ZERO_RESULT) {
            resolve([]);
            return;
          }
          reject(new Error("카카오 장소 검색에 실패했습니다."));
        });
      }),
  );
}

function normalizeKakaoHospital(item, index) {
  const openingHours = item.opening_hours || item.openingHours || item.business_hours || "영업시간 확인 필요";
  const rawOpen = item.is_open ?? item.isOpen ?? item.open ?? item.business_status;
  const isOpen =
    typeof rawOpen === "boolean"
      ? rawOpen
      : typeof rawOpen === "string"
        ? /영업중|open|operating/i.test(rawOpen)
        : null;

  return {
    name: item.place_name,
    distance: item.distance ? `${(Number(item.distance) / 1000).toFixed(1)}km` : `${index + 1}번째 결과`,
    openingHours,
    isOpen,
    address: item.road_address_name || item.address_name || "",
    department: item.category_name || "병원",
    phone: item.phone || "",
    url: item.place_url || "",
  };
}

function renderOpenBadge(isOpen) {
  if (isOpen === true) return '<span class="open-badge is-open">영업중</span>';
  if (isOpen === false) return '<span class="open-badge is-closed">영업 종료</span>';
  return '<span class="open-badge is-unknown">확인 필요</span>';
}

async function loadHospitals(form = { department: "소아청소년과", keyword: "", region: HOSPITAL_SEARCH_FALLBACK_REGION }) {
  const keyword = String(form.keyword || "").trim();
  const department = normalizeHospitalKeyword(form.department || keyword || "소아청소년과");
  const region = String(form.region || HOSPITAL_SEARCH_FALLBACK_REGION).trim();
  const query = `${region} ${keyword || department} 병원`;
  let hospitals = [];
  renderNotice("hospitalList", "병원을 검색하고 있습니다", `${query} 기준으로 조회 중입니다.`);
  try {
    hospitals = await hospitalApi.recommend({ department, keyword, region });
  } catch (apiError) {
    try {
      hospitals = await withTimeout(
        searchKakaoHospitals(query),
        KAKAO_SEARCH_TIMEOUT_MS,
        "카카오 장소 검색 응답이 지연되고 있습니다.",
      );
    } catch (error) {
      renderNotice("hospitalList", "병원 추천을 불러올 수 없습니다", `${friendlyApiError(apiError, "hospital")} ${error.message}`);
      return;
    }
  }

  if (!hospitals.length) {
    try {
      hospitals = await withTimeout(
        searchKakaoHospitals(query),
        KAKAO_SEARCH_TIMEOUT_MS,
        "카카오 장소 검색 응답이 지연되고 있습니다.",
      );
    } catch {
      hospitals = [];
    }
  }

  if (!hospitals.length) {
    renderNotice("hospitalList", "추천 병원이 없습니다", "추천 진료과와 지역을 바꿔 다시 검색해 주세요.");
    return;
  }

  document.getElementById("hospitalList").innerHTML = hospitals
    .map(
      (hospital) => `
        <article class="hospital-card">
          <div class="hospital-card-head">
            <span class="badge-soft">${escapeHtml(hospital.distance || "거리 확인 필요")}</span>
            ${renderOpenBadge(hospital.isOpen)}
          </div>
          <strong>${escapeHtml(hospital.name)}</strong>
          <small>${escapeHtml(hospital.address || "")}</small>
          <small>${escapeHtml(hospital.openingHours || "영업시간 확인 필요")}</small>
          ${hospital.phone ? `<small>${escapeHtml(hospital.phone)}</small>` : ""}
          ${hospital.url ? `<a class="hospital-link" href="${escapeHtml(hospital.url)}" target="_blank" rel="noopener">카카오맵에서 상세보기</a>` : ""}
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
  let posts = [];
  try {
    posts = (await boardApi.posts({ targetAgeMonths: normalizedTargetAgeMonths })).map(normalizeInfoPost);
  } catch (error) {
    const fallback = document.getElementById("infoFallbackNotice");
    if (fallback) fallback.hidden = true;
    renderNotice("infoList", "정보공유 글을 불러올 수 없습니다", friendlyApiError(error, "board"));
    return;
  }

  if (!posts.length) {
    const fallback = document.getElementById("infoFallbackNotice");
    if (fallback) fallback.hidden = true;
    renderNotice("infoList", "등록된 정보가 없습니다", "관리자 콘텐츠가 등록되면 월령별로 표시됩니다.");
    return;
  }

  const fallback = document.getElementById("infoFallbackNotice");
  if (fallback) fallback.hidden = true;

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
  try {
    const post = normalizeInfoPost(await boardApi.post(id));
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
