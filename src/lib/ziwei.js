import { Solar } from "lunar-javascript";

const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const PALACE_NAMES = [
  "命宫",
  "兄弟宫",
  "夫妻宫",
  "子女宫",
  "财帛宫",
  "疾厄宫",
  "迁移宫",
  "交友宫",
  "事业宫",
  "田宅宫",
  "福德宫",
  "父母宫"
];
const YIN_STARTING_STEMS = {
  甲: "丙",
  己: "丙",
  乙: "戊",
  庚: "戊",
  丙: "庚",
  辛: "庚",
  丁: "壬",
  壬: "壬",
  戊: "甲",
  癸: "甲"
};
const BUREAU_NUMBERS = {
  金: 4,
  木: 3,
  水: 2,
  土: 5,
  火: 6
};
const BUREAU_NUMERALS = ["", "", "二", "三", "四", "五", "六"];
const BUREAU_ELEMENTS_BY_STEM_ROW = [
  ["水", "火", "木", "土", "金", "火"],
  ["火", "土", "金", "木", "水", "土"],
  ["土", "木", "水", "金", "火", "木"],
  ["木", "金", "火", "水", "土", "金"],
  ["金", "水", "土", "火", "木", "水"]
];
const BUREAU_ROW_BY_YEAR_STEM = {
  甲: 0,
  己: 0,
  乙: 1,
  庚: 1,
  丙: 2,
  辛: 2,
  丁: 3,
  壬: 3,
  戊: 4,
  癸: 4
};
const ZI_WEI_BRANCH_BY_BUREAU = {
  水: "丑寅寅卯卯辰辰巳巳午午未未申申酉酉戌戌亥亥子子丑丑寅寅卯卯辰".match(/./gu),
  木: "辰丑寅巳寅卯午卯辰未辰巳申巳午酉午未戌未申亥申酉子酉戌丑戌亥".match(/./gu),
  金: "亥辰丑寅子巳寅卯丑午卯辰寅未辰巳卯申巳午辰酉午未巳戌未申午亥".match(/./gu),
  土: "午亥辰丑寅未子巳寅卯申丑午卯辰酉寅未辰巳戌卯申巳午亥辰酉午未".match(/./gu),
  火: "酉午亥辰丑寅戌未子巳寅卯亥申丑午卯辰子酉寅未辰巳丑戌卯申巳午".match(/./gu)
};
const MAJOR_STAR_OFFSETS = [
  { name: "紫微", system: "紫微星系", offset: 0 },
  { name: "天机", system: "紫微星系", offset: -1 },
  { name: "太阳", system: "紫微星系", offset: -3 },
  { name: "武曲", system: "紫微星系", offset: -4 },
  { name: "天同", system: "紫微星系", offset: -5 },
  { name: "廉贞", system: "紫微星系", offset: 4 },
  { name: "天府", system: "天府星系", offset: 0 },
  { name: "太阴", system: "天府星系", offset: 1 },
  { name: "贪狼", system: "天府星系", offset: 2 },
  { name: "巨门", system: "天府星系", offset: 3 },
  { name: "天相", system: "天府星系", offset: 4 },
  { name: "天梁", system: "天府星系", offset: 5 },
  { name: "七杀", system: "天府星系", offset: 6 },
  { name: "破军", system: "天府星系", offset: 10 }
];
const TIME_STAR_BRANCHES = {
  文昌: "戌酉申未午巳辰卯寅丑子亥".match(/./gu),
  文曲: "辰巳午未申酉戌亥子丑寅卯".match(/./gu),
  地劫: "亥子丑寅卯辰巳午未申酉戌".match(/./gu),
  地空: "亥戌酉申未午巳辰卯寅丑子".match(/./gu),
  台辅: "午未申酉戌亥子丑寅卯辰巳".match(/./gu),
  封诰: "寅卯辰巳午未申酉戌亥子丑".match(/./gu)
};
const MONTH_STAR_BRANCHES = {
  天刑: "酉戌亥子丑寅卯辰巳午未申".match(/./gu),
  天姚: "丑寅卯辰巳午未申酉戌亥子".match(/./gu),
  天巫: "巳申寅亥".repeat(3).match(/./gu),
  天月: "戌巳辰寅未卯亥未寅午戌寅".match(/./gu),
  阴煞: "寅子戌申午辰寅子戌申午辰".match(/./gu)
};
const YEAR_STEM_STAR_BRANCHES = {
  禄存: "寅卯巳午巳午申酉亥子".match(/./gu),
  擎羊: "卯辰午未午未酉戌子丑".match(/./gu),
  陀罗: "丑寅辰巳辰巳未申戌亥".match(/./gu),
  天魁: "丑子亥亥丑子丑午卯卯".match(/./gu),
  天钺: "未申酉酉未申未寅巳巳".match(/./gu),
  天官: "未辰巳寅卯酉亥酉戌午".match(/./gu),
  天福: "酉申子亥卯寅午巳午巳".match(/./gu),
  天厨: "巳午子巳午申寅午酉亥".match(/./gu)
};
const YEAR_BRANCH_STAR_BRANCHES = {
  天马: "寅亥申巳".repeat(3).match(/./gu),
  天德: "酉戌亥子丑寅卯辰巳午未申".match(/./gu),
  解神: "戌酉申未午巳辰卯寅丑子亥".match(/./gu),
  天哭: "午巳辰卯寅丑子亥戌酉申未".match(/./gu),
  天虚: "午未申酉戌亥子丑寅卯辰巳".match(/./gu),
  龙池: "辰巳午未申酉戌亥子丑寅卯".match(/./gu),
  凤阁: "戌酉申未午巳辰卯寅丑子亥".match(/./gu),
  红鸾: "卯寅丑子亥戌酉申未午巳辰".match(/./gu),
  天喜: "酉申未午巳辰卯寅丑子亥戌".match(/./gu),
  孤辰: "寅寅巳巳巳申申申亥亥亥寅".match(/./gu),
  寡宿: "戌戌丑丑丑辰辰辰未未未戌".match(/./gu),
  蜚廉: "申酉戌巳午未寅卯辰亥子丑".match(/./gu),
  破碎: "巳丑酉".repeat(4).match(/./gu),
  天空: "丑寅卯辰巳午未申酉戌亥子".match(/./gu),
  月德: "子丑寅卯辰巳午未申酉戌亥".match(/./gu)
};
const YEAR_STEM_TRANSFORMATIONS = {
  甲: ["廉贞", "破军", "武曲", "太阳"],
  乙: ["天机", "天梁", "紫微", "太阴"],
  丙: ["天同", "天机", "文昌", "廉贞"],
  丁: ["太阴", "天同", "天机", "巨门"],
  戊: ["贪狼", "太阴", "右弼", "天机"],
  己: ["武曲", "贪狼", "天梁", "文曲"],
  庚: ["太阳", "武曲", "太阴", "天同"],
  辛: ["巨门", "太阳", "文曲", "文昌"],
  壬: ["天梁", "紫微", "左辅", "武曲"],
  癸: ["破军", "巨门", "太阴", "贪狼"]
};
const TRANSFORMATION_NAMES = ["化禄", "化权", "化科", "化忌"];
const DOCTOR_STAR_NAMES = [
  "博士", "力士", "青龙", "小耗", "将军", "奏书",
  "飞廉", "喜神", "病符", "大耗", "伏兵", "官府"
];
const CHANGSHENG_STAR_NAMES = [
  "长生", "沐浴", "冠带", "临官", "帝旺", "衰",
  "病", "死", "墓", "绝", "胎", "养"
];
const CHANGSHENG_START_BRANCH_BY_BUREAU = {
  水: "申",
  木: "亥",
  金: "巳",
  土: "申",
  火: "寅"
};
const MING_MASTER_BY_BRANCH = [
  "贪狼", "巨门", "禄存", "文曲", "廉贞", "武曲",
  "破军", "武曲", "廉贞", "文曲", "禄存", "巨门"
];
const SHEN_MASTER_BY_YEAR_BRANCH = [
  "火星", "天相", "天梁", "天同", "文昌", "天机",
  "火星", "天相", "天梁", "天同", "文昌", "天机"
];
const YEAR_BRANCH_TIANCAI_PALACE_NAMES = [
  "命宫", "父母宫", "福德宫", "田宅宫", "事业宫", "交友宫",
  "迁移宫", "疾厄宫", "财帛宫", "子女宫", "夫妻宫", "兄弟宫"
];
const STEM_GROUP_BY_STEM = {
  甲: 0, 己: 0,
  乙: 1, 庚: 1,
  丙: 2, 辛: 2,
  丁: 3, 壬: 3,
  戊: 4, 癸: 4
};
const CUT_EMPTY_BRANCHES_BY_STEM_GROUP = [
  ["申", "酉"],
  ["午", "未"],
  ["辰", "巳"],
  ["寅", "卯"],
  ["子", "丑"]
];

function validateBirthTime({ year, month, day, hour, minute = 0 }) {
  const values = [year, month, day, hour, minute];
  if (!values.every(Number.isInteger) || year < 1 || year > 9999) {
    throw new RangeError("出生时间必须是有效的年月日时分。");
  }

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, 0, 0);
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
    || date.getUTCHours() !== hour
    || date.getUTCMinutes() !== minute
    || month < 1
    || month > 12
    || hour < 0
    || hour > 23
    || minute < 0
    || minute > 59
  ) {
    throw new RangeError("出生时间必须是有效的年月日时分。");
  }
}

function getBranchIndex(branch) {
  const index = EARTHLY_BRANCHES.indexOf(branch);
  if (index < 0) throw new RangeError(`无效的地支：${branch}`);
  return index;
}

function getBranchAtIndex(index) {
  return EARTHLY_BRANCHES[(index % EARTHLY_BRANCHES.length + EARTHLY_BRANCHES.length) % EARTHLY_BRANCHES.length];
}

function getBureau(yearStem, mingBranchIndex) {
  const row = BUREAU_ELEMENTS_BY_STEM_ROW[BUREAU_ROW_BY_YEAR_STEM[yearStem]];
  const element = row?.[Math.floor(mingBranchIndex / 2)];
  if (!element) throw new Error(`无法确定五行局：年干${yearStem}，命宫地支${EARTHLY_BRANCHES[mingBranchIndex]}`);

  return {
    element,
    number: BUREAU_NUMBERS[element],
    name: `${element}${BUREAU_NUMERALS[BUREAU_NUMBERS[element]]}局`
  };
}

function getPalaceGanzhi(yearStem, branchIndex) {
  const startingStemIndex = HEAVENLY_STEMS.indexOf(YIN_STARTING_STEMS[yearStem]);
  const yinBranchIndex = getBranchIndex("寅");
  const branchOffset = (
    branchIndex - yinBranchIndex + EARTHLY_BRANCHES.length
  ) % EARTHLY_BRANCHES.length;
  const stemIndex = (startingStemIndex + branchOffset) % HEAVENLY_STEMS.length;
  const stem = HEAVENLY_STEMS[stemIndex];
  const branch = EARTHLY_BRANCHES[branchIndex];

  return { stem, branch, ganzhi: `${stem}${branch}` };
}

function getAuxiliaryStars({
  effectiveMonth,
  lunarDay,
  timeBranchIndex,
  yearStem,
  yearBranchIndex,
  bureauElement,
  mingBranchIndex,
  shenBranchIndex,
  gender
}) {
  const stars = [];
  const addAtIndex = (name, index) => {
    stars.push({ name, branch: getBranchAtIndex(index) });
  };
  const addAtBranch = (name, branch) => addAtIndex(name, getBranchIndex(branch));
  const yearStemIndex = HEAVENLY_STEMS.indexOf(yearStem);
  const yearBranch = EARTHLY_BRANCHES[yearBranchIndex];
  const monthIndex = (effectiveMonth - 1) % EARTHLY_BRANCHES.length;

  for (const [name, branches] of Object.entries(TIME_STAR_BRANCHES)) {
    addAtBranch(name, branches[timeBranchIndex]);
  }

  const yearBranchGroup = ["寅午戌", "申子辰", "巳酉丑", "亥卯未"]
    .find((group) => group.includes(yearBranch));
  const fireStarStarts = {
    寅午戌: { 火星: "丑", 铃星: "卯" },
    申子辰: { 火星: "寅", 铃星: "戌" },
    巳酉丑: { 火星: "卯", 铃星: "戌" },
    亥卯未: { 火星: "酉", 铃星: "戌" }
  };
  const fireStarStart = fireStarStarts[yearBranchGroup];
  if (!fireStarStart) throw new RangeError(`无效的年支：${yearBranch}`);
  addAtIndex("火星", getBranchIndex(fireStarStart.火星) + timeBranchIndex);
  addAtIndex("铃星", getBranchIndex(fireStarStart.铃星) + timeBranchIndex);

  const leftFuIndex = getBranchIndex("辰") + monthIndex;
  const rightBiIndex = getBranchIndex("戌") - monthIndex;
  addAtIndex("左辅", leftFuIndex);
  addAtIndex("右弼", rightBiIndex);
  for (const [name, branches] of Object.entries(MONTH_STAR_BRANCHES)) {
    addAtBranch(name, branches[monthIndex]);
  }

  const wenChangIndex = getBranchIndex(TIME_STAR_BRANCHES.文昌[timeBranchIndex]);
  const wenQuIndex = getBranchIndex(TIME_STAR_BRANCHES.文曲[timeBranchIndex]);
  addAtIndex("三台", leftFuIndex + lunarDay - 1);
  addAtIndex("八座", rightBiIndex - lunarDay + 1);
  addAtIndex("恩光", wenChangIndex + lunarDay - 2);
  addAtIndex("天贵", wenQuIndex + lunarDay - 2);

  for (const [name, branches] of Object.entries(YEAR_STEM_STAR_BRANCHES)) {
    addAtBranch(name, branches[yearStemIndex]);
  }
  const [cutRoadBranch, cutEmptyBranch] =
    CUT_EMPTY_BRANCHES_BY_STEM_GROUP[STEM_GROUP_BY_STEM[yearStem]];
  addAtBranch("截路", cutRoadBranch);
  addAtBranch("空亡", cutEmptyBranch);

  const xunStartIndex = getBranchAtIndex(yearBranchIndex - yearStemIndex);
  const xunStartBranchIndex = getBranchIndex(xunStartIndex);
  addAtIndex("旬中", xunStartBranchIndex + 10);
  addAtIndex("空亡", xunStartBranchIndex + 11);
  for (const [name, branches] of Object.entries(YEAR_BRANCH_STAR_BRANCHES)) {
    addAtBranch(name, branches[yearBranchIndex]);
  }

  const tianCaiPalaceIndex = PALACE_NAMES.indexOf(
    YEAR_BRANCH_TIANCAI_PALACE_NAMES[yearBranchIndex]
  );
  addAtIndex("天才", mingBranchIndex - tianCaiPalaceIndex);
  addAtIndex("天寿", shenBranchIndex + yearBranchIndex);
  addAtIndex("天伤", mingBranchIndex - PALACE_NAMES.indexOf("交友宫"));
  addAtIndex("天使", mingBranchIndex - PALACE_NAMES.indexOf("疾厄宫"));

  if (gender === "male" || gender === "female") {
    const yangYear = ["甲", "丙", "戊", "庚", "壬"].includes(yearStem);
    const forward = (yangYear && gender === "male") || (!yangYear && gender === "female");
    const direction = forward ? 1 : -1;
    const luCunIndex = getBranchIndex(YEAR_STEM_STAR_BRANCHES.禄存[yearStemIndex]);
    const changshengIndex = getBranchIndex(CHANGSHENG_START_BRANCH_BY_BUREAU[bureauElement]);

    DOCTOR_STAR_NAMES.forEach((name, offset) => {
      addAtIndex(name, luCunIndex + direction * offset);
    });
    CHANGSHENG_STAR_NAMES.forEach((name, offset) => {
      addAtIndex(name, changshengIndex + direction * offset);
    });
  }

  return stars;
}

function getTransformations(yearStem, majorStars, auxiliaryStars) {
  const branchByStar = new Map(
    [...majorStars, ...auxiliaryStars].map(({ name, branch }) => [name, branch])
  );

  return YEAR_STEM_TRANSFORMATIONS[yearStem].map((star, index) => {
    const branch = branchByStar.get(star);
    if (!branch) throw new Error(`无法确定${star}的落宫，不能安${TRANSFORMATION_NAMES[index]}。`);

    return { star, name: TRANSFORMATION_NAMES[index], branch };
  });
}

function getMajorStars(lunarDay, bureauElement) {
  const ziWeiBranch = ZI_WEI_BRANCH_BY_BUREAU[bureauElement]?.[lunarDay - 1];
  if (!ziWeiBranch) {
    throw new RangeError(`起紫微表不支持农历生日：${lunarDay}`);
  }

  const ziWeiIndex = getBranchIndex(ziWeiBranch);
  const tianFuIndex = (4 - ziWeiIndex + EARTHLY_BRANCHES.length) % EARTHLY_BRANCHES.length;

  return MAJOR_STAR_OFFSETS.map(({ name, system, offset }) => {
    const baseIndex = system === "紫微星系" ? ziWeiIndex : tianFuIndex;
    const branch = EARTHLY_BRANCHES[
      (baseIndex + offset + EARTHLY_BRANCHES.length) % EARTHLY_BRANCHES.length
    ];

    return { name, system, branch };
  });
}

export function calculateZiWeiChart({ year, month, day, hour, minute = 0, gender = "" }) {
  validateBirthTime({ year, month, day, hour, minute });

  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const eightChar = lunar.getEightChar();
  const yearStem = lunar.getYearGan();
  const yearBranch = lunar.getYearZhi();
  const yearBranchIndex = getBranchIndex(yearBranch);
  const lunarMonth = lunar.getMonth();
  const effectiveMonth = Math.abs(lunarMonth) + (lunarMonth < 0 ? 1 : 0);
  const monthBranchIndex = (
    getBranchIndex("寅") + effectiveMonth - 1
  ) % EARTHLY_BRANCHES.length;
  const timeBranchIndex = getBranchIndex(eightChar.getTime().at(-1));
  const mingBranchIndex = (
    monthBranchIndex - timeBranchIndex + EARTHLY_BRANCHES.length
  ) % EARTHLY_BRANCHES.length;
  const shenBranchIndex = (
    monthBranchIndex + timeBranchIndex
  ) % EARTHLY_BRANCHES.length;
  const mingGong = getPalaceGanzhi(yearStem, mingBranchIndex).ganzhi;
  const shenGong = getPalaceGanzhi(yearStem, shenBranchIndex).ganzhi;
  const shenBranch = EARTHLY_BRANCHES[shenBranchIndex];
  const bureau = getBureau(yearStem, mingBranchIndex);
  const majorStars = getMajorStars(lunar.getDay(), bureau.element);
  const auxiliaryStars = getAuxiliaryStars({
    effectiveMonth,
    lunarDay: lunar.getDay(),
    timeBranchIndex,
    yearStem,
    yearBranchIndex,
    bureauElement: bureau.element,
    mingBranchIndex,
    shenBranchIndex,
    gender
  });
  const transformations = getTransformations(yearStem, majorStars, auxiliaryStars);
  const mingMaster = MING_MASTER_BY_BRANCH[mingBranchIndex];
  const shenMaster = SHEN_MASTER_BY_YEAR_BRANCH[yearBranchIndex];
  const yangYear = ["甲", "丙", "戊", "庚", "壬"].includes(yearStem);
  const forwardMajorPeriods =
    (yangYear && gender === "male") || (!yangYear && gender === "female");

  const palaces = PALACE_NAMES.map((name, index) => {
    const branchIndex = (mingBranchIndex - index + EARTHLY_BRANCHES.length) % EARTHLY_BRANCHES.length;
    const { stem, branch, ganzhi } = getPalaceGanzhi(yearStem, branchIndex);
    const distanceFromMing = forwardMajorPeriods
      ? (branchIndex - mingBranchIndex + EARTHLY_BRANCHES.length) % EARTHLY_BRANCHES.length
      : (mingBranchIndex - branchIndex + EARTHLY_BRANCHES.length) % EARTHLY_BRANCHES.length;
    const majorPeriod = gender === "male" || gender === "female"
      ? {
          startAge: bureau.number + distanceFromMing * 10,
          endAge: bureau.number + distanceFromMing * 10 + 9
        }
      : null;

    return {
      name,
      stem,
      branch,
      ganzhi,
      majorPeriod,
      isMing: name === "命宫",
      isShen: branch === shenBranch,
      stars: majorStars
        .filter((star) => star.branch === branch)
        .map(({ name: starName }) => starName),
      auxiliaryStars: auxiliaryStars
        .filter((star) => star.branch === branch)
        .map(({ name: starName }) => starName),
      transformations: transformations
        .filter((transformation) => transformation.branch === branch)
        .map(({ star, name: transformationName }) => ({
          star,
          name: transformationName
        }))
    };
  });

  return {
    solarDate: { year, month, day, hour, minute },
    lunarDate: {
      year: lunar.getYear(),
      month: lunar.getMonth(),
      day: lunar.getDay(),
      isLeapMonth: lunar.getMonth() < 0,
      text: lunar.toString()
    },
    bazi: [
      eightChar.getYear(),
      eightChar.getMonth(),
      eightChar.getDay(),
      eightChar.getTime()
    ],
    yearStem,
    yearBranch,
    mingGong,
    shenGong,
    bureau,
    majorStars,
    auxiliaryStars,
    transformations,
    mingMaster,
    shenMaster,
    palaces
  };
}
