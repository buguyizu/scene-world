import assert from "node:assert/strict";
import test from "node:test";
import { calculateZiWeiChart } from "./ziwei.js";

test("calculates the lunar date, pillars, and palace framework", () => {
  const chart = calculateZiWeiChart({
    year: 2019,
    month: 3,
    day: 7,
    hour: 8,
    minute: 0
  });

  assert.equal(chart.lunarDate.text, "二〇一九年二月初一");
  assert.deepEqual(chart.bazi, ["己亥", "丁卯", "癸卯", "丙辰"]);
  assert.equal(chart.mingGong, "乙亥");
  assert.equal(chart.shenGong, "辛未");
  assert.equal(chart.bureau.name, "火六局");
  assert.deepEqual(
    chart.majorStars.map(({ name, branch }) => [name, branch]),
    [
      ["紫微", "酉"],
      ["天机", "申"],
      ["太阳", "午"],
      ["武曲", "巳"],
      ["天同", "辰"],
      ["廉贞", "丑"],
      ["天府", "未"],
      ["太阴", "申"],
      ["贪狼", "酉"],
      ["巨门", "戌"],
      ["天相", "亥"],
      ["天梁", "子"],
      ["七杀", "丑"],
      ["破军", "巳"]
    ]
  );
  assert.equal(chart.palaces.length, 12);
  assert.equal(new Set(chart.palaces.map(({ branch }) => branch)).size, 12);
  assert.ok(chart.palaces.every(({ majorPeriod }) => majorPeriod === null));
  assert.equal(chart.palaces.find(({ isMing }) => isMing).ganzhi, chart.mingGong);
  assert.equal(
    chart.palaces.find(({ isShen }) => isShen).branch,
    chart.shenGong.at(-1)
  );
  assert.deepEqual(
    Object.fromEntries(
      chart.palaces.flatMap(({ branch, stars }) => stars.map((star) => [star, branch]))
    ),
    Object.fromEntries(chart.majorStars.map(({ name, branch }) => [name, branch]))
  );
});

test("places the Ming and Shen palaces according to the PDF table", () => {
  const chart = calculateZiWeiChart({
    year: 1982,
    month: 10,
    day: 17,
    hour: 16,
    minute: 0,
    gender: "male"
  });

  assert.equal(chart.lunarDate.text, "一九八二年九月初一");
  assert.equal(chart.mingGong, "壬寅");
  assert.equal(chart.shenGong, "丙午");
  assert.equal(chart.bureau.name, "金四局");
  assert.equal(chart.mingMaster, "禄存");
  assert.equal(chart.shenMaster, "文昌");

  const auxiliaryStarBranches = Object.fromEntries(
    chart.auxiliaryStars.map(({ name, branch }) => [name, branch])
  );
  assert.equal(auxiliaryStarBranches.文昌, "寅");
  assert.equal(auxiliaryStarBranches.文曲, "子");
  assert.equal(auxiliaryStarBranches.左辅, "子");
  assert.equal(auxiliaryStarBranches.三台, "子");
  assert.equal(auxiliaryStarBranches.天马, "申");
  assert.equal(auxiliaryStarBranches.博士, "亥");
  assert.equal(auxiliaryStarBranches.长生, "巳");
  assert.equal(auxiliaryStarBranches.旬中, "子");
  assert.deepEqual(
    chart.auxiliaryStars
      .filter(({ name }) => name === "截路" || name === "空亡")
      .map(({ branch }) => branch),
    ["寅", "卯", "丑"]
  );
  assert.deepEqual(
    chart.transformations.map(({ star, name, branch }) => [star, name, branch]),
    [
      ["天梁", "化禄", "戌"],
      ["紫微", "化权", "亥"],
      ["左辅", "化科", "子"],
      ["武曲", "化忌", "未"]
    ]
  );

  const mingPalace = chart.palaces.find(({ isMing }) => isMing);
  assert.ok(mingPalace.auxiliaryStars.includes("文昌"));
});

test("matches the PDF's first example", () => {
  const chart = calculateZiWeiChart({
    year: 1923,
    month: 1,
    day: 15,
    hour: 1,
    minute: 0,
    gender: "male"
  });

  assert.equal(chart.lunarDate.text, "一九二二年冬月廿九");
  assert.deepEqual(chart.bazi, ["壬戌", "癸丑", "戊子", "癸丑"]);
  assert.equal(chart.mingGong, "辛亥");
  assert.equal(chart.shenGong, "癸丑");
  assert.equal(chart.bureau.name, "金四局");
  assert.deepEqual(
    chart.majorStars.map(({ name, branch }) => [name, branch]),
    [
      ["紫微", "午"],
      ["天机", "巳"],
      ["太阳", "卯"],
      ["武曲", "寅"],
      ["天同", "丑"],
      ["廉贞", "戌"],
      ["天府", "戌"],
      ["太阴", "亥"],
      ["贪狼", "子"],
      ["巨门", "丑"],
      ["天相", "寅"],
      ["天梁", "卯"],
      ["七杀", "辰"],
      ["破军", "申"]
    ]
  );
  assert.deepEqual(
    chart.transformations.map(({ star, name, branch }) => [star, name, branch]),
    [
      ["天梁", "化禄", "卯"],
      ["紫微", "化权", "午"],
      ["左辅", "化科", "寅"],
      ["武曲", "化忌", "寅"]
    ]
  );
  assert.equal(
    chart.auxiliaryStars.find(({ name }) => name === "旬中").branch,
    "子"
  );
  assert.equal(
    chart.auxiliaryStars.find(({ name }) => name === "截路").branch,
    "寅"
  );
  const yearStars = Object.fromEntries(
    chart.auxiliaryStars
      .filter(({ name }) => ["天德", "月德", "解神"].includes(name))
      .map(({ name, branch }) => [name, branch])
  );
  assert.deepEqual(yearStars, { 天德: "未", 月德: "戌", 解神: "子" });
  const majorPeriods = Object.fromEntries(
    chart.palaces.map(({ name, majorPeriod }) => [
      name,
      [majorPeriod.startAge, majorPeriod.endAge]
    ])
  );
  assert.deepEqual(majorPeriods, {
    命宫: [4, 13],
    兄弟宫: [114, 123],
    夫妻宫: [104, 113],
    子女宫: [94, 103],
    财帛宫: [84, 93],
    疾厄宫: [74, 83],
    迁移宫: [64, 73],
    交友宫: [54, 63],
    事业宫: [44, 53],
    田宅宫: [34, 43],
    福德宫: [24, 33],
    父母宫: [14, 23]
  });
  assert.deepEqual(
    chart.auxiliaryStars
      .filter(({ name }) => name === "空亡")
      .map(({ branch }) => branch),
    ["卯", "丑"]
  );
});

test("matches the PDF's second example", () => {
  const chart = calculateZiWeiChart({
    year: 1919,
    month: 8,
    day: 8,
    hour: 0,
    minute: 0,
    gender: "male"
  });

  assert.equal(chart.lunarDate.text, "一九一九年七月十三");
  assert.deepEqual(chart.bazi, ["己未", "辛未", "壬辰", "庚子"]);
  assert.equal(chart.mingGong, "壬申");
  assert.equal(chart.shenGong, "壬申");
  assert.equal(chart.bureau.name, "金四局");
  assert.deepEqual(
    chart.majorStars.map(({ name, branch }) => [name, branch]),
    [
      ["紫微", "寅"],
      ["天机", "丑"],
      ["太阳", "亥"],
      ["武曲", "戌"],
      ["天同", "酉"],
      ["廉贞", "午"],
      ["天府", "寅"],
      ["太阴", "卯"],
      ["贪狼", "辰"],
      ["巨门", "巳"],
      ["天相", "午"],
      ["天梁", "未"],
      ["七杀", "申"],
      ["破军", "子"]
    ]
  );
  assert.deepEqual(
    chart.transformations.map(({ star, name, branch }) => [star, name, branch]),
    [
      ["武曲", "化禄", "戌"],
      ["贪狼", "化权", "辰"],
      ["天梁", "化科", "未"],
      ["文曲", "化忌", "辰"]
    ]
  );

  const auxiliaryStarBranches = Object.fromEntries(
    chart.auxiliaryStars.map(({ name, branch }) => [name, branch])
  );
  assert.equal(auxiliaryStarBranches.博士, "午");
  assert.equal(auxiliaryStarBranches.伏兵, "申");
  assert.equal(auxiliaryStarBranches.旬中, "子");
  assert.deepEqual(
    Object.fromEntries(
      chart.auxiliaryStars
        .filter(({ name }) => ["天德", "月德", "解神"].includes(name))
        .map(({ name, branch }) => [name, branch])
    ),
    { 天德: "辰", 月德: "未", 解神: "卯" }
  );
  assert.deepEqual(
    Object.fromEntries(
      chart.palaces.map(({ name, majorPeriod }) => [
        name,
        [majorPeriod.startAge, majorPeriod.endAge]
      ])
    ),
    {
      命宫: [4, 13],
      兄弟宫: [14, 23],
      夫妻宫: [24, 33],
      子女宫: [34, 43],
      财帛宫: [44, 53],
      疾厄宫: [54, 63],
      迁移宫: [64, 73],
      交友宫: [74, 83],
      事业宫: [84, 93],
      田宅宫: [94, 103],
      福德宫: [104, 113],
      父母宫: [114, 123]
    }
  );
});

test("reverses gender-dependent cycles for a yang-year woman", () => {
  const chart = calculateZiWeiChart({
    year: 1982,
    month: 10,
    day: 17,
    hour: 16,
    gender: "female"
  });
  const branchesByStar = Object.fromEntries(
    chart.auxiliaryStars.map(({ name, branch }) => [name, branch])
  );

  assert.equal(branchesByStar.博士, "亥");
  assert.equal(branchesByStar.力士, "戌");
  assert.equal(branchesByStar.长生, "巳");
  assert.equal(branchesByStar.沐浴, "辰");

  const periodsByBranch = Object.fromEntries(
    chart.palaces.map(({ branch, majorPeriod }) => [
      branch,
      [majorPeriod.startAge, majorPeriod.endAge]
    ])
  );
  assert.deepEqual(periodsByBranch.寅, [4, 13]);
  assert.deepEqual(periodsByBranch.丑, [14, 23]);
  assert.deepEqual(periodsByBranch.卯, [114, 123]);
});

test("treats a leap lunar month as the following month", () => {
  const chart = calculateZiWeiChart({
    year: 2023,
    month: 3,
    day: 22,
    hour: 16,
    minute: 0
  });

  assert.equal(chart.lunarDate.month, -2);
  assert.equal(chart.mingGong, "庚申");
  assert.equal(chart.shenGong, "甲子");
});

test("rejects invalid Gregorian birth times", () => {
  assert.throws(
    () => calculateZiWeiChart({ year: 2023, month: 2, day: 29, hour: 0 }),
    RangeError
  );
});
