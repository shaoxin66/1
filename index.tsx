import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  gradient: string;
  promptName: string; 
  desc: string;
  topics: string[]; 
  keywords: Record<string, string[]>; 
}

export interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  id?: string;
}

export interface MistakeRecord extends Question {
  subjectId: string;
  addedAt: number;
}

export interface Artifact {
  id: string;
  name: string;
  desc: string;
  rarity: 'R' | 'SR' | 'SSR';
  icon: string;
  color: string;
  bonus: number;
}

export type TaskDifficulty = 'EASY' | 'NORMAL' | 'HARD' | 'NIGHTMARE';

export interface DailyTask {
  id: string;
  title: string;
  desc: string;
  target: number;
  current: number;
  reward: number;
  claimed: boolean;
  difficulty: TaskDifficulty;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
  conditionType: 'total_correct' | 'total_answered' | 'total_coins' | 'mistakes_cleared' | 'streak_record';
  targetValue: number;
}

export interface UserStats {
  totalCorrect: number;
  totalAnswered: number;
  mistakesCleared: number;
  maxStreak: number;
}

export interface User {
  id: string;
  username: string;
  createdAt: number;
}

export type GameState = 'home' | 'loading' | 'quiz' | 'result' | 'error' | 'mistake-home' | 'mistake-list' | 'collection' | 'gacha';
export type QuizMode = 'genai' | 'review' | 'bank';
export type DataSource = 'ai' | 'bank';

export interface QuizConfig {
  questionCount: number;
  topic: string;
  isExam: boolean; 
  contextData?: string; // For Revenge Mode
}

// --- Theme System ---
type ThemeId = 'default' | 'stranger' | 'taylor' | 'pokemon' | 'candy' | 'angry';

type ThemeConfig = {
  id: ThemeId;
  name: string;
  icon: string;
  styles: {
    appBg: string;
    header: string;
    card: string;
    textMain: string;
    textSub: string;
    btnPrimary: string;
    btnSecondary: string;
    accent: string;
    progressBg: string;
    progressFill: string;
    modalOverlay: string;
    font: string;
  };
};

const THEMES: Record<ThemeId, ThemeConfig> = {
  default: {
    id: 'default',
    name: '默认 (Default)',
    icon: 'fa-layer-group',
    styles: {
      appBg: 'bg-slate-50',
      header: 'bg-slate-900 border-b border-slate-700 text-white',
      card: 'bg-white border border-slate-200 shadow-sm rounded-3xl',
      textMain: 'text-slate-800',
      textSub: 'text-slate-500',
      btnPrimary: 'bg-slate-900 text-white hover:bg-black shadow-lg rounded-xl',
      btnSecondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl',
      accent: 'text-indigo-600',
      progressBg: 'bg-slate-100',
      progressFill: 'bg-indigo-500',
      modalOverlay: 'bg-black/60 backdrop-blur-sm',
      font: 'font-sans'
    }
  },
  stranger: {
    id: 'stranger',
    name: '怪奇物语 (Stranger)',
    icon: 'fa-ghost',
    styles: {
      appBg: 'bg-slate-950',
      header: 'bg-black border-b border-red-900 text-red-600',
      card: 'bg-black/80 border border-red-900/50 shadow-[0_0_20px_rgba(220,38,38,0.15)] rounded-lg backdrop-blur-md',
      textMain: 'text-red-500 tracking-widest',
      textSub: 'text-red-900/80',
      btnPrimary: 'bg-red-900 text-black font-bold hover:bg-red-800 border border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)] rounded-sm',
      btnSecondary: 'bg-black text-red-700 border border-red-900 hover:bg-red-950 rounded-sm',
      accent: 'text-red-500 animate-pulse',
      progressBg: 'bg-red-950',
      progressFill: 'bg-red-600 shadow-[0_0_10px_#ef4444]',
      modalOverlay: 'bg-black/90',
      font: 'font-serif'
    }
  },
  taylor: {
    id: 'taylor',
    name: '霉霉 (Eras)',
    icon: 'fa-music',
    styles: {
      appBg: 'bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100',
      header: 'bg-white/30 backdrop-blur-md border-b border-white/50 text-purple-900 shadow-sm',
      card: 'bg-white/60 backdrop-blur-xl border border-white/60 shadow-lg shadow-purple-500/10 rounded-2xl',
      textMain: 'text-slate-700',
      textSub: 'text-slate-500',
      btnPrimary: 'bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 text-white hover:brightness-110 shadow-lg shadow-purple-200 rounded-full',
      btnSecondary: 'bg-white/50 text-purple-700 border border-white hover:bg-white rounded-full',
      accent: 'text-pink-500',
      progressBg: 'bg-white/50',
      progressFill: 'bg-gradient-to-r from-pink-400 to-purple-400',
      modalOverlay: 'bg-indigo-900/20 backdrop-blur-md',
      font: 'font-sans'
    }
  },
  pokemon: {
    id: 'pokemon',
    name: '宝可梦 (Poke)',
    icon: 'fa-bullseye',
    styles: {
      appBg: 'bg-blue-50',
      header: 'bg-red-600 border-b-4 border-black text-white',
      card: 'bg-white border-4 border-yellow-400 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]',
      textMain: 'text-slate-800',
      textSub: 'text-slate-500',
      btnPrimary: 'bg-blue-600 text-white border-b-4 border-blue-800 hover:brightness-110 active:border-b-0 active:translate-y-1 rounded-lg',
      btnSecondary: 'bg-yellow-400 text-blue-900 border-b-4 border-yellow-600 hover:brightness-110 active:border-b-0 active:translate-y-1 rounded-lg',
      accent: 'text-yellow-500 drop-shadow-md',
      progressBg: 'bg-slate-200 border-2 border-slate-400 rounded-full',
      progressFill: 'bg-yellow-400 border-r-2 border-yellow-600 rounded-full',
      modalOverlay: 'bg-slate-900/80',
      font: 'font-sans'
    }
  },
  candy: {
    id: 'candy',
    name: '消消乐 (Candy)',
    icon: 'fa-candy-cane',
    styles: {
      appBg: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-100 via-sky-100 to-blue-50',
      header: 'bg-purple-500 border-b-4 border-purple-700 text-white',
      card: 'bg-white border-4 border-pink-200 rounded-[2rem] shadow-xl',
      textMain: 'text-purple-700 font-bold',
      textSub: 'text-pink-400 font-medium',
      btnPrimary: 'bg-pink-500 text-white rounded-full shadow-[0_6px_0_rgb(157,23,77)] hover:shadow-[0_3px_0_rgb(157,23,77)] hover:translate-y-1 transition-all',
      btnSecondary: 'bg-sky-400 text-white rounded-full shadow-[0_6px_0_rgb(3,105,161)] hover:shadow-[0_3px_0_rgb(3,105,161)] hover:translate-y-1 transition-all',
      accent: 'text-orange-400',
      progressBg: 'bg-white border-2 border-pink-100 rounded-full h-4',
      progressFill: 'bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full',
      modalOverlay: 'bg-purple-900/50 backdrop-blur-sm',
      font: 'font-sans'
    }
  },
  angry: {
    id: 'angry',
    name: '愤怒鸟 (Birds)',
    icon: 'fa-crow',
    styles: {
      appBg: 'bg-sky-300',
      header: 'bg-sky-500 border-b-4 border-sky-700 text-white',
      card: 'bg-[#fef3c7] border-4 border-[#78350f] rounded-sm shadow-[4px_4px_0px_rgba(0,0,0,0.2)]',
      textMain: 'text-[#451a03]',
      textSub: 'text-[#92400e]',
      btnPrimary: 'bg-red-600 text-white border-b-4 border-red-900 rounded-lg active:border-b-0 active:mt-1',
      btnSecondary: 'bg-green-500 text-white border-b-4 border-green-800 rounded-lg active:border-b-0 active:mt-1',
      accent: 'text-red-600',
      progressBg: 'bg-slate-900/20 rounded-full',
      progressFill: 'bg-red-600 border border-red-400 rounded-full',
      modalOverlay: 'bg-black/40',
      font: 'font-sans'
    }
  }
};

// --- Game Data ---

const SUBJECTS: Subject[] = [
  { 
    id: 'english', 
    name: '大学英语', 
    promptName: 'Chinese University English (Zhuanshengben level)', 
    icon: 'fa-scroll', 
    color: 'bg-blue-600', 
    gradient: 'from-blue-500 to-blue-700',
    desc: '征服单词恶魔，掌握语法秘籍',
    topics: ['语法-虚拟语气', '语法-倒装句', '语法-非谓语动词', '语法-定语从句', '核心词汇'],
    keywords: {
      '语法-虚拟语气': ['虚拟', 'subjunctive', 'if', 'wish'],
      '语法-倒装句': ['倒装', 'inversion', 'hardly', 'never', 'only'],
      '语法-非谓语动词': ['非谓语', 'infinitive', 'participle', 'doing', 'to do'],
      '语法-定语从句': ['定语从句', 'clause', 'which', 'that', 'who'],
      '核心词汇': ['词汇', 'vocabulary', 'mean', 'word']
    }
  },
  { 
    id: 'math', 
    name: '高等数学', 
    promptName: 'Calculus and Advanced Mathematics', 
    icon: 'fa-cube', 
    color: 'bg-emerald-600', 
    gradient: 'from-emerald-500 to-emerald-700',
    desc: '破解极限迷宫，计算导数神力',
    topics: ['函数与极限', '导数与微分', '不定积分', '定积分', '微分方程'],
    keywords: {
      '函数与极限': ['极限', '连续', 'limit', 'x ->'],
      '导数与微分': ['导数', '切线', '微分', 'derivative'],
      '不定积分': ['不定积分', '原函数', 'integral'],
      '定积分': ['定积分', '面积', 'integral'],
      '微分方程': ['微分方程', '通解', 'equation']
    }
  },
  { 
    id: 'computer', 
    name: '计算机基础', 
    promptName: 'Computer Science Basics', 
    icon: 'fa-microchip', 
    color: 'bg-purple-600', 
    gradient: 'from-purple-500 to-purple-700',
    desc: '穿越二进制矩阵，掌握赛博科技',
    topics: ['数据表示', '计算机硬件', '操作系统', '计算机网络', '新技术'],
    keywords: {
      '数据表示': ['进制', 'ASCII', '补码', '位', '字节'],
      '计算机硬件': ['CPU', '总线', '存储器', '硬件'],
      '操作系统': ['OS', '进程', '管理', '死锁', 'Windows'],
      '计算机网络': ['IP', 'TCP', 'HTTP', '协议', '网络'],
      '新技术': ['AI', '大数据', '5G', '云计算']
    }
  },
  { 
    id: 'politics', 
    name: '思想政治', 
    promptName: 'Chinese Politics', 
    icon: 'fa-flag', 
    color: 'bg-red-600', 
    gradient: 'from-red-500 to-red-700',
    desc: '修炼理论心法，洞悉历史规律',
    topics: ['马克思主义哲学', '毛泽东思想', '邓小平理论', '习近平新时代思想', '时事政治'],
    keywords: {
      '马克思主义哲学': ['唯物', '辩证', '认识', '实践'],
      '毛泽东思想': ['毛泽东', '新民主主义', '革命'],
      '邓小平理论': ['邓小平', '改革开放', '初级阶段'],
      '习近平新时代思想': ['习近平', '新时代', '二十大', '中国式现代化'],
      '时事政治': ['会议', '精神', '周年']
    }
  },
];

const ARTIFACTS: Artifact[] = [
  // --- Basic Tier (R) ---
  { id: 'r1', name: '草鞋', desc: '唯一被动：+60 移动速度。这可是去食堂抢饭必备的战靴。', rarity: 'R', icon: 'fa-shoe-prints', color: 'text-stone-500', bonus: 1 },
  { id: 'r2', name: '铁剑', desc: '一支朴实无华的铁质钢笔。攻击力+20，书写力度+100%。', rarity: 'R', icon: 'fa-pen', color: 'text-slate-500', bonus: 1 },
  { id: 'r3', name: '布甲', desc: '一件洗得发白的校服。虽然防御力不高，但充满了青春的回忆（和汗味）。', rarity: 'R', icon: 'fa-shirt', color: 'text-zinc-500', bonus: 1 },
  { id: 'r4', name: '红玛瑙', desc: '保温杯里的红枣枸杞。+300 最大生命，养生要从大一抓起。', rarity: 'R', icon: 'fa-heart', color: 'text-red-400', bonus: 1 },
  { id: 'r5', name: '学识宝石', desc: '辅助出门装。虽然自己不学，但看着室友学，仿佛自己也懂了。', rarity: 'R', icon: 'fa-gem', color: 'text-emerald-400', bonus: 2 },
  { id: 'r6', name: '蓝宝石', desc: '一瓶冰镇矿泉水。+300 最大法力，这清凉的感觉，透心凉心飞扬。', rarity: 'R', icon: 'fa-bottle-water', color: 'text-blue-400', bonus: 1 },
  // --- Advanced Tier (SR) ---
  { id: 'sr1', name: '冷静之靴', desc: '唯一被动-静谧：减少15%的焦虑冷却时间。穿上它，考试再也不慌了。', rarity: 'SR', icon: 'fa-socks', color: 'text-cyan-500', bonus: 3 },
  { id: 'sr2', name: '吸血之镰', desc: '物理吸血+10%。在图书馆学习时，能吸取周围人的“卷”气为己所用。', rarity: 'SR', icon: 'fa-droplet', color: 'text-red-600', bonus: 3 },
  { id: 'sr3', name: '雪山圆盾', desc: '由无数张不及格试卷压制而成的盾牌，能抵挡来自老师的视线攻击。', rarity: 'SR', icon: 'fa-shield-halved', color: 'text-indigo-400', bonus: 4 },
  { id: 'sr4', name: '陨星', desc: '冷却缩减+10%。像流星一样划过夜空，指你做题的速度。', rarity: 'SR', icon: 'fa-meteor', color: 'text-orange-600', bonus: 4 },
  { id: 'sr5', name: '光辉之剑', desc: '唯一被动-咒刃：背完一个单词后，下一个单词记忆效果翻倍。', rarity: 'SR', icon: 'fa-bolt', color: 'text-yellow-400', bonus: 4 },
  { id: 'sr6', name: '净化水晶', desc: '升级时恢复生命和法力。每学会一个新知识点，精神焕发，仿佛重获新生。', rarity: 'SR', icon: 'fa-flask', color: 'text-purple-400', bonus: 3 },
  { id: 'sr7', name: '速击之枪', desc: '攻速+25%。虽然不知道做题为什么要攻速，但填涂答题卡确实变快了。', rarity: 'SR', icon: 'fa-pencil', color: 'text-amber-600', bonus: 3 },
  // --- Legendary Tier (SSR) ---
  { id: 'ssr1', name: '无尽战刃', desc: '+110 攻击力，+20% 暴击率。做选择题时，蒙对的概率大幅提升（玄学）。', rarity: 'SSR', icon: 'fa-khanda', color: 'text-amber-500', bonus: 8 },
  { id: 'ssr2', name: '痛苦面具', desc: '唯一被动-折磨：技能命中会造成持续伤害。就像那道永远解不出的高数题，时刻折磨着你的心。', rarity: 'SSR', icon: 'fa-mask', color: 'text-pink-600', bonus: 8 },
  { id: 'ssr3', name: '博学者之怒', desc: '法术强度提升35%。帽子的形状。戴上它，你就是考场上最靓的学神。', rarity: 'SSR', icon: 'fa-hat-wizard', color: 'text-red-500', bonus: 10 },
  { id: 'ssr4', name: '贤者的庇护', desc: '唯一被动-复生：挂科后立即原地复活，获得第二次补考机会（仅限游戏内生效）。', rarity: 'SSR', icon: 'fa-vest-patches', color: 'text-yellow-500', bonus: 9 },
  { id: 'ssr5', name: '辉月', desc: '唯一主动-月之守护：免疫所有伤害2.5秒。遇到不会的题，先发呆2.5秒冷静一下。', rarity: 'SSR', icon: 'fa-stopwatch', color: 'text-yellow-300', bonus: 9 },
  { id: 'ssr6', name: '破军', desc: '对生命值低于50%的敌人造成额外伤害。专治各类压轴大题，收割分数，一击必杀。', rarity: 'SSR', icon: 'fa-gavel', color: 'text-orange-500', bonus: 10 },
  { id: 'ssr7', name: '泣血之刃', desc: '+25% 物理吸血。刷题刷累了？不存在的，越刷越精神！只要我学得够快，疲惫就追不上我。', rarity: 'SSR', icon: 'fa-fill-drip', color: 'text-red-700', bonus: 9 },
  { id: 'ssr8', name: '极寒风暴', desc: '受到伤害触发寒冰冲击。当看到试卷太难时，心都凉了半截，顺便让周围的空气也凝固。', rarity: 'SSR', icon: 'fa-snowflake', color: 'text-cyan-400', bonus: 8 }
];

const ACHIEVEMENTS_DATA: Achievement[] = [
  { id: 'first_blood', title: '初露锋芒', desc: '累计答对 1 道题目', icon: 'fa-baby', color: 'text-green-500', conditionType: 'total_correct', targetValue: 1 },
  { id: 'scholar_1', title: '勤奋学徒', desc: '累计答对 20 道题目', icon: 'fa-book-open', color: 'text-blue-500', conditionType: 'total_correct', targetValue: 20 },
  { id: 'scholar_2', title: '博学多才', desc: '累计答对 100 道题目', icon: 'fa-graduation-cap', color: 'text-purple-500', conditionType: 'total_correct', targetValue: 100 },
  { id: 'practice_1', title: '题海战术', desc: '累计作答 50 道题目', icon: 'fa-pen-to-square', color: 'text-indigo-500', conditionType: 'total_answered', targetValue: 50 },
  { id: 'rich_1', title: '第一桶金', desc: '拥有 1000 枚金币', icon: 'fa-sack-dollar', color: 'text-yellow-500', conditionType: 'total_coins', targetValue: 1000 },
  { id: 'cleaner', title: '清道夫', desc: '累计复活(掌握) 5 道错题', icon: 'fa-broom', color: 'text-orange-500', conditionType: 'mistakes_cleared', targetValue: 5 },
  { id: 'streak_master', title: '连胜大师', desc: '单次达到 10 连胜', icon: 'fa-fire', color: 'text-red-500', conditionType: 'streak_record', targetValue: 10 }
];

const GACHA_COST = 500;
const STORAGE_PREFIX = 'zsb_v2_';
const getKey = (userId: string, key: string) => `${STORAGE_PREFIX}${userId}_${key}`;

// --- Local Question Bank ---
const LOCAL_QUESTION_BANK: Record<string, Question[]> = {
  english: [
     { question: "[2026预测] Neither the students nor the teacher ______ the idea.", options: ["supports", "support", "supporting", "to support"], correctIndex: 0, explanation: "【解析】本题考查主谓一致。neither...nor...连接两个主语时，谓语动词遵循“就近原则”。teacher是单数，所以谓语动词用单数supports。" },
     { question: "[2026预测] It is high time that we ______ immediate measures.", options: ["take", "took", "will take", "have taken"], correctIndex: 1, explanation: "【解析】本题考查虚拟语气。It is (high/about) time that...句型中，从句谓语动词通常用过去式，表示“该是做...的时候了”。因此选took。" },
     { question: "[2026重点] If I ______ you, I would not miss the chance.", options: ["am", "was", "were", "have been"], correctIndex: 2, explanation: "【解析】本题考查虚拟语气。与现在事实相反的假设，if从句中be动词统一用were。因此选were。" }
  ],
  math: [
     { question: "[2026预测] 当 x -> 0 时，sin(x) / x 的极限是：", options: ["0", "1", "无穷大", "不存在"], correctIndex: 1, explanation: "【解析】这是两个重要极限之一。当x趋近于0时，sin(x)与x是等价无穷小，比值为1。" },
     { question: "[2026重点] lim(x->∞) (1 + 1/x)^x 的值是：", options: ["1", "e", "0", "∞"], correctIndex: 1, explanation: "【解析】这是两个重要极限之一。这是自然对数底e的定义式。" }
  ],
  computer: [
     { question: "[2026预测] 在计算机中，一个字节(Byte)包含的二进制位(bit)数是：", options: ["4", "8", "16", "32"], correctIndex: 1, explanation: "【解析】计算机基础知识。1 Byte (字节) = 8 bits (位)。这是计算机存储容量的基本单位换算。" },
     { question: "[2026重点] 已知字符 'A' 的 ASCII 码是 65，则字符 'C' 的 ASCII 码是：", options: ["66", "67", "68", "97"], correctIndex: 1, explanation: "【解析】ASCII码是顺序排列的。A=65, B=66, C=67。因此选67。" }
  ],
  politics: [
     { question: "[2026预测] 唯物辩证法的根本方法是：", options: ["实事求是", "矛盾分析法", "群众路线", "理论联系实际"], correctIndex: 1, explanation: "【解析】矛盾分析法是认识事物的根本方法。唯物辩证法认为矛盾是事物发展的动力，因此矛盾分析法是其根本方法。" },
     { question: "[2026核心] 习近平新时代中国特色社会主义思想的核心要义是：", options: ["坚持和发展中国特色社会主义", "实现中华民族伟大复兴", "构建人类命运共同体", "全面从严治党"], correctIndex: 0, explanation: "【解析】习近平新时代中国特色社会主义思想的核心要义是坚持和发展中国特色社会主义。" }
  ]
};

// --- Managers ---

const AuthManager = {
  getUsers: (): User[] => {
    try { return JSON.parse(localStorage.getItem('zsb_users_db') || '[]'); } catch { return []; }
  },
  login: (username: string): User | null => {
    const users = AuthManager.getUsers();
    return users.find(u => u.username === username) || null;
  },
  register: (username: string): User | string => {
    const users = AuthManager.getUsers();
    if (users.some(u => u.username === username)) return "用户名已存在";
    
    const newUser: User = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      username,
      createdAt: Date.now()
    };
    localStorage.setItem('zsb_users_db', JSON.stringify([...users, newUser]));
    return newUser;
  }
};

const DataManager = {
  getMistakes: (userId: string): MistakeRecord[] => {
    try { return JSON.parse(localStorage.getItem(getKey(userId, 'mistakes')) || '[]'); } catch { return []; }
  },
  saveMistake: (userId: string, subjectId: string, question: Question) => {
    const current = DataManager.getMistakes(userId);
    if (!current.some(q => q.question === question.question)) {
      const newM: MistakeRecord = { ...question, subjectId, addedAt: Date.now(), id: Date.now().toString() };
      localStorage.setItem(getKey(userId, 'mistakes'), JSON.stringify([newM, ...current]));
    }
  },
  removeMistake: (userId: string, questionText: string) => {
    const current = DataManager.getMistakes(userId);
    localStorage.setItem(getKey(userId, 'mistakes'), JSON.stringify(current.filter(q => q.question !== questionText)));
  },
  getCoins: (userId: string): number => parseInt(localStorage.getItem(getKey(userId, 'coins')) || '0'),
  addCoins: (userId: string, amount: number) => {
    const newTotal = DataManager.getCoins(userId) + amount;
    localStorage.setItem(getKey(userId, 'coins'), newTotal.toString());
    return newTotal;
  },
  getInventory: (userId: string): string[] => JSON.parse(localStorage.getItem(getKey(userId, 'inventory')) || '[]'),
  addToInventory: (userId: string, artifactId: string) => {
    const current = DataManager.getInventory(userId);
    if (!current.includes(artifactId)) {
      localStorage.setItem(getKey(userId, 'inventory'), JSON.stringify([...current, artifactId]));
    }
  },
  getEquipped: (userId: string): string | null => localStorage.getItem(getKey(userId, 'equipped')),
  setEquipped: (userId: string, artifactId: string | null) => {
    if (artifactId) localStorage.setItem(getKey(userId, 'equipped'), artifactId);
    else localStorage.removeItem(getKey(userId, 'equipped'));
  },
  getTasks: (userId: string): DailyTask[] => {
    const today = new Date().toDateString();
    const lastLogin = localStorage.getItem(getKey(userId, 'last_login'));
    let tasks = JSON.parse(localStorage.getItem(getKey(userId, 'tasks')) || '[]');

    if (lastLogin !== today || tasks.length === 0) {
      tasks = [
        { id: 'login', title: '冒险启程', desc: '登录游戏', target: 1, current: 1, reward: 50, claimed: false, difficulty: 'EASY' },
        { id: 'quiz', title: '小试牛刀', desc: '完成一次任意练习', target: 1, current: 0, reward: 100, claimed: false, difficulty: 'EASY' },
        { id: 'correct', title: '精准打击', desc: '累计答对 15 道题目', target: 15, current: 0, reward: 200, claimed: false, difficulty: 'NORMAL' },
        { id: 'streak', title: '连胜大神', desc: '单次练习中取得 5 连胜', target: 5, current: 0, reward: 300, claimed: false, difficulty: 'HARD' },
        { id: 'necromancer', title: '亡灵净化', desc: '从错题本中移除(掌握) 3 道错题', target: 3, current: 0, reward: 350, claimed: false, difficulty: 'HARD' },
        { id: 'scholar', title: '博学多才', desc: '完成 3 次完整练习', target: 3, current: 0, reward: 500, claimed: false, difficulty: 'NIGHTMARE' }
      ];
      localStorage.setItem(getKey(userId, 'tasks'), JSON.stringify(tasks));
      localStorage.setItem(getKey(userId, 'last_login'), today);
    }
    return tasks;
  },
  updateTaskProgress: (userId: string, taskId: string, increment: number = 1, isSet: boolean = false) => {
    const tasks = DataManager.getTasks(userId);
    const newTasks = tasks.map(t => {
      if (t.id === taskId) {
        let newVal = isSet ? increment : t.current + increment;
        if (taskId === 'streak') newVal = Math.max(t.current, increment);
        else newVal = Math.min(newVal, t.target);
        return { ...t, current: newVal };
      }
      return t;
    });
    localStorage.setItem(getKey(userId, 'tasks'), JSON.stringify(newTasks));
    return newTasks;
  },
  claimTaskReward: (userId: string, taskId: string) => {
    const tasks = DataManager.getTasks(userId);
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.claimed && task.current >= task.target) {
      task.claimed = true;
      localStorage.setItem(getKey(userId, 'tasks'), JSON.stringify(tasks));
      return task.reward;
    }
    return 0;
  },
  
  // Achievement System Logic
  getUserStats: (userId: string): UserStats => {
    try {
      return JSON.parse(localStorage.getItem(getKey(userId, 'stats')) || '{"totalCorrect":0,"totalAnswered":0,"mistakesCleared":0,"maxStreak":0}');
    } catch { return { totalCorrect: 0, totalAnswered: 0, mistakesCleared: 0, maxStreak: 0 }; }
  },
  updateUserStats: (userId: string, updates: Partial<UserStats>) => {
    const current = DataManager.getUserStats(userId);
    const updated = { ...current, ...updates };
    // Handle specific logic like maxStreak
    if (updates.maxStreak && updates.maxStreak < current.maxStreak) {
       updated.maxStreak = current.maxStreak; // Keep high score
    }
    localStorage.setItem(getKey(userId, 'stats'), JSON.stringify(updated));
    return updated;
  },
  getUnlockedAchievements: (userId: string): string[] => {
    return JSON.parse(localStorage.getItem(getKey(userId, 'achievements')) || '[]');
  },
  unlockAchievement: (userId: string, achievementId: string) => {
    const current = DataManager.getUnlockedAchievements(userId);
    if (!current.includes(achievementId)) {
      localStorage.setItem(getKey(userId, 'achievements'), JSON.stringify([...current, achievementId]));
      return true;
    }
    return false;
  },

  isTutorialDone: (userId: string): boolean => {
    return localStorage.getItem(getKey(userId, 'tutorial_complete')) === 'true';
  },
  markTutorialDone: (userId: string) => {
    localStorage.setItem(getKey(userId, 'tutorial_complete'), 'true');
  },
  exportUserData: (userId: string) => {
    const data = {
      version: 1,
      userId: userId,
      timestamp: Date.now(),
      coins: localStorage.getItem(getKey(userId, 'coins')),
      inventory: localStorage.getItem(getKey(userId, 'inventory')),
      equipped: localStorage.getItem(getKey(userId, 'equipped')),
      mistakes: localStorage.getItem(getKey(userId, 'mistakes')),
      tasks: localStorage.getItem(getKey(userId, 'tasks')),
      last_login: localStorage.getItem(getKey(userId, 'last_login')),
      tutorial_complete: localStorage.getItem(getKey(userId, 'tutorial_complete')),
      stats: localStorage.getItem(getKey(userId, 'stats')),
      achievements: localStorage.getItem(getKey(userId, 'achievements'))
    };
    return JSON.stringify(data);
  },
  importUserData: (userId: string, jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.version || !data.userId) throw new Error("Invalid Save File");
      if (data.coins) localStorage.setItem(getKey(userId, 'coins'), data.coins);
      if (data.inventory) localStorage.setItem(getKey(userId, 'inventory'), data.inventory);
      if (data.equipped) localStorage.setItem(getKey(userId, 'equipped'), data.equipped);
      if (data.mistakes) localStorage.setItem(getKey(userId, 'mistakes'), data.mistakes);
      if (data.tasks) localStorage.setItem(getKey(userId, 'tasks'), data.tasks);
      if (data.last_login) localStorage.setItem(getKey(userId, 'last_login'), data.last_login);
      if (data.tutorial_complete) localStorage.setItem(getKey(userId, 'tutorial_complete'), data.tutorial_complete);
      if (data.stats) localStorage.setItem(getKey(userId, 'stats'), data.stats);
      if (data.achievements) localStorage.setItem(getKey(userId, 'achievements'), data.achievements);
      return true;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
  }
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// --- Question Fetching ---

const fetchQuestionsFromAI = async (subject: Subject, config: QuizConfig): Promise<Question[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let prompt = '';
  
  if (config.topic === 'revenge' && config.contextData) {
      // Revenge mode prompt
      prompt = `Based on these past mistakes:
      "${config.contextData}"
      
      Generate STRICTLY exactly ${config.questionCount} NEW multiple-choice questions for Chinese Zhuanshengben exam.
      Subject: ${subject.promptName}.
      Difficulty: Hard.
      Language: Simplified Chinese.
      Task: Create new questions that test the same concepts but with different numbers or examples.
      
      JSON format: [{question, options(array), correctIndex(int), explanation}]. 
      Ensure array length is exactly ${config.questionCount}.`;
  } else {
      // Standard mode prompt
      const topicPrompt = config.topic === 'all' ? "Covering all key topics" : `Focus on topic: "${config.topic}"`;
      prompt = `Generate STRICTLY exactly ${config.questionCount} multiple-choice questions for Chinese Zhuanshengben exam. Subject: ${subject.promptName}. Language: Simplified Chinese. Focus: ${topicPrompt}. Difficulty: Hard.
      JSON format: [{question, options(array), correctIndex(int), explanation}]. 
      IMPORTANT: The 'explanation' field MUST be provided for every question and should be detailed (at least 20-30 words), explaining why the correct answer is right.
      Ensure the array length is exactly ${config.questionCount}.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctIndex: { type: Type.INTEGER }, explanation: { type: Type.STRING } } } } }
    });
    return JSON.parse(response.text || '[]');
  } catch (e) { throw e; }
};

const fetchQuestionsFromBank = async (subject: Subject, config: QuizConfig): Promise<Question[]> => {
  await new Promise(r => setTimeout(r, 600));
  let qs = LOCAL_QUESTION_BANK[subject.id] || [];
  if (config.topic !== 'all' && config.topic !== 'revenge') {
    const kws = subject.keywords[config.topic] || [];
    if (kws.length) qs = qs.filter(q => kws.some(k => q.question.includes(k) || q.explanation.includes(k)));
  }
  if (qs.length === 0) return [];
  let finalQs = [...qs];
  while (finalQs.length < config.questionCount) { finalQs = [...finalQs, ...qs]; }
  return finalQs.sort(() => 0.5 - Math.random()).slice(0, config.questionCount);
};

// --- Components ---

const AchievementToast = ({ achievement, theme }: { achievement: Achievement | null, theme: ThemeConfig }) => {
  if (!achievement) return null;
  return (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[110] flex items-center p-4 rounded-xl shadow-2xl animate-[drop-bounce_0.5s_ease-out] ${theme.styles.card} border-2 border-yellow-400 bg-yellow-50`}>
       <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4 text-2xl text-yellow-600 shadow-inner">
         <i className={`fa-solid ${achievement.icon}`}></i>
       </div>
       <div>
         <p className="text-xs font-bold text-yellow-600 uppercase tracking-widest">成就解锁</p>
         <h3 className={`font-bold text-lg ${theme.styles.textMain}`}>{achievement.title}</h3>
       </div>
       <div className="ml-6">
         <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center animate-spin-slow"><i className="fa-solid fa-star text-yellow-400"></i></div>
       </div>
    </div>
  );
};

const AchievementModal = ({ stats, unlockedIds, onClose, theme }: { stats: UserStats, unlockedIds: string[], onClose: () => void, theme: ThemeConfig }) => {
  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center p-4 ${theme.styles.modalOverlay} fade-in ${theme.styles.font}`}>
      <div className={`${theme.styles.card} w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col anim-scale-in`}>
         <div className="p-6 border-b flex justify-between items-center shrink-0">
           <div>
             <h3 className={`text-xl font-bold ${theme.styles.textMain}`}><i className="fa-solid fa-trophy mr-2 text-yellow-500"></i>成就勋章</h3>
             <p className={`text-sm ${theme.styles.textSub}`}>已解锁: {unlockedIds.length} / {ACHIEVEMENTS_DATA.length}</p>
           </div>
           <button onClick={onClose} className={theme.styles.textSub}><i className="fa-solid fa-xmark text-xl"></i></button>
         </div>
         <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {ACHIEVEMENTS_DATA.map(ach => {
               const isUnlocked = unlockedIds.includes(ach.id);
               let progress = 0;
               let currentVal = 0;
               if (ach.conditionType === 'total_correct') currentVal = stats.totalCorrect;
               else if (ach.conditionType === 'total_answered') currentVal = stats.totalAnswered;
               else if (ach.conditionType === 'mistakes_cleared') currentVal = stats.mistakesCleared;
               else if (ach.conditionType === 'streak_record') currentVal = stats.maxStreak;
               else if (ach.conditionType === 'total_coins') currentVal = DataManager.getCoins(JSON.parse(localStorage.getItem('zsb_users_db')||'[]')[0]?.id || ''); // HACK: need coin value passed or just rely on unlocked status visual
               
               // Coin logic needs actual coin value, but unlocked status is truth
               if (isUnlocked) progress = 100;
               else if (ach.conditionType !== 'total_coins') progress = Math.min(100, (currentVal / ach.targetValue) * 100);

               return (
                 <div key={ach.id} className={`p-4 rounded-xl border-2 flex items-center gap-4 relative overflow-hidden transition-all ${isUnlocked ? `${theme.styles.card} border-yellow-400/50 bg-gradient-to-br from-yellow-50 to-white` : 'bg-gray-100 border-gray-200 opacity-70 grayscale'}`}>
                   {isUnlocked && <div className="absolute top-0 right-0 px-2 py-0.5 bg-yellow-400 text-[10px] font-bold text-white rounded-bl-lg shadow-sm">已达成</div>}
                   <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-sm shrink-0 ${isUnlocked ? 'bg-white text-yellow-500 border-2 border-yellow-100' : 'bg-gray-200 text-gray-400'}`}>
                     <i className={`fa-solid ${ach.icon}`}></i>
                   </div>
                   <div className="flex-1 min-w-0">
                     <h4 className={`font-bold ${theme.styles.textMain} truncate`}>{ach.title}</h4>
                     <p className={`text-xs ${theme.styles.textSub} line-clamp-2`}>{ach.desc}</p>
                     {!isUnlocked && ach.conditionType !== 'total_coins' && (
                        <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                           <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                     )}
                   </div>
                 </div>
               );
             })}
           </div>
         </div>
      </div>
    </div>
  );
};

const RevengeSetupModal = ({ subject, mistakeCount, onClose, onStart, theme }: { subject: Subject; mistakeCount: number; onClose: () => void; onStart: (count: number) => void; theme: ThemeConfig }) => {
    const [count, setCount] = useState(5);
    return (
        <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 ${theme.styles.modalOverlay} fade-in ${theme.styles.font}`}>
            <div className={`${theme.styles.card} w-full max-w-md overflow-hidden transform transition-all scale-100 anim-scale-in`}>
                <div className={`bg-red-900 p-6 text-white relative`}>
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white transition-transform active:scale-90"><i className="fa-solid fa-xmark text-xl"></i></button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center text-2xl backdrop-blur-md border border-red-500/50"><i className={`fa-solid fa-dungeon text-red-500 animate-pulse`}></i></div>
                        <div><h3 className="text-xl font-bold">复仇之战</h3><p className="text-red-200 text-xs font-mono">针对弱项 • 靶向治疗</p></div>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    <div className={`p-4 rounded-xl border bg-red-50 border-red-200`}>
                        <p className="text-sm text-red-800 leading-relaxed">
                            AI 将深度分析你在 <span className="font-bold">{subject.name}</span> 中的 <span className="font-bold">{mistakeCount}</span> 道错题，并生成针对性的变式训练题。
                        </p>
                    </div>
                    <div>
                        <label className={`text-xs font-bold uppercase tracking-wider mb-3 block ${theme.styles.textSub}`}>生成题目数量</label>
                        <div className="grid grid-cols-3 gap-3">{[5, 10, 15].map(num => <button key={num} onClick={() => onStart(num)} className={`py-3 rounded-lg font-bold text-sm transition-all border-2 active:scale-95 ${count === num ? `border-red-600 bg-red-600 text-white` : `${theme.styles.textSub} border-transparent bg-black/5 hover:bg-black/10`}`}>{num} 题</button>)}</div>
                    </div>
                    <button onClick={() => onStart(count)} className={`w-full py-4 font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/30 rounded-xl`}><span>开启复仇</span><i className={`fa-solid fa-skull`}></i></button>
                </div>
            </div>
        </div>
    );
};

const TutorialOverlay = ({ steps, onComplete, theme }: { steps: { targetId: string | null, text: string, title: string }[], onComplete: () => void, theme: ThemeConfig }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  const step = steps[currentStep];

  useEffect(() => {
    const updatePosition = () => {
      if (step.targetId) {
        const el = document.getElementById(step.targetId);
        if (el) {
          const rect = el.getBoundingClientRect();
          setPosition({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
        } else { setPosition(null); }
      } else { setPosition(null); }
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    const timer = setTimeout(updatePosition, 100); 
    return () => { window.removeEventListener('resize', updatePosition); clearTimeout(timer); };
  }, [currentStep, step.targetId]);

  return (
    <div className={`fixed inset-0 z-[100] ${theme.styles.font}`}>
      <div className="absolute inset-0 bg-black/70 mix-blend-multiply transition-opacity duration-300"></div>
      {position && (
        <div 
          className="absolute border-2 border-white/50 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.75),0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300 ease-in-out"
          style={{ top: position.top - 4, left: position.left - 4, width: position.width + 8, height: position.height + 8, pointerEvents: 'none' }}
        ></div>
      )}
      <div 
        className={`absolute w-80 ${theme.styles.card} p-6 shadow-2xl transition-all duration-300 z-[101] anim-scale-in`}
        style={{
          top: position ? (position.top + position.height + 20 > window.innerHeight - 200 ? position.top - 180 : position.top + position.height + 20) : '50%',
          left: position ? Math.max(20, Math.min(window.innerWidth - 340, position.left)) : '50%',
          transform: position ? 'none' : 'translate(-50%, -50%)',
        }}
      >
        <div className="flex items-start gap-4">
           <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl ${theme.styles.btnPrimary}`}><i className={`fa-solid ${theme.icon}`}></i></div>
           <div>
              <h3 className={`font-bold text-lg mb-1 ${theme.styles.textMain}`}>{step.title}</h3>
              <p className={`text-sm mb-4 ${theme.styles.textSub}`}>{step.text}</p>
              <div className="flex justify-end gap-2">
                 {currentStep > 0 && <button onClick={() => setCurrentStep(currentStep - 1)} className={`px-3 py-1 text-xs rounded border ${theme.styles.textSub} hover:bg-black/5`}>上一步</button>}
                 <button onClick={() => currentStep < steps.length - 1 ? setCurrentStep(currentStep + 1) : onComplete()} className={`px-4 py-2 text-sm font-bold rounded-lg shadow-md transition-transform active:scale-95 ${theme.styles.btnPrimary}`}>{currentStep === steps.length - 1 ? '开始冒险！' : '下一步'}</button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const ThemeSwitcherModal = ({ currentThemeId, onSelect, onClose, theme }: { currentThemeId: ThemeId, onSelect: (id: ThemeId) => void, onClose: () => void, theme: ThemeConfig }) => (
    <div className={`fixed inset-0 z-[90] flex items-center justify-center p-4 ${theme.styles.modalOverlay} fade-in`}>
      <div className={`${theme.styles.card} w-full max-w-lg overflow-hidden anim-scale-in`}>
        <div className={`p-6 border-b ${theme.id === 'stranger' || theme.id === 'default' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center"><h3 className={`text-xl font-bold ${theme.styles.textMain}`}>选择主题风格</h3><button onClick={onClose} className={theme.styles.textSub}><i className="fa-solid fa-xmark text-xl"></i></button></div>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {Object.values(THEMES).map((t) => (
            <button key={t.id} onClick={() => { onSelect(t.id); onClose(); }} className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center gap-2 aspect-video ${currentThemeId === t.id ? `border-current ring-2 ring-offset-2 ${t.styles.accent}` : 'border-transparent bg-slate-100/50 hover:bg-slate-200/50'}`} style={{ background: t.id === 'stranger' ? '#0f172a' : t.id === 'pokemon' ? '#eff6ff' : t.id === 'candy' ? '#ecfeff' : t.id === 'taylor' ? '#fce7f3' : t.id === 'angry' ? '#7dd3fc' : '#f8fafc', color: t.id === 'stranger' ? '#dc2626' : t.id === 'default' ? '#1e293b' : '#334155' }}>
              <i className={`fa-solid ${t.icon} text-3xl mb-2`}></i><span className="font-bold text-sm">{t.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
);

const DataSettingsModal = ({ user, onClose, theme, onReload }: { user: User, onClose: () => void, theme: ThemeConfig, onReload: () => void }) => {
  const [importStatus, setImportStatus] = useState<string>('');
  const handleExport = () => {
    const blob = new Blob([DataManager.exportUserData(user.id)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `zsb_save_${user.username}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (DataManager.importUserData(user.id, ev.target?.result as string)) {
        setImportStatus('存档恢复成功！即将刷新...');
        setTimeout(() => { onReload(); onClose(); }, 1500);
      } else { setImportStatus('存档文件无效或损坏'); }
    };
    reader.readAsText(file);
  };
  return (
    <div className={`fixed inset-0 z-[95] flex items-center justify-center p-4 ${theme.styles.modalOverlay} fade-in ${theme.styles.font}`}>
      <div className={`${theme.styles.card} w-full max-w-md overflow-hidden anim-scale-in`}>
         <div className="p-6 border-b border-gray-200/20">
            <div className="flex justify-between items-center"><h3 className={`text-xl font-bold ${theme.styles.textMain}`}>数据管理</h3><button onClick={onClose} className={theme.styles.textSub}><i className="fa-solid fa-xmark text-xl"></i></button></div>
         </div>
         <div className="p-8 space-y-6">
            <div className="text-center"><div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl mb-3 ${theme.styles.btnPrimary}`}><i className="fa-solid fa-floppy-disk"></i></div><p className={theme.styles.textSub}>你可以导出存档在其他设备上恢复，<br/>实现跨设备同步。</p></div>
            <div className="grid grid-cols-1 gap-4">
               <button onClick={handleExport} className={`w-full py-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${theme.styles.btnSecondary}`}><i className="fa-solid fa-download"></i> 生成冒险之书 (导出)</button>
               <div className="relative"><input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /><button className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${theme.styles.btnPrimary}`}><i className="fa-solid fa-upload"></i> 读取异界记忆 (导入)</button></div>
            </div>
            {importStatus && <div className={`text-center text-sm font-bold ${importStatus.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>{importStatus}</div>}
         </div>
      </div>
    </div>
  );
};

const AuthScreen = ({ onLogin, theme }: { onLogin: (user: User) => void, theme: ThemeConfig }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) { setError('请输入代号'); return; }
    if (isRegister) {
      const res = AuthManager.register(username);
      if (typeof res === 'string') setError(res); else onLogin(res);
    } else {
      const user = AuthManager.login(username);
      if (user) onLogin(user); else setError('找不到该冒险者，请先注册');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${theme.styles.appBg} ${theme.styles.font}`}>
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
      <div className={`relative z-10 w-full max-w-md ${theme.styles.card} p-8 anim-scale-in`}>
         <div className="text-center mb-8">
            <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center shadow-lg transform rotate-3 mb-4 ${theme.styles.btnPrimary}`}><i className={`fa-solid ${theme.icon} text-4xl`}></i></div>
            <h1 className={`text-3xl font-bold mb-2 ${theme.styles.textMain}`}>冒险者公会</h1>
            <p className={`text-sm ${theme.styles.textSub}`}>专升本勇者 • 档案管理中心</p>
         </div>
         <form onSubmit={handleSubmit} className="space-y-6">
            <div><label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme.styles.textSub}`}>冒险者代号 (Username)</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} className={`w-full border rounded-xl px-4 py-3 focus:outline-none transition-colors ${theme.id === 'stranger' ? 'bg-slate-900 border-red-900 text-red-100 focus:border-red-600' : 'bg-white/50 border-slate-300 text-slate-800 focus:border-indigo-500'}`} placeholder="请输入您的ID..." /></div>
            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm flex items-center animate-pulse"><i className="fa-solid fa-circle-exclamation mr-2"></i> {error}</div>}
            <button type="submit" className={`w-full py-4 font-bold transition-all active:scale-95 ${theme.styles.btnPrimary}`}>{isRegister ? '注册档案 (Sign Up)' : '开启冒险 (Login)'}</button>
         </form>
         <div className="mt-6 text-center"><button onClick={() => { setIsRegister(!isRegister); setError(''); }} className={`text-sm transition-colors underline decoration-dotted ${theme.styles.textSub} hover:brightness-110`}>{isRegister ? '已有档案？直接登录' : '新面孔？注册冒险档案'}</button></div>
      </div>
    </div>
  );
};

const Header = ({ coins, user, onHome, onLogout, isExam, timeLeft, theme, onSwitchTheme, onOpenSettings }: { coins: number, user: User, onHome: () => void, onLogout: () => void, isExam?: boolean, timeLeft?: number, theme: ThemeConfig, onSwitchTheme: () => void, onOpenSettings: () => void }) => (
    <header className={`${isExam ? 'bg-red-900 text-white' : theme.styles.header} shadow-lg sticky top-0 z-50 transition-colors duration-500 ${theme.styles.font}`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div onClick={isExam ? undefined : onHome} className={`flex items-center space-x-2 ${isExam ? 'cursor-default' : 'cursor-pointer hover:opacity-80'} transition-opacity active:scale-95 duration-200`}>
          <div className={`w-8 h-8 ${isExam ? 'bg-white text-red-600 animate-pulse' : 'bg-white/20 backdrop-blur-sm text-current'} rounded-lg flex items-center justify-center shadow-lg transform rotate-3`}><i className={`fa-solid ${isExam ? 'fa-clock' : 'fa-gamepad'} text-sm`}></i></div>
          <h1 className="font-bold text-lg tracking-wide hidden md:block">{isExam ? '仿真模拟考试中...' : '升本大冒险'}</h1>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          {isExam && timeLeft !== undefined && <div className={`font-mono text-xl font-bold ${timeLeft < 60 ? 'text-red-300 animate-pulse' : 'text-white'}`}><i className="fa-regular fa-hourglass-half mr-2"></i>{formatTime(timeLeft)}</div>}
          <div className={`flex items-center rounded-full px-3 md:px-4 py-1.5 border shadow-inner transition-all duration-300 ${isExam ? 'bg-black/10' : 'bg-black/10 border-white/10'}`}><i className={`fa-solid fa-coins text-yellow-400 mr-2`}></i><span className="font-mono font-bold">{coins.toLocaleString()}</span></div>
          <button onClick={onSwitchTheme} className={`h-9 px-4 rounded-full flex items-center gap-2 transition-all active:scale-95 border ${isExam ? 'bg-red-800 border-red-700 hover:bg-red-700' : 'bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-md'}`} title="切换主题">
            <i className="fa-solid fa-shirt text-sm"></i>
            <span className="text-xs font-bold hidden md:inline">换肤</span>
          </button>
          <button onClick={onOpenSettings} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-90" title="数据管理"><i className="fa-solid fa-gear text-xs"></i></button>
          <div className="h-8 w-px bg-current opacity-20 mx-1"></div>
          <div className="flex items-center gap-2">
             <div className="hidden md:flex flex-col items-end"><span className="text-xs opacity-60 font-bold">冒险者</span><span className="text-sm font-bold leading-none">{user.username}</span></div>
             <button onClick={onLogout} className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500/50 flex items-center justify-center transition-all active:scale-90 border border-white/10" title="登出"><i className="fa-solid fa-power-off text-xs"></i></button>
          </div>
        </div>
      </div>
    </header>
);

const DailyTasksBoard = ({ tasks, onClaim, onClose, theme }: { tasks: DailyTask[], onClaim: (id: string) => void, onClose: () => void, theme: ThemeConfig }) => {
    const getDifficultyColor = (diff: TaskDifficulty) => {
        switch(diff) {
            case 'EASY': return 'bg-green-500 text-white';
            case 'NORMAL': return 'bg-blue-500 text-white';
            case 'HARD': return 'bg-orange-500 text-white';
            case 'NIGHTMARE': return 'bg-red-600 text-white shadow-red-500/50 shadow-sm';
            default: return 'bg-slate-500';
        }
    };
    return (
      <div className={`fixed inset-0 z-[70] flex items-center justify-center p-4 ${theme.styles.modalOverlay} fade-in ${theme.styles.font}`}>
        <div className={`${theme.styles.card} w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col anim-scale-in`}>
          <div className={`p-4 flex justify-between items-center shrink-0 border-b ${theme.id === 'stranger' ? 'border-red-900/50' : 'border-slate-100'}`}><div><h3 className={`font-bold text-lg ${theme.styles.textMain}`}><i className="fa-solid fa-clipboard-check mr-2"></i>每日悬赏令</h3><p className={`text-xs ${theme.styles.textSub}`}>完成高难任务，获取丰厚赏金</p></div><button onClick={onClose} className={`${theme.styles.textSub} hover:opacity-80 transition-transform active:scale-90`}><i className="fa-solid fa-xmark text-xl"></i></button></div>
          <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
            {tasks.map(task => {
              const isComplete = task.current >= task.target;
              const progress = Math.min((task.current / task.target) * 100, 100);
              return (
                <div key={task.id} className={`rounded-xl p-3 border relative overflow-hidden group ${theme.id === 'stranger' ? 'bg-slate-900 border-red-900/30' : 'bg-slate-50 border-slate-200'}`}>
                   <div className={`absolute top-0 left-0 px-2 py-0.5 text-[10px] font-bold rounded-br-lg ${getDifficultyColor(task.difficulty)}`}>{task.difficulty}</div>
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex-1 mr-3">
                      <div className="flex justify-between mb-1 items-end"><div><span className={`font-bold text-sm block ${theme.styles.textMain}`}>{task.title}</span><span className={`text-xs block mt-0.5 ${theme.styles.textSub}`}>{task.desc}</span></div><span className={`text-xs font-mono ${isComplete ? 'text-green-500' : theme.styles.textSub}`}>{task.current}/{task.target}</span></div>
                      <div className={`h-1.5 rounded-full overflow-hidden mt-2 ${theme.styles.progressBg}`}><div className={`h-full transition-all duration-500 ${isComplete ? 'bg-green-500' : theme.styles.progressFill}`} style={{ width: `${progress}%` }}></div></div>
                    </div>
                    <button onClick={() => onClaim(task.id)} disabled={!isComplete || task.claimed} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex flex-col items-center justify-center min-w-[70px] active:scale-95 ${task.claimed ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : isComplete ? 'bg-yellow-400 text-black animate-bounce shadow-lg' : 'bg-gray-200 text-gray-400'}`}>{task.claimed ? <span><i className="fa-solid fa-check mr-1"></i>已领</span> : isComplete ? <><span>领取</span><span className="text-[10px] opacity-80">{task.reward} <i className="fa-solid fa-coins"></i></span></> : <><span>进行中</span><span className="text-[10px] opacity-60">+{task.reward} <i className="fa-solid fa-coins"></i></span></>}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
};

const SubjectCard: React.FC<{ subject: Subject, onClick: () => void, theme: ThemeConfig }> = ({ subject, onClick, theme }) => (
  <button onClick={onClick} className={`group relative ${theme.styles.card} text-left h-full flex flex-col overflow-hidden transform hover:-translate-y-1 active:scale-[0.98] transition-all duration-300`}>
    <div className={`h-24 bg-gradient-to-r ${theme.id === 'stranger' ? 'from-red-900 to-black' : subject.gradient} relative overflow-hidden flex items-center justify-center`}>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
         <i className={`fa-solid ${subject.icon} text-4xl text-white opacity-90 group-hover:scale-125 transition-transform duration-500`}></i>
    </div>
    <div className="p-5 flex-1 flex flex-col">
      <h3 className={`font-bold text-lg mb-1 ${theme.styles.textMain}`}>{subject.name}</h3>
      <p className={`text-xs mb-4 line-clamp-2 ${theme.styles.textSub}`}>{subject.desc}</p>
      <div className="mt-auto"><span className={`inline-block text-xs px-2 py-1 rounded font-bold transition-colors ${theme.id === 'stranger' ? 'bg-red-950 text-red-400 group-hover:bg-red-900' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>开始冒险 <i className="fa-solid fa-arrow-right ml-1"></i></span></div>
    </div>
  </button>
);

const CollectionModal = ({ coins, inventory, equippedId, onDraw, onEquip, onClose, theme }: { coins: number, inventory: string[], equippedId: string | null, onDraw: () => Artifact, onEquip: (id: string | null) => void, onClose: () => void, theme: ThemeConfig }) => {
  const [animStage, setAnimStage] = useState<'idle' | 'drop' | 'shake' | 'reveal'>('idle');
  const [reward, setReward] = useState<Artifact | null>(null);
  const [selectedItem, setSelectedItem] = useState<Artifact | null>(null);

  const handleDraw = () => {
    if (coins < GACHA_COST) return;
    setAnimStage('drop');
    // Adjusted timing to match the new 1.2s falling animation
    setTimeout(() => { 
        setAnimStage('shake'); 
        // Shake for 1s then open
        setTimeout(() => { 
            setReward(onDraw()); 
            setAnimStage('reveal'); 
        }, 1200); 
    }, 1200); 
  };
  const resetGacha = () => { setReward(null); setAnimStage('idle'); };

  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center p-4 ${theme.styles.modalOverlay} fade-in ${theme.styles.font}`}>
      <div className="w-full max-w-lg text-center anim-scale-in">
        {animStage !== 'idle' && !reward ? (
          <div className="relative h-64 flex items-center justify-center overflow-hidden">
              {animStage === 'drop' && (
                  <div className="anim-drop z-10">
                      <div className="gacha-capsule">
                          <i className="fa-solid fa-question text-4xl text-white/50"></i>
                      </div>
                  </div>
              )}
              {animStage === 'shake' && (
                  <div className="anim-shake z-10 cursor-pointer" onClick={() => { /* Allow user to click to speed up? logic complex, keep simple for now */ }}>
                      <div className="gacha-capsule">
                          <i className="fa-solid fa-star text-4xl text-white/80 animate-pulse"></i>
                      </div>
                  </div>
              )}
          </div>
        ) : reward ? (
          <div className={`${theme.styles.card} p-8 relative overflow-hidden anim-pop`}>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-full h-full bg-yellow-200/50 anim-burst absolute z-20 pointer-events-none rounded-full blur-3xl"></div></div>
             <div className="relative z-30">
                 <p className="text-yellow-500 font-bold mb-4 tracking-widest text-sm uppercase animate-[fadeIn_1s_ease-out_0.5s_both]">获得新物品</p>
                 <div className="inline-block relative mb-6">
                     <i className={`fa-solid ${reward.icon} text-8xl ${reward.color} drop-shadow-2xl transform hover:scale-110 transition-transform duration-300`}></i>
                     <div className="absolute inset-0 bg-white/30 blur-xl -z-10 animate-pulse"></div>
                 </div>
                 <h2 className={`text-3xl font-bold mb-2 ${theme.styles.textMain}`}>{reward.name}</h2>
                 <span className={`inline-block px-3 py-1 rounded text-xs font-bold mb-4 ${reward.rarity === 'SSR' ? 'bg-yellow-500 text-black shadow-yellow-500/50 shadow-lg' : reward.rarity === 'SR' ? 'bg-purple-600 text-white shadow-purple-600/50 shadow-lg' : 'bg-blue-600 text-white shadow-blue-600/50 shadow-lg'}`}>{reward.rarity}</span>
                 <p className={`mb-2 ${theme.styles.textSub}`}>{reward.desc}</p>
                 <p className="text-green-500 text-sm font-bold mb-8">装备加成: 答对金币 +{reward.bonus}</p>
                 <button onClick={resetGacha} className={`${theme.styles.btnPrimary} px-8 py-3 w-full font-bold active:scale-95`}>收下</button>
             </div>
          </div>
        ) : selectedItem ? (
           <div className={`${theme.styles.card} p-6 relative`}>
             <button onClick={() => setSelectedItem(null)} className={`absolute top-4 right-4 ${theme.styles.textSub} hover:opacity-100 transition-transform active:scale-90`}><i className="fa-solid fa-xmark"></i></button>
             <i className={`fa-solid ${selectedItem.icon} text-6xl ${selectedItem.color} mb-4`}></i>
             <h2 className={`text-2xl font-bold mb-1 ${theme.styles.textMain}`}>{selectedItem.name}</h2>
             <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-4 ${selectedItem.rarity === 'SSR' ? 'bg-yellow-500 text-black' : selectedItem.rarity === 'SR' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>{selectedItem.rarity}</span>
             <p className={`text-sm mb-4 ${theme.styles.textSub}`}>{selectedItem.desc}</p>
             <div className={`rounded-xl p-3 mb-6 ${theme.id === 'stranger' ? 'bg-red-900/20' : 'bg-slate-100'}`}><p className="text-green-500 font-bold text-sm"><i className="fa-solid fa-bolt mr-1"></i> 装备效果</p><p className={`${theme.styles.textSub} text-xs mt-1`}>每次答对题目额外获得 <span className="text-yellow-500 font-bold">+{selectedItem.bonus} 金币</span></p></div>
             <button onClick={() => { if (equippedId === selectedItem.id) onEquip(null); else onEquip(selectedItem.id); setSelectedItem(null); }} className={`w-full py-3 rounded-xl font-bold transition-all active:scale-95 ${equippedId === selectedItem.id ? 'bg-red-600 hover:bg-red-700 text-white' : theme.styles.btnPrimary}`}>{equippedId === selectedItem.id ? '卸下装备' : '装备此神器'}</button>
           </div>
        ) : (
          <div className={`${theme.styles.card} p-6 h-[80vh] flex flex-col`}>
             <div className="flex justify-between items-center mb-6 shrink-0"><div><h2 className={`text-xl font-bold text-left ${theme.styles.textMain}`}>怪奇图鉴</h2><p className={`text-xs text-left ${theme.styles.textSub}`}>收集并装备，获得强力Buff</p></div><button onClick={onClose} className="transition-transform active:scale-90"><i className={`fa-solid fa-xmark text-xl ${theme.styles.textMain}`}></i></button></div>
             <div className="flex-1 overflow-y-auto custom-scrollbar mb-4"><div className="grid grid-cols-3 gap-3">{ARTIFACTS.map(a => { const owned = inventory.includes(a.id); const isEquipped = equippedId === a.id; return (<button key={a.id} onClick={() => owned && setSelectedItem(a)} disabled={!owned} className={`aspect-square rounded-xl flex items-center justify-center flex-col border relative transition-all active:scale-95 ${owned ? `${theme.id === 'stranger' ? 'bg-red-900/10 border-red-900/30' : 'bg-slate-50 border-slate-200'} hover:scale-[1.02]` : 'bg-black/5 border-transparent opacity-40 cursor-not-allowed'}`}>{isEquipped && <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_#22c55e]"></div>}<i className={`fa-solid ${a.icon} text-2xl mb-1 ${owned ? a.color : 'text-slate-400'}`}></i>{owned ? <span className={`text-[10px] truncate w-full px-1 ${theme.styles.textSub}`}>{a.name}</span> : <i className="fa-solid fa-lock text-slate-400 text-xs"></i>}</button>)})}</div></div>
             <div className={`shrink-0 pt-4 border-t ${theme.id === 'stranger' ? 'border-red-900/30' : 'border-slate-100'}`}><button onClick={handleDraw} disabled={coins < GACHA_COST} className={`w-full py-3 font-bold flex flex-col items-center justify-center transition-all active:scale-95 ${coins >= GACHA_COST ? theme.styles.btnPrimary : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}><span className="text-sm">随机召唤</span><span className="text-xs opacity-80 flex items-center mt-0.5"><i className="fa-solid fa-coins mr-1 text-yellow-300"></i> {GACHA_COST}</span></button></div>
          </div>
        )}
      </div>
    </div>
  );
};

const QuizSetupModal = ({ subject, onClose, onStart, theme }: { subject: Subject; onClose: () => void; onStart: (config: QuizConfig) => void, theme: ThemeConfig }) => {
  const [count, setCount] = useState(5);
  const [topic, setTopic] = useState('all');
  const [isExam, setIsExam] = useState(false);

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 ${theme.styles.modalOverlay} fade-in ${theme.styles.font}`}>
      <div className={`${theme.styles.card} w-full max-w-md overflow-hidden transform transition-all scale-100 anim-scale-in`}>
        <div className={`bg-gradient-to-r ${theme.id === 'stranger' ? 'from-red-900 to-black' : subject.gradient} p-6 text-white relative`}>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white transition-transform active:scale-90"><i className="fa-solid fa-xmark text-xl"></i></button>
          <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-md border border-white/20"><i className={`fa-solid ${subject.icon}`}></i></div><div><h3 className="text-xl font-bold">{subject.name}</h3><p className="text-white/80 text-xs font-mono">关卡配置</p></div></div>
        </div>
        <div className="p-6 space-y-6">
          <div className={`flex items-center justify-between p-4 rounded-xl border ${theme.id === 'stranger' ? 'bg-red-900/10 border-red-900/30' : 'bg-slate-50 border-slate-100'}`}>
             <div><span className={`block font-bold ${theme.styles.textMain}`}>仿真模拟考试模式</span><span className={`text-xs ${theme.styles.textSub}`}>限时 • 答题即解析 • 统一交卷</span></div>
             <button onClick={() => setIsExam(!isExam)} className={`w-14 h-8 rounded-full transition-colors relative ${isExam ? 'bg-indigo-600' : 'bg-slate-300'}`}><div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${isExam ? 'translate-x-6' : ''}`}></div></button>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wider mb-3 block ${theme.styles.textSub}`}>关卡长度</label>
            <div className="grid grid-cols-4 gap-3">{[5, 20, 50, 100].map(num => <button key={num} onClick={() => setCount(num)} className={`py-2 rounded-lg font-bold text-sm transition-all border-2 active:scale-95 ${count === num ? `${theme.styles.accent} border-current` : `${theme.styles.textSub} border-transparent bg-black/5 hover:bg-black/10`}`}>{num}</button>)}</div>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wider mb-3 block ${theme.styles.textSub}`}>挑战目标</label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              <button onClick={() => setTopic('all')} className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex justify-between items-center active:scale-[0.98] ${topic === 'all' ? `${theme.styles.accent} border-current` : `${theme.styles.textSub} border-transparent bg-black/5 hover:bg-black/10`}`}><span className="font-medium">综合挑战 (随机)</span>{topic === 'all' && <i className="fa-solid fa-sword"></i>}</button>
              {subject.topics.map(t => <button key={t} onClick={() => setTopic(t)} className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex justify-between items-center active:scale-[0.98] ${topic === t ? `${theme.styles.accent} border-current` : `${theme.styles.textSub} border-transparent bg-black/5 hover:bg-black/10`}`}><span className="font-medium">{t}</span>{topic === t && <i className="fa-solid fa-crosshairs"></i>}</button>)}
            </div>
          </div>
          <button onClick={() => onStart({ questionCount: count, topic, isExam })} className={`w-full py-4 font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 ${theme.styles.btnPrimary}`}><span>{isExam ? '开始考试' : '开始练习'}</span><i className={`fa-solid ${isExam ? 'fa-clock' : 'fa-play'}`}></i></button>
        </div>
      </div>
    </div>
  );
};

const QuizGame = ({ question, qNum, total, onAnswer, onNext, onPrev, onJump, onSubmit, userAnswer, onToggleMistake, isMistake, isExam, allAnswers, equippedArtifact, theme }: any) => {
  const isAnswered = userAnswer !== null;
  const isCorrect = isAnswered && userAnswer === question.correctIndex;
  const [showSheet, setShowSheet] = useState(false);

  return (
    <div className={`max-w-4xl mx-auto px-4 py-6 fade-in pb-24 md:pb-6 ${theme.styles.font}`}>
       <div className="flex justify-between items-center mb-6">
         <div className={`${theme.styles.card} px-4 py-2 font-bold text-sm ${theme.styles.textMain}`}>题号 {qNum} <span className="opacity-40 mx-2">/</span> {total}</div>
         <button onClick={onToggleMistake} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-90 ${isMistake ? 'bg-yellow-400 text-white' : `${theme.styles.card} ${theme.styles.textSub} hover:text-yellow-400`}`}><i className="fa-solid fa-star"></i></button>
       </div>
       <div className={`${theme.styles.card} overflow-hidden relative`}>
          <div className={`h-1.5 w-full ${theme.styles.progressBg}`}><div className={`h-full transition-all duration-300 ${theme.styles.progressFill}`} style={{ width: `${(qNum/total)*100}%` }}></div></div>
          <div className="p-6 md:p-10">
             <h2 className={`text-xl md:text-2xl font-bold leading-relaxed mb-8 ${theme.styles.textMain}`}>{question.question}</h2>
             <div className="space-y-3">
               {question.options.map((opt: string, idx: number) => {
                 let stateClass = `${theme.id === 'stranger' ? 'border-red-900/30 bg-red-900/10 text-red-200' : 'border-slate-100 bg-white text-slate-600'} hover:brightness-95`;
                 if (isAnswered) { 
                    if (idx === question.correctIndex) stateClass = "border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500"; 
                    else if (idx === userAnswer) stateClass = "border-red-500 bg-red-50 text-red-700"; 
                    else stateClass = "opacity-50"; 
                 }
                 return (
                   <button key={idx} disabled={isAnswered} onClick={() => onAnswer(idx)} className={`w-full text-left p-4 rounded-xl border-2 font-medium transition-all duration-200 flex items-center active:scale-[0.99] ${stateClass}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-4 text-sm font-bold border ${isAnswered && idx === question.correctIndex ? (isExam ? 'bg-green-500 border-green-500 text-white' : 'bg-green-500 border-green-500 text-white') : (isAnswered && idx === userAnswer ? 'bg-red-500 border-red-500 text-white' : 'bg-black/5 border-transparent')}`}>{String.fromCharCode(65+idx)}</div>{opt}
                   </button>
                 )
               })}
             </div>
          </div>
          {isAnswered && (
             <div className={`p-6 border-t animate-pulse ${theme.id === 'stranger' ? 'border-red-900/30' : 'border-slate-100'} ${isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <div className="flex items-start gap-3">
                   <div className={`p-2 rounded-lg ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><i className={`fa-solid ${isCorrect ? 'fa-check' : 'fa-xmark'}`}></i></div>
                   <div className="flex-1">
                      <p className={`font-bold mb-1 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{isCorrect ? <span>回答正确! +10 {equippedArtifact && <span className="text-xs bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded ml-2"><i className={`fa-solid ${equippedArtifact.icon}`}></i> 加成 +{equippedArtifact.bonus}</span>}</span> : '回答错误 (已加入错题本)'}</p>
                      <p className={`text-sm leading-relaxed ${theme.styles.textSub}`}>{question.explanation || "暂无详细解析"}</p>
                   </div>
                </div>
             </div>
          )}
       </div>
       <div className="mt-6 flex justify-between items-center gap-4">
          <button onClick={onPrev} disabled={qNum === 1} className={`px-6 py-3 font-bold transition-all active:scale-95 ${theme.styles.btnSecondary} ${qNum === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}><i className="fa-solid fa-arrow-left mr-2"></i> 上一题</button>
          {isExam && <button onClick={() => setShowSheet(true)} className={`px-4 py-3 font-bold shadow-sm md:hidden active:scale-95 ${theme.styles.btnSecondary}`}><i className="fa-solid fa-table-cells"></i></button>}
          {qNum < total ? <button onClick={onNext} disabled={!isExam && !isAnswered} className={`flex-1 md:flex-none px-8 py-3 font-bold transition-all active:scale-95 ${(!isExam && !isAnswered) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : theme.styles.btnPrimary}`}>下一题 <i className="fa-solid fa-arrow-right ml-2"></i></button> : <button onClick={onSubmit} disabled={!isExam && !isAnswered} className={`flex-1 md:flex-none px-8 py-3 font-bold transition-all active:scale-95 ${isExam ? 'bg-red-600 text-white hover:bg-red-700' : theme.styles.btnPrimary}`}>{isExam ? '立即交卷' : '查看结果'} <i className="fa-solid fa-flag-checkered ml-2"></i></button>}
       </div>
       {isExam && (
         <div className={`fixed bottom-0 left-0 right-0 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] rounded-t-3xl z-40 transition-transform duration-300 ${theme.styles.card} ${showSheet ? 'translate-y-0' : 'translate-y-full md:translate-y-0 md:relative md:bg-transparent md:shadow-none md:mt-8'}`}>
            <div className="p-6">
                <div className="flex justify-between items-center mb-4 md:hidden"><h3 className={`font-bold ${theme.styles.textMain}`}>答题卡</h3><button onClick={() => setShowSheet(false)} className={theme.styles.textSub}><i className="fa-solid fa-chevron-down"></i></button></div>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-3">{allAnswers.map((ans: number | null, i: number) => <button key={i} onClick={() => { onJump(i); setShowSheet(false); }} className={`w-10 h-10 rounded-lg font-bold text-sm border-2 transition-all active:scale-90 ${i + 1 === qNum ? 'border-indigo-600 text-indigo-600 ring-2 ring-indigo-100' : ans !== null ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-slate-400'}`}>{i + 1}</button>)}</div>
            </div>
         </div>
       )}
    </div>
  );
};

const ResultView = ({ score, total, rewards, onHome, theme }: any) => (
  <div className={`min-h-[80vh] flex items-center justify-center p-4 fade-in ${theme.styles.font}`}>
     <div className={`${theme.styles.card} p-8 md:p-12 text-center max-w-lg w-full relative overflow-hidden anim-scale-in`}>
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
        <div className="mb-6 inline-block relative">
           <i className="fa-solid fa-crown text-6xl text-yellow-400 drop-shadow-md animate-bounce"></i>
           <div className={`absolute -bottom-2 -right-2 text-white text-xs font-bold px-2 py-1 rounded-full ${theme.styles.btnPrimary}`}>得分</div>
        </div>
        <h2 className={`text-4xl font-black mb-2 ${theme.styles.textMain}`}>{score} / {total}</h2>
        <p className={`mb-8 font-medium ${theme.styles.textSub}`}>挑战完成!</p>
        <div className={`rounded-2xl p-6 mb-8 border ${theme.id === 'stranger' ? 'bg-red-900/10 border-red-900/30' : 'bg-slate-50 border-slate-100'}`}>
           <p className={`text-xs font-bold uppercase tracking-wider mb-4 ${theme.styles.textSub}`}>获得战利品</p>
           <div className="flex justify-center gap-4"><div className="flex flex-col items-center"><div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-500 mb-2 shadow-sm"><i className="fa-solid fa-coins"></i></div><span className={`font-bold ${theme.styles.textMain}`}>+{rewards}</span></div></div>
        </div>
        <button onClick={onHome} className={`w-full py-4 font-bold transition-transform active:scale-95 ${theme.styles.btnPrimary}`}>返回大厅</button>
     </div>
  </div>
);

// --- Main App Logic ---

const GameWorld: React.FC<{ user: User, onLogout: () => void, theme: ThemeConfig, onSwitchTheme: () => void, onOpenSettings: () => void }> = ({ user, onLogout, theme, onSwitchTheme, onOpenSettings }) => {
  const [view, setView] = useState<GameState>('home');
  const [coins, setCoins] = useState(DataManager.getCoins(user.id));
  const [tasks, setTasks] = useState(DataManager.getTasks(user.id));
  const [inventory, setInventory] = useState(DataManager.getInventory(user.id));
  const [equippedId, setEquippedId] = useState(DataManager.getEquipped(user.id));
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]); 
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<(number|null)[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>('ai');
  const [showSetup, setShowSetup] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showGacha, setShowGacha] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isExamMode, setIsExamMode] = useState(false);
  const [examTimeLeft, setExamTimeLeft] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Achievement State
  const [userStats, setUserStats] = useState<UserStats>(DataManager.getUserStats(user.id));
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(DataManager.getUnlockedAchievements(user.id));
  const [newUnlock, setNewUnlock] = useState<Achievement | null>(null);

  // Revenge Mode State
  const [revengeSubject, setRevengeSubject] = useState<Subject | null>(null);
  const [showRevengeSetup, setShowRevengeSetup] = useState(false);

  useEffect(() => {
    setCoins(DataManager.getCoins(user.id));
    setTasks(DataManager.getTasks(user.id));
    setInventory(DataManager.getInventory(user.id));
    setEquippedId(DataManager.getEquipped(user.id));
    setMistakes(DataManager.getMistakes(user.id));
    setUserStats(DataManager.getUserStats(user.id));
    setUnlockedAchievements(DataManager.getUnlockedAchievements(user.id));
    
    if (!DataManager.isTutorialDone(user.id)) { setTimeout(() => setShowTutorial(true), 1000); }
  }, [user.id]);

  const handleTutorialComplete = () => { DataManager.markTutorialDone(user.id); setShowTutorial(false); };

  // Achievement Check Helper
  const checkAndUnlock = (type: Achievement['conditionType'], value: number) => {
    const relevant = ACHIEVEMENTS_DATA.filter(a => a.conditionType === type && !unlockedAchievements.includes(a.id));
    let didUnlock = false;
    relevant.forEach(ach => {
      if (value >= ach.targetValue) {
        if (DataManager.unlockAchievement(user.id, ach.id)) {
           setNewUnlock(ach);
           didUnlock = true;
           // Auto-hide toast
           setTimeout(() => setNewUnlock(null), 4000);
        }
      }
    });
    if (didUnlock) setUnlockedAchievements(DataManager.getUnlockedAchievements(user.id));
  };
  
  // Coin Check
  useEffect(() => {
     checkAndUnlock('total_coins', coins);
  }, [coins]);

  useEffect(() => {
      if (view === 'quiz' && isExamMode && examTimeLeft > 0) {
          timerRef.current = window.setInterval(() => {
              setExamTimeLeft(prev => {
                  if (prev <= 1) { handleExamSubmit(); return 0; }
                  return prev - 1;
              });
          }, 1000);
      }
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view, isExamMode, examTimeLeft]);

  const handleStart = async (config: QuizConfig, overrideSubject: Subject | null = null) => {
    // Determine active subject, favoring override (Revenge Mode)
    const activeSubject = overrideSubject || subject;
    
    if (!activeSubject) return;
    
    // CRITICAL FIX: Force update global subject state if we are using an override.
    // This ensures QuizGame and subsequent logic have the correct subject context.
    if (overrideSubject && subject?.id !== overrideSubject.id) {
        setSubject(overrideSubject);
    }
    
    setShowSetup(false);
    setShowRevengeSetup(false); 
    setView('loading');
    setLoadingMsg(config.topic === 'revenge' ? 'AI 正在分析错题并生成复仇计划...' : (dataSource === 'ai' ? 'AI 正在生成专属试炼...' : '正在读取题库档案...'));
    setIsExamMode(config.isExam);
    let newTasks = DataManager.updateTaskProgress(user.id, 'quiz', 1);
    newTasks = DataManager.updateTaskProgress(user.id, 'scholar', 1);
    setTasks(newTasks);
    setCurrentStreak(0);
    try {
      const qs = (dataSource === 'bank' && config.topic !== 'revenge') ? await fetchQuestionsFromBank(activeSubject, config) : await fetchQuestionsFromAI(activeSubject, config);
      if(!qs.length) throw new Error("No quest data found.");
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null));
      setQIndex(0);
      if (config.isExam) setExamTimeLeft(qs.length * 120); 
      setView('quiz');
    } catch { setView('error'); }
  };

  const handleReviewStart = (subjectId: string) => {
      const subjectMistakes = mistakes.filter(m => m.subjectId === subjectId);
      if (subjectMistakes.length === 0) return;
      const sub = SUBJECTS.find(s => s.id === subjectId);
      if (sub) setSubject(sub);
      setQuestions(subjectMistakes);
      setAnswers(new Array(subjectMistakes.length).fill(null));
      setQIndex(0);
      setIsExamMode(false);
      setView('quiz');
  };

  const handleRevengeStart = (count: number) => {
      if (!revengeSubject) return;
      setSubject(revengeSubject);
      const subjectMistakes = mistakes.filter(m => m.subjectId === revengeSubject.id);
      
      // Prepare context: take last 10 mistakes to avoid huge prompt
      const contextData = subjectMistakes.length > 0 
          ? subjectMistakes.slice(0, 10).map((m, i) => `${i+1}. ${m.question} (Answer: ${m.options[m.correctIndex]})`).join('\n')
          : "General difficult questions";
      
      handleStart({
          questionCount: count,
          topic: 'revenge',
          isExam: false,
          contextData: contextData
      }, revengeSubject);
  };

  const handleAnswer = (idx: number) => {
    const newAns = [...answers];
    newAns[qIndex] = idx;
    setAnswers(newAns);
    
    const isCorrect = idx === questions[qIndex].correctIndex;
    let newTasks = tasks;
    
    // Update Stats
    const statsUpdate: Partial<UserStats> = { 
        totalAnswered: userStats.totalAnswered + 1 
    };

    if (isCorrect) {
      let reward = 10;
      if (equippedId) {
          const artifact = ARTIFACTS.find(a => a.id === equippedId);
          if (artifact) reward += artifact.bonus;
      }
      const newTotal = DataManager.addCoins(user.id, reward);
      setCoins(newTotal);
      newTasks = DataManager.updateTaskProgress(user.id, 'correct', 1);
      const nextStreak = currentStreak + 1;
      setCurrentStreak(nextStreak);
      newTasks = DataManager.updateTaskProgress(user.id, 'streak', nextStreak, true); 
      
      // Stat update for correct
      statsUpdate.totalCorrect = userStats.totalCorrect + 1;
      statsUpdate.maxStreak = Math.max(userStats.maxStreak, nextStreak);
    } else {
      if (subject) { 
         DataManager.saveMistake(user.id, subject.id, questions[qIndex]);
         setMistakes(DataManager.getMistakes(user.id));
      }
      setCurrentStreak(0);
    }
    setTasks(newTasks);
    
    // Persist and Check Stats
    const newStats = DataManager.updateUserStats(user.id, statsUpdate);
    setUserStats(newStats);
    
    // Check specific achievements
    checkAndUnlock('total_answered', newStats.totalAnswered);
    if(isCorrect) checkAndUnlock('total_correct', newStats.totalCorrect);
    if(isCorrect) checkAndUnlock('streak_record', newStats.maxStreak);
  };

  const handleExamSubmit = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setView('result');
  };

  const handleClaimTask = (id: string) => {
    const reward = DataManager.claimTaskReward(user.id, id);
    if (reward > 0) {
      const newTotal = DataManager.addCoins(user.id, reward);
      setCoins(newTotal);
      setTasks(DataManager.getTasks(user.id));
    }
  };

  const handleGachaDraw = (): Artifact => {
    const newCoins = DataManager.addCoins(user.id, -GACHA_COST);
    setCoins(newCoins);
    const randomItem = ARTIFACTS[Math.floor(Math.random() * ARTIFACTS.length)];
    DataManager.addToInventory(user.id, randomItem.id);
    setInventory(DataManager.getInventory(user.id));
    return randomItem;
  };

  const handleEquip = (id: string | null) => { DataManager.setEquipped(user.id, id); setEquippedId(id); };
  const getScore = () => answers.filter((a, i) => a === questions[i].correctIndex).length;
  const getEquippedArtifact = () => ARTIFACTS.find(a => a.id === equippedId);

  return (
    <div className={`min-h-screen ${theme.styles.appBg} ${theme.styles.font} transition-colors duration-500`}>
      <Header coins={coins} user={user} onHome={() => setView('home')} onLogout={onLogout} isExam={view === 'quiz' && isExamMode} timeLeft={examTimeLeft} theme={theme} onSwitchTheme={onSwitchTheme} onOpenSettings={onOpenSettings} />
      {showSetup && subject && <QuizSetupModal subject={subject} onClose={() => setShowSetup(false)} onStart={(cfg) => handleStart(cfg)} theme={theme} />}
      {showRevengeSetup && revengeSubject && <RevengeSetupModal subject={revengeSubject} mistakeCount={mistakes.filter(m => m.subjectId === revengeSubject.id).length} onClose={() => setShowRevengeSetup(false)} onStart={handleRevengeStart} theme={theme} />}
      {showTasks && <DailyTasksBoard tasks={tasks} onClaim={handleClaimTask} onClose={() => setShowTasks(false)} theme={theme} />}
      {showGacha && <CollectionModal coins={coins} inventory={inventory} equippedId={equippedId} onDraw={handleGachaDraw} onEquip={handleEquip} onClose={() => setShowGacha(false)} theme={theme} />}
      {showAchievements && <AchievementModal stats={userStats} unlockedIds={unlockedAchievements} onClose={() => setShowAchievements(false)} theme={theme} />}
      {newUnlock && <AchievementToast achievement={newUnlock} theme={theme} />}
      {showTutorial && <TutorialOverlay theme={theme} onComplete={handleTutorialComplete} steps={[{ targetId: null, title: '欢迎加入公会！', text: '你好，冒险者！让我来教你如何在这个世界生存并高分通过专升本试炼。' }, { targetId: 'btn-tasks', title: '赏金任务', text: '点击这里查看每日任务。完成任务可以获得大量金币！' }, { targetId: 'btn-gacha', title: '神秘商店', text: '使用金币抽取和购买强力装备。装备能提供答题金币加成BUFF！' }, { targetId: 'section-subjects', title: '开始试炼', text: '选择一个学科地图开始刷题。祝你好运，冒险者！' }]} />}

      <main className="max-w-7xl mx-auto p-4 lg:p-8">
        {view === 'home' && (
          <div className="fade-in">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className={`lg:col-span-2 ${theme.styles.card} p-6 relative overflow-hidden flex flex-col justify-between`}>
                   <div className="absolute right-0 top-0 w-32 h-32 bg-yellow-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
                   <div>
                      <h2 className={`text-2xl font-bold mb-1 ${theme.styles.textMain}`}>欢迎回来, {user.username}</h2>
                      <div className="flex items-center gap-2 mb-6">
                          <p className={theme.styles.textSub}>准备好迎接今天的挑战了吗？</p>
                          {equippedId && <div className={`px-3 py-1 rounded-full flex items-center gap-2 border shadow-sm ${theme.id === 'stranger' ? 'bg-red-900/20 border-red-900/50' : 'bg-slate-100 border-slate-200'}`}>{(() => { const a = ARTIFACTS.find(i => i.id === equippedId); return a ? <><i className={`fa-solid ${a.icon} ${a.color}`}></i><span className={`text-xs font-bold ${theme.styles.textMain}`}>{a.name}</span><span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">+{a.bonus}金币</span></> : null; })()}</div>}
                      </div>
                      <div className="flex gap-3">
                         <button onClick={() => setDataSource('ai')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors active:scale-95 ${dataSource === 'ai' ? theme.styles.btnPrimary : theme.styles.btnSecondary}`}><i className="fa-solid fa-bolt mr-2"></i>AI 模式</button>
                         <button onClick={() => setDataSource('bank')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors active:scale-95 ${dataSource === 'bank' ? theme.styles.btnPrimary : theme.styles.btnSecondary}`}><i className="fa-solid fa-database mr-2"></i>题库模式</button>
                      </div>
                   </div>
                </div>
                <div className="space-y-4">
                   {(() => {
                       const completedTasks = tasks.filter(t => t.current >= t.target).length;
                       const hasClaimable = tasks.some(t => !t.claimed && t.current >= t.target);
                       const progress = (completedTasks / tasks.length) * 100;
                       
                       return (
                         <button id="btn-tasks" onClick={() => setShowTasks(true)} className={`w-full relative overflow-hidden p-4 rounded-xl shadow-md hover:scale-[1.02] transition-all active:scale-95 flex flex-col justify-between group ${hasClaimable ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white border-2 border-yellow-200 ring-4 ring-orange-200/50' : `${theme.styles.card} border-l-4 border-l-orange-400`}`}>
                            {hasClaimable && <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -mr-8 -mt-8"></div>}
                            <div className="flex items-center justify-between w-full relative z-10 mb-2">
                                <div className="flex items-center">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 shadow-sm ${hasClaimable ? 'bg-white text-orange-500' : 'bg-orange-100 text-orange-500'}`}>
                                        <i className={`fa-solid fa-scroll text-lg ${hasClaimable ? 'animate-bounce' : ''}`}></i>
                                    </div>
                                    <div className="text-left">
                                        <span className={`font-bold block text-sm ${hasClaimable ? 'text-white' : theme.styles.textMain}`}>每日悬赏令</span>
                                        <span className={`text-[10px] font-medium ${hasClaimable ? 'text-white/90' : theme.styles.textSub}`}>
                                            {hasClaimable ? '有赏金待领取！' : `今日进度 ${completedTasks}/${tasks.length}`}
                                        </span>
                                    </div>
                                </div>
                                {hasClaimable ? (
                                     <div className="bg-white text-orange-600 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm animate-pulse flex items-center"><i className="fa-solid fa-gift mr-1"></i>领奖</div>
                                ) : (
                                     <div className={`text-xs font-mono font-bold opacity-50 ${theme.styles.textMain}`}>{Math.round(progress)}%</div>
                                )}
                            </div>
                            <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-1000 ${hasClaimable ? 'bg-white' : 'bg-orange-400'}`} style={{ width: `${progress}%` }}></div>
                            </div>
                         </button>
                       );
                   })()}
                   
                   <button onClick={() => setShowAchievements(true)} className={`w-full ${theme.styles.card} p-4 hover:scale-[1.02] transition-transform flex items-center justify-between active:scale-95`}><div className={`flex items-center ${theme.styles.textMain}`}><i className="fa-solid fa-trophy text-2xl mr-3 text-orange-400"></i><span className="font-bold">成就勋章</span></div>{unlockedAchievements.length > 0 && <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded">{unlockedAchievements.length}</span>}</button>
                   <button onClick={onSwitchTheme} className={`w-full ${theme.styles.card} p-4 hover:scale-[1.02] transition-transform flex items-center justify-between active:scale-95`}>
                     <div className={`flex items-center ${theme.styles.textMain}`}>
                       <i className="fa-solid fa-shirt text-2xl mr-3 text-purple-400"></i>
                       <span className="font-bold">主题装扮</span>
                     </div>
                     <span className={`text-xs px-2 py-1 rounded ${theme.styles.textSub} bg-gray-100`}>{theme.name.split(' ')[0]}</span>
                   </button>
                   <button id="btn-gacha" onClick={() => setShowGacha(true)} className={`w-full ${theme.styles.card} p-4 hover:scale-[1.02] transition-transform flex items-center justify-between active:scale-95`}><div className={`flex items-center ${theme.styles.textMain}`}><i className="fa-solid fa-book-skull text-2xl mr-3 text-yellow-500"></i><span className="font-bold">怪奇图鉴</span></div><span className={`text-xs px-2 py-1 rounded ${theme.id === 'stranger' ? 'bg-red-900/30 text-red-400' : 'bg-slate-100 text-slate-500'}`}>装备/商店</span></button>
                   <button onClick={() => setView('mistake-home')} className={`w-full ${theme.styles.card} p-4 hover:scale-[1.02] transition-transform flex items-center justify-between active:scale-95`}><div className={`flex items-center ${theme.styles.textMain}`}><i className="fa-solid fa-book-open text-xl mr-3 text-red-400"></i><span className="font-bold">错题本</span></div></button>
                </div>
             </div>
             <h3 className={`font-bold text-sm uppercase tracking-wider mb-4 ${theme.styles.textSub}`}>选择冒险地图</h3>
             <div id="section-subjects" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{SUBJECTS.map(s => <SubjectCard key={s.id} subject={s} onClick={() => { setSubject(s); setShowSetup(true); }} theme={theme} />)}</div>
          </div>
        )}

        {view === 'loading' && <div className="flex flex-col items-center justify-center h-[60vh] fade-in"><div className="w-20 h-20 border-8 border-current border-t-transparent rounded-full animate-spin mb-8 opacity-50"></div><h2 className={`text-2xl font-bold animate-pulse ${theme.styles.textMain}`}>{loadingMsg}</h2></div>}

        {view === 'quiz' && (
          <QuizGame 
            question={questions[qIndex]} qNum={qIndex + 1} total={questions.length} 
            onAnswer={handleAnswer} userAnswer={answers[qIndex]}
            onNext={() => { if(qIndex < questions.length - 1) setQIndex(qIndex + 1); else if(isExamMode) handleExamSubmit(); else setView('result'); }}
            onPrev={() => { if(qIndex > 0) setQIndex(qIndex - 1); }}
            onJump={(idx: number) => setQIndex(idx)}
            onSubmit={handleExamSubmit}
            onToggleMistake={() => {
              if (subject) {
                 const currentQ = questions[qIndex];
                 const isMistake = mistakes.some(m => m.question === currentQ.question);
                 if (isMistake) { 
                     DataManager.removeMistake(user.id, currentQ.question); 
                     const newTasks = DataManager.updateTaskProgress(user.id, 'necromancer', 1); 
                     setTasks(newTasks); 
                     
                     // Stat update for cleanup
                     const newStats = DataManager.updateUserStats(user.id, { mistakesCleared: userStats.mistakesCleared + 1 });
                     setUserStats(newStats);
                     checkAndUnlock('mistakes_cleared', newStats.mistakesCleared);
                 } 
                 else { DataManager.saveMistake(user.id, subject.id, currentQ); }
                 setMistakes(DataManager.getMistakes(user.id));
              }
            }}
            isMistake={mistakes.some(m => m.question === questions[qIndex].question)}
            isExam={isExamMode}
            allAnswers={answers}
            equippedArtifact={getEquippedArtifact()}
            theme={theme}
          />
        )}

        {view === 'result' && <ResultView score={getScore()} total={questions.length} rewards={getScore() * 10} onHome={() => setView('home')} theme={theme} />}

        {view === 'mistake-home' && (
          <div className="fade-in">
            <button onClick={() => setView('home')} className={`mb-6 flex items-center transition-transform active:scale-95 ${theme.styles.textSub} hover:opacity-100`}><i className="fa-solid fa-arrow-left mr-2"></i> 返回大厅</button>
            <div className={`${theme.styles.card} p-8 text-center`}>
               <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 text-3xl"><i className="fa-solid fa-skull-crossbones"></i></div>
               <h2 className={`text-2xl font-bold mb-2 ${theme.styles.textMain}`}>错题墓地</h2>
               <p className={`mb-6 ${theme.styles.textSub}`}>点击科目开始复习。复活它们（掌握）可以消除记录。</p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">{SUBJECTS.map(s => { const count = mistakes.filter(m => m.subjectId === s.id).length; return (
                <div key={s.id} className={`w-full border p-4 rounded-xl flex flex-col gap-3 transition-all ${theme.id === 'stranger' ? 'border-red-900/30 hover:bg-red-900/20' : 'border-slate-200 hover:bg-red-50 hover:border-red-200'} ${count === 0 ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-center w-full">
                         <div className="flex items-center"><i className={`fa-solid ${s.icon} mr-3 opacity-50 ${theme.styles.textMain}`}></i><span className={`font-bold ${theme.styles.textMain}`}>{s.name}</span></div>
                         <div className="flex items-center"><span className="font-mono text-red-500 font-bold mr-3">{count}</span></div>
                    </div>
                    {count > 0 && (
                        <div className="flex gap-2 w-full">
                            <button onClick={() => handleReviewStart(s.id)} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${theme.styles.textSub} hover:bg-black/5`}>普通复习</button>
                            <button onClick={() => { setRevengeSubject(s); setShowRevengeSetup(true); }} className={`flex-1 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-sm flex items-center justify-center gap-1`}><span>复仇之战</span><i className="fa-solid fa-skull"></i></button>
                        </div>
                    )}
                </div>
               )})}</div>
            </div>
          </div>
        )}
        
        {view === 'error' && <div className="text-center pt-20"><i className="fa-solid fa-triangle-exclamation text-6xl text-red-500 mb-4"></i><h2 className={`text-2xl font-bold mb-4 ${theme.styles.textMain}`}>副本加载失败</h2><button onClick={() => setView('home')} className={`px-6 py-2 font-bold ${theme.styles.btnPrimary}`}>返回大厅</button></div>}
      </main>
    </div>
  );
};

// --- App Controller ---
const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>('default');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const savedTheme = localStorage.getItem('zsb_theme') as ThemeId;
    if (savedTheme && THEMES[savedTheme]) { setCurrentThemeId(savedTheme); }
  }, []);

  const handleSwitchTheme = (id: ThemeId) => { setCurrentThemeId(id); localStorage.setItem('zsb_theme', id); };
  const theme = THEMES[currentThemeId];

  if (!currentUser) { return <AuthScreen onLogin={setCurrentUser} theme={theme} />; }

  return (
    <>
      <GameWorld key={refreshKey} user={currentUser} onLogout={() => setCurrentUser(null)} theme={theme} onSwitchTheme={() => setShowThemeModal(true)} onOpenSettings={() => setShowDataModal(true)} />
      {showThemeModal && <ThemeSwitcherModal currentThemeId={currentThemeId} onSelect={handleSwitchTheme} onClose={() => setShowThemeModal(false)} theme={theme} />}
      {showDataModal && <DataSettingsModal user={currentUser} onClose={() => setShowDataModal(false)} theme={theme} onReload={() => setRefreshKey(k => k + 1)} />}
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);