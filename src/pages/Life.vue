<script setup>
import { computed, ref, watch } from "vue";
import { calculateZiWeiChart } from "../lib/ziwei.js";

const commonTimeZones = [
  "UTC",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Taipei",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "Pacific/Auckland"
];
const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
const timeZoneOptions = commonTimeZones.includes(browserTimeZone)
  ? commonTimeZones
  : [browserTimeZone, ...commonTimeZones.slice(0, 11)];
const language = ref("zh-CN");
const translations = {
  "zh-CN": {
    language: "语言",
    timeZone: "时区",
    gender: "性别",
    male: "男",
    female: "女",
    chartGender: "阴阳男女",
    birthDateTime: "公历出生时间",
    birthDate: "出生日期",
    birthTime: "出生时刻",
    birthDatePlaceholder: "YYYYMMDD",
    birthTimePlaceholder: "HHMM",
    bazi: "生辰八字",
    baziPlaceholder: "选择出生时间后自动生成",
    invalidDateTime: "请输入有效的出生日期和时间。",
    nonexistentTime: "该时区不存在这个本地时间，请调整时间。",
    generate: "生成排盘",
    clear: "清空",
    form: "出生信息",
    chart: "十二宫格",
    notEntered: "待输入",
    notGenerated: "待生成",
    notCalculated: "待排盘",
    lunar: "农历",
    mingShen: "命身宫",
    mingMaster: "命主",
    shenMaster: "身主",
    bureau: "五行局",
    majorPeriod: "大限",
    notes: "NOTES ON BEING HERE",
    tagline: "NOTICE THE EVERYDAY",
    keep: "KEEP WHAT MATTERS"
  },
  "zh-TW": {
    language: "語言",
    timeZone: "時區",
    gender: "性別",
    male: "男",
    female: "女",
    chartGender: "陰陽男女",
    birthDateTime: "公曆出生時間",
    birthDate: "出生日期",
    birthTime: "出生時刻",
    birthDatePlaceholder: "YYYYMMDD",
    birthTimePlaceholder: "HHMM",
    bazi: "生辰八字",
    baziPlaceholder: "選擇出生時間後自動生成",
    invalidDateTime: "請輸入有效的出生日期和時間。",
    nonexistentTime: "所選時區不存在這個本地時間，請調整時間。",
    generate: "生成排盤",
    clear: "清空",
    form: "出生資訊",
    chart: "十二宮格",
    notEntered: "待輸入",
    notGenerated: "待生成",
    notCalculated: "待排盤",
    lunar: "農曆",
    mingShen: "命身宮",
    mingMaster: "命主",
    shenMaster: "身主",
    bureau: "五行局",
    majorPeriod: "大限",
    notes: "此刻札記",
    tagline: "留意日常",
    keep: "珍惜重要之物"
  },
  en: {
    language: "Language",
    timeZone: "Time zone",
    gender: "Gender",
    male: "Male",
    female: "Female",
    chartGender: "Yin/Yang gender",
    birthDateTime: "Birth date and time (Gregorian)",
    birthDate: "Birth date",
    birthTime: "Birth time",
    birthDatePlaceholder: "YYYYMMDD",
    birthTimePlaceholder: "HHMM",
    bazi: "Four Pillars (BaZi)",
    baziPlaceholder: "Select a birth date and time to calculate",
    invalidDateTime: "Enter a valid birth date and time.",
    nonexistentTime: "This local time does not exist in the selected time zone. Adjust the time.",
    generate: "Generate chart",
    clear: "Clear",
    form: "Birth information",
    chart: "Zi Wei chart",
    notEntered: "Not entered",
    notGenerated: "Not generated",
    notCalculated: "Not calculated",
    lunar: "Lunar date",
    mingShen: "Ming / Shen palaces",
    mingMaster: "Ming master",
    shenMaster: "Shen master",
    bureau: "Five Elements Bureau",
    majorPeriod: "Major period",
    notes: "NOTES ON BEING HERE",
    tagline: "NOTICE THE EVERYDAY",
    keep: "KEEP WHAT MATTERS"
  }
};
const copy = computed(() => translations[language.value]);
const birthTimeZone = ref("Asia/Shanghai");
const gender = ref("");
const birthDate = ref("");
const birthTime = ref("");
const birthDateTime = computed(() =>
  birthDate.value && birthTime.value ? `${birthDate.value}T${birthTime.value}` : ""
);
const generatedChart = ref(null);

watch([birthTimeZone, gender, birthDateTime], () => {
  generatedChart.value = null;
});

function utcTimestamp({ year, month, day, hour, minute, second = 0 }) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  return date.getTime();
}

function parseBirthDate(value) {
  const date = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(value.trim())
    ?? /^(\d{4})(\d{2})(\d{2})$/.exec(value.trim());
  if (!date) return null;

  const [, year, month, day] = date.map(Number);
  return { year, month, day };
}

function parseBirthTime(value) {
  const time = /^(\d{1,2}):(\d{1,2})$/.exec(value.trim())
    ?? /^(\d{2})(\d{2})$/.exec(value.trim());
  if (!time) return null;

  const [, hour, minute] = time.map(Number);
  return { hour, minute };
}

function normalizeBirthDate() {
  const parts = parseBirthDate(birthDate.value);
  if (parts) {
    birthDate.value = `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  }
}

function normalizeBirthTime() {
  const parts = parseBirthTime(birthTime.value);
  if (parts) {
    birthTime.value = `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
  }
}

function parseDateTime(value) {
  const [dateValue, timeValue] = value.split("T");
  if (!dateValue || !timeValue) return null;

  const dateParts = parseBirthDate(dateValue);
  const timeParts = parseBirthTime(timeValue);
  if (!dateParts || !timeParts) return null;

  const { year, month, day } = dateParts;
  const { hour, minute } = timeParts;
  if (year < 1 || year > 9999 || month < 1 || month > 12 || hour > 23 || minute > 59) {
    return null;
  }

  const parts = { year, month, day, hour, minute };
  const date = new Date(utcTimestamp(parts));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() + 1 === month
    && date.getUTCDate() === day
    && date.getUTCHours() === hour
    && date.getUTCMinutes() === minute
    ? parts
    : null;
}

function getTimeZoneParts(date, timeZone) {
  const formattedParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  return Object.fromEntries(
    formattedParts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)])
  );
}

function getInstantForTimeZone(parts, timeZone) {
  const requestedTimestamp = utcTimestamp(parts);
  let timestamp = requestedTimestamp;

  // Resolve local wall time to an instant and reject times skipped by daylight saving.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const formattedParts = getTimeZoneParts(new Date(timestamp), timeZone);
    const difference = requestedTimestamp - utcTimestamp(formattedParts);
    if (difference === 0) return new Date(timestamp);
    timestamp += difference;
  }

  return null;
}

const birthCalculation = computed(() => {
  if (!birthDateTime.value) return null;

  const localParts = parseDateTime(birthDateTime.value);
  if (!localParts) return { error: copy.value.invalidDateTime };

  const instant = getInstantForTimeZone(localParts, birthTimeZone.value);
  if (!instant) {
    return { error: copy.value.nonexistentTime };
  }

  const chart = calculateZiWeiChart({ ...localParts, gender: gender.value });

  return {
    value: chart.bazi.join(" "),
    instant,
    chart
  };
});

const birthBazi = computed(() => birthCalculation.value?.value ?? "");
function generateChart() {
  const chart = birthCalculation.value?.chart;
  if (!chart || !gender.value) {
    generatedChart.value = null;
    return;
  }

  const yangYear = ["甲", "丙", "戊", "庚", "壬"].includes(chart.yearStem);
  const polarity = yangYear ? "阳" : "阴";
  const genderName = gender.value === "male" ? "男" : "女";
  generatedChart.value = {
    ...chart,
    gender: gender.value,
    genderType: `${polarity}${genderName}`
  };
}

function clearBirthData() {
  gender.value = "";
  birthDate.value = "";
  birthTime.value = "";
  generatedChart.value = null;
}

const formattedBirthDateTime = computed(() => {
  const instant = birthCalculation.value?.instant;
  if (!instant) return birthDateTime.value ? copy.value.notGenerated : copy.value.notEntered;

  const parts = new Intl.DateTimeFormat(language.value, {
    timeZone: birthTimeZone.value,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short"
  }).formatToParts(instant);
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value])
  );

  return `${values.year}/${values.month}/${values.day} ${values.hour}:${values.minute} ${values.timeZoneName} (${birthTimeZone.value})`;
});
const chartCells = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  area: `p${String(index + 1).padStart(2, "0")}`,
  branch: ["巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑", "寅", "卯", "辰"][index]
}));
const palacesByBranch = computed(() => Object.fromEntries(
  (generatedChart.value?.palaces ?? []).map((palace) => [palace.branch, palace])
));
</script>

<template>
  <section class="life-page">
    <div class="life-orbit life-orbit-outer" aria-hidden="true"></div>
    <div class="life-orbit life-orbit-inner" aria-hidden="true"></div>
    <div class="life-form" :aria-label="copy.form">
      <label class="life-field">
        <span>{{ copy.language }}</span>
        <select v-model="language" autocomplete="off">
          <option value="zh-CN">简体中文</option>
          <option value="zh-TW">繁體中文</option>
          <option value="en">English</option>
        </select>
      </label>
      <label class="life-field">
        <span>{{ copy.timeZone }}</span>
        <select v-model="birthTimeZone" autocomplete="off">
          <option v-for="timeZone in timeZoneOptions" :key="timeZone" :value="timeZone">
            {{ timeZone }}
          </option>
        </select>
      </label>
      <label class="life-field">
        <span>{{ copy.birthDateTime }}</span>
        <div class="life-date-time-inputs">
          <input
            v-model="birthDate"
            type="text"
            inputmode="numeric"
            maxlength="10"
            :aria-label="copy.birthDate"
            :placeholder="copy.birthDatePlaceholder"
            autocomplete="off"
            @blur="normalizeBirthDate"
          />
          <input
            v-model="birthTime"
            type="text"
            inputmode="numeric"
            maxlength="5"
            :aria-label="copy.birthTime"
            :placeholder="copy.birthTimePlaceholder"
            autocomplete="off"
            @blur="normalizeBirthTime"
          />
        </div>
      </label>
      <fieldset class="life-field life-gender-field">
        <legend>{{ copy.gender }}</legend>
        <div class="life-gender-options">
          <label class="life-gender-option">
            <input v-model="gender" type="radio" name="birth-gender" value="male" />
            <span>{{ copy.male }}</span>
          </label>
          <label class="life-gender-option">
            <input v-model="gender" type="radio" name="birth-gender" value="female" />
            <span>{{ copy.female }}</span>
          </label>
        </div>
      </fieldset>
      <label class="life-field">
        <span>{{ copy.bazi }}</span>
        <input :value="birthBazi" type="text" :placeholder="copy.baziPlaceholder" readonly />
      </label>
      <p v-if="birthCalculation?.error" class="life-form-error" role="status">
        {{ birthCalculation.error }}
      </p>
      <div class="life-form-actions">
        <button
          class="life-generate-button"
          type="button"
          :disabled="!birthDateTime.trim() || !gender"
          @click="generateChart"
        >
          {{ copy.generate }}
        </button>
        <button
          class="life-clear-button"
          type="button"
          :disabled="!birthDateTime.trim() && !gender && !generatedChart"
          @click="clearBirthData"
        >
          {{ copy.clear }}
        </button>
      </div>
    </div>
    <div class="life-chart" :aria-label="copy.chart">
      <div
        v-for="cell in chartCells"
        :key="cell.id"
        class="life-chart-cell"
        :style="{ gridArea: cell.area }"
        :aria-label="`${cell.branch}宫`"
      >
        <template v-if="generatedChart">
          <h2 class="life-palace-name">
            {{ palacesByBranch[cell.branch].name }}
            <span v-if="palacesByBranch[cell.branch].isMing">命</span>
            <span v-else-if="palacesByBranch[cell.branch].isShen">身</span>
          </h2>
          <p class="life-palace-ganzhi">{{ palacesByBranch[cell.branch].ganzhi }}</p>
          <p v-if="palacesByBranch[cell.branch].majorPeriod" class="life-palace-major-period">
            {{ copy.majorPeriod }}
            {{ palacesByBranch[cell.branch].majorPeriod.startAge }}–{{ palacesByBranch[cell.branch].majorPeriod.endAge }}
          </p>
          <p class="life-palace-stars">
            {{ palacesByBranch[cell.branch].stars.join("、") || "—" }}
          </p>
          <p v-if="palacesByBranch[cell.branch].transformations.length" class="life-palace-transformations">
            {{
              palacesByBranch[cell.branch].transformations
                .map(({ star, name }) => `${star}${name}`)
                .join("、")
            }}
          </p>
          <p v-if="palacesByBranch[cell.branch].auxiliaryStars.length" class="life-palace-auxiliary-stars">
            {{ palacesByBranch[cell.branch].auxiliaryStars.join("、") }}
          </p>
        </template>
        <span v-else>{{ cell.branch }}宫</span>
      </div>
      <section class="life-chart-center" :aria-label="copy.form">
        <p class="life-eyebrow"><span></span> {{ copy.notes }}</p>
        <h1>Life<span>.</span></h1>
        <dl class="life-chart-details">
          <div>
            <dt>{{ copy.timeZone }}</dt>
            <dd>{{ birthTimeZone }}</dd>
          </div>
          <div>
            <dt>{{ copy.birthDateTime }}</dt>
            <dd>{{ formattedBirthDateTime }}</dd>
          </div>
          <div>
            <dt>{{ copy.bazi }}</dt>
            <dd>{{ birthBazi || copy.notGenerated }}</dd>
          </div>
          <div>
            <dt>{{ copy.chartGender }}</dt>
            <dd>{{ generatedChart?.genderType || copy.notCalculated }}</dd>
          </div>
          <div>
            <dt>{{ copy.lunar }}</dt>
            <dd>{{ generatedChart?.lunarDate.text || copy.notCalculated }}</dd>
          </div>
          <div>
            <dt>{{ copy.mingShen }}</dt>
            <dd>
              {{ generatedChart ? `${generatedChart.mingGong} / ${generatedChart.shenGong}` : copy.notCalculated }}
            </dd>
          </div>
          <div>
            <dt>{{ copy.mingMaster }}</dt>
            <dd>{{ generatedChart?.mingMaster || copy.notCalculated }}</dd>
          </div>
          <div>
            <dt>{{ copy.shenMaster }}</dt>
            <dd>{{ generatedChart?.shenMaster || copy.notCalculated }}</dd>
          </div>
          <div>
            <dt>{{ copy.bureau }}</dt>
            <dd>{{ generatedChart?.bureau.name || copy.notCalculated }}</dd>
          </div>
        </dl>
        <p class="life-chart-note">{{ copy.tagline }} <span>✳</span> {{ copy.keep }}</p>
      </section>
    </div>
  </section>
</template>

<style scoped>
.life-page {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: max(460px, min(72vh, 740px));
  overflow: hidden;
  isolation: isolate;
  color: #e6f2ee;
  background:
    radial-gradient(ellipse at 50% 52%, rgba(52, 107, 96, 0.3), transparent 40%),
    radial-gradient(ellipse at 50% 100%, rgba(28, 57, 57, 0.38), transparent 56%),
    #071922;
}

.life-page::before,
.life-page::after {
  position: absolute;
  z-index: -1;
  pointer-events: none;
  content: "";
}

.life-page::before {
  inset: 0;
  opacity: 0.22;
  background-image: radial-gradient(rgba(196, 224, 211, 0.5) 0.7px, transparent 0.7px);
  background-size: 32px 32px;
  mask-image: linear-gradient(transparent, black 24%, black 76%, transparent);
}

.life-page::after {
  width: min(68vw, 660px);
  aspect-ratio: 1;
  border: 1px solid rgba(138, 226, 204, 0.09);
  border-radius: 50%;
  box-shadow:
    0 0 0 50px rgba(138, 226, 204, 0.025),
    0 0 0 100px rgba(138, 226, 204, 0.018);
}

.life-orbit {
  position: absolute;
  z-index: -1;
  left: 50%;
  top: 50%;
  width: min(54vw, 520px);
  aspect-ratio: 1;
  border: 1px solid rgba(138, 226, 204, 0.13);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.life-orbit-outer {
  transform: translate(-50%, -50%) rotate(-24deg) scaleY(0.38);
}

.life-orbit-inner {
  border-color: rgba(232, 183, 120, 0.16);
  transform: translate(-50%, -50%) rotate(54deg) scaleY(0.48);
}

.life-form {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns:
    minmax(0, 0.75fr)
    minmax(0, 0.8fr)
    minmax(0, 1.6fr)
    minmax(112px, 0.55fr)
    minmax(0, 1.1fr)
    auto;
  align-items: end;
  gap: 14px;
  width: min(100% - 40px, 1080px);
  margin: 20px auto 0;
}

.life-field {
  display: grid;
  gap: 7px;
  color: rgba(218, 237, 231, 0.76);
  font-size: 0.78rem;
}

.life-field input,
.life-field select {
  width: 100%;
  min-width: 0;
  height: 40px;
  padding: 0 12px;
  border: 1px solid rgba(191, 223, 214, 0.24);
  border-radius: 5px;
  color: #e6f2ee;
  background: rgba(7, 25, 34, 0.58);
  font: inherit;
  color-scheme: dark;
}

.life-field input::placeholder {
  color: rgba(218, 237, 231, 0.4);
}

.life-field input:focus-visible,
.life-field select:focus-visible {
  border-color: #8ae2cc;
  outline: 2px solid rgba(138, 226, 204, 0.3);
  outline-offset: 2px;
}

.life-field input[readonly] {
  color: #8ae2cc;
}

.life-date-time-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 8px;
}

.life-gender-field {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.life-gender-field legend {
  padding: 0;
}

.life-gender-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.life-gender-option {
  position: relative;
  min-width: 0;
  color: rgba(218, 237, 231, 0.8);
  cursor: pointer;
}

.life-gender-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
}

.life-gender-option span {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  border: 1px solid rgba(191, 223, 214, 0.24);
  border-radius: 5px;
  white-space: nowrap;
}

.life-gender-option input:checked + span {
  border-color: rgba(138, 226, 204, 0.65);
  color: #8ae2cc;
  background: rgba(138, 226, 204, 0.1);
}

.life-gender-option input:focus-visible + span {
  outline: 2px solid rgba(138, 226, 204, 0.4);
  outline-offset: 2px;
}

.life-generate-button {
  height: 40px;
  padding: 0 16px;
  border: 1px solid rgba(138, 226, 204, 0.55);
  border-radius: 5px;
  color: #071922;
  background: #8ae2cc;
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
}

.life-generate-button:disabled {
  border-color: rgba(191, 223, 214, 0.18);
  color: rgba(218, 237, 231, 0.4);
  background: rgba(191, 223, 214, 0.1);
  cursor: not-allowed;
}

.life-generate-button:focus-visible {
  outline: 2px solid rgba(138, 226, 204, 0.6);
  outline-offset: 2px;
}

.life-form-actions {
  display: flex;
  gap: 8px;
}

.life-clear-button {
  height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(191, 223, 214, 0.24);
  border-radius: 5px;
  color: rgba(218, 237, 231, 0.8);
  background: rgba(7, 25, 34, 0.58);
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
}

.life-clear-button:disabled {
  color: rgba(218, 237, 231, 0.36);
  cursor: not-allowed;
}

.life-clear-button:focus-visible {
  border-color: #8ae2cc;
  outline: 2px solid rgba(138, 226, 204, 0.3);
  outline-offset: 2px;
}

.life-form-error {
  grid-column: 1 / -1;
  margin: 0;
  color: #f0ad8e;
  font-size: 0.72rem;
}

.life-chart {
  display: grid;
  grid-template-areas:
    "p01 p02 p03 p04"
    "p12 center center p05"
    "p11 center center p06"
    "p10 p09 p08 p07";
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  gap: 1px;
  width: min(100% - 40px, 900px);
  aspect-ratio: 1.2;
  margin: 34px auto 30px;
  border: 1px solid rgba(138, 226, 204, 0.48);
  background: rgba(138, 226, 204, 0.48);
}

.life-chart-cell,
.life-chart-center {
  min-width: 0;
  min-height: 0;
  background: rgba(7, 25, 34, 0.92);
}

.life-chart-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 12px;
  color: rgba(218, 237, 231, 0.48);
  font-size: 0.68rem;
}

.life-palace-name,
.life-palace-ganzhi,
.life-palace-stars {
  margin: 0;
}

.life-palace-name {
  color: #8ae2cc;
  font-size: 0.76rem;
  font-weight: 600;
}

.life-palace-name span {
  margin-left: 4px;
  color: #e8b778;
  font-size: 0.62rem;
}

.life-palace-ganzhi {
  color: rgba(218, 237, 231, 0.64);
}

.life-palace-stars {
  color: #f1f4ec;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.life-palace-transformations {
  margin: 0;
  color: #e8b778;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.life-palace-major-period {
  margin: 0;
  color: #e8b778;
  line-height: 1.35;
}

.life-palace-auxiliary-stars {
  margin: 0;
  color: rgba(218, 237, 231, 0.72);
  font-size: 0.58rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.life-chart-center {
  grid-area: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(16px, 3vw, 36px);
  text-align: center;
}

.life-eyebrow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0 0 20px;
  color: #8ae2cc;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.16em;
}

.life-eyebrow span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #e8b778;
  box-shadow: 0 0 14px rgba(232, 183, 120, 0.8);
}

.life-chart-center h1 {
  margin: 0;
  color: #f1f4ec;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 400;
  letter-spacing: -0.075em;
  line-height: 0.92;
}

.life-chart-center h1 span {
  color: #e8b778;
}

.life-chart-details {
  display: grid;
  gap: 8px;
  margin: 24px 0 0;
  color: rgba(218, 237, 231, 0.74);
  font-size: 0.76rem;
  text-align: left;
}

.life-chart-details div {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 8px;
}

.life-chart-details dt {
  color: rgba(218, 237, 231, 0.48);
}

.life-chart-details dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.life-chart-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 28px 0 0;
  color: rgba(218, 237, 231, 0.48);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
}

.life-chart-note span {
  color: #8ae2cc;
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .life-form {
    grid-template-columns: 1fr;
    gap: 10px;
    width: min(100% - 28px, 420px);
    margin-top: 16px;
  }

  .life-field input,
  .life-field select {
    padding: 0 9px;
  }

  .life-form-error {
    grid-column: auto;
  }

  .life-generate-button {
    width: 100%;
  }

  .life-form-actions {
    width: 100%;
  }

  .life-form-actions button:first-child {
    flex: 1;
  }

  .life-chart {
    width: min(100% - 28px, 560px);
  }

  .life-chart-cell {
    gap: 3px;
    padding: 6px;
    font-size: 0.58rem;
  }

  .life-palace-name {
    font-size: 0.64rem;
  }

  .life-palace-name span {
    margin-left: 2px;
    font-size: 0.52rem;
  }

  .life-palace-stars {
    line-height: 1.35;
  }

  .life-palace-transformations,
  .life-palace-auxiliary-stars {
    font-size: 0.5rem;
    line-height: 1.2;
  }

  .life-chart-center {
    padding: 12px;
  }

  .life-chart-center h1 {
    font-size: clamp(2rem, 10vw, 3rem);
  }

  .life-chart-details {
    gap: 6px;
    margin-top: 16px;
    font-size: 0.66rem;
  }

  .life-chart-details div {
    grid-template-columns: 58px minmax(0, 1fr);
    gap: 4px;
  }

  .life-chart-note {
    gap: 8px;
    margin-top: 18px;
    font-size: 0.48rem;
  }
}
</style>
