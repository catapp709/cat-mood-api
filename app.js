/* ============================================================
   app.js — 交互与渲染（录音状态机 / hash 路由 / 三页渲染）
   数据只经过 api.js 存根层，禁止直接读写 DB。
   ============================================================ */
'use strict';

/* ---------- Lucide 内联图标（24 viewBox, stroke 1.8, currentColor） ---------- */
const ICONS = {
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  square: '<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  cat: '<path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"/><path d="M8 14v.5"/><path d="M16 14v.5"/><path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  bone: '<path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z"/>',
  'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  sparkles: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
  'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'
};
const icon = (n, s = 22) =>
  `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- 工具 ---------- */
const $ = id => document.getElementById(id);
const moodOf = key => DB.moods.find(m => m.key === key);
/* 语义色 hex → 10% 透明度底色（图标砖/徽标用） */
const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/* ---------- 全局状态 ---------- */
const state = { tab: 'record', rec: 'idle', t0: 0, raf: 0, result: null, saving: false, cat: null };

/* ---------- Toast（1.8s 自动消失） ---------- */
let toastTimer = 0;
function toast(msg) {
  $('toastText').textContent = msg;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 1800);
}

/* ---------- Hash 路由（recording/analyzing 中锁定导航） ---------- */
const TABS = ['record', 'history', 'cat'];
function route() {
  const h = (location.hash || '#/record').replace('#/', '');
  const target = TABS.includes(h) ? h : 'record';
  if ((state.rec === 'recording' || state.rec === 'analyzing') && target !== state.tab) {
    location.hash = '#/' + state.tab; // 录音/识别中禁止切走，退回当前页
    toast('正在识别喵声，先完成当前录音');
    return;
  }
  state.tab = target;
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.dataset.page === target));
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.nav === target));
  if (target === 'history') renderHistory();
  if (target === 'cat') renderCat();
}
window.addEventListener('hashchange', route);

document.querySelectorAll('.tab').forEach(b =>
  b.addEventListener('click', () => { location.hash = '#/' + b.dataset.nav; }));
document.querySelectorAll('[data-nav-go]').forEach(b =>
  b.addEventListener('click', () => { location.hash = '#/' + b.dataset.navGo; }));

/* ---------- 录音状态机：idle → recording → analyzing → result ---------- */
const stage = $('stage'), recBtn = $('recBtn'), timerEl = $('timer');
const fmt = s => {
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(Math.floor(s % 60)).padStart(2, '0');
  return `${mm}:${ss}.${Math.floor((s % 1) * 10)}`;
};
function tick() {
  timerEl.textContent = fmt((performance.now() - state.t0) / 1000);
  state.raf = requestAnimationFrame(tick);
}

/* ---------- 真实录音（MediaRecorder） ---------- */
let mediaRecorder = null, mediaStream = null, recChunks = [];

/* 按浏览器支持度挑格式：优先 mp3/wav，兜底 webm/ogg */
function pickMime() {
  const cands = ['audio/mp3', 'audio/wav', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
  return cands.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

async function startRec() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    toast('当前浏览器不支持录音，请用最新版 Chrome / Edge / Safari');
    return;
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    toast('麦克风权限被拒绝，请在浏览器地址栏允许后重试');
    return;
  }
  const mime = pickMime();
  recChunks = [];
  mediaRecorder = new MediaRecorder(mediaStream, mime ? { mimeType: mime } : undefined);
  mediaRecorder.addEventListener('dataavailable', e => { if (e.data && e.data.size) recChunks.push(e.data); });
  mediaRecorder.start();
  state.rec = 'recording';
  stage.classList.add('is-recording');
  stage.classList.remove('is-analyzing');
  state.t0 = performance.now();
  cancelAnimationFrame(state.raf);
  tick();
}

function stopAndAnalyze() {
  cancelAnimationFrame(state.raf);
  state.rec = 'analyzing';
  stage.classList.remove('is-recording');
  stage.classList.add('is-analyzing');
  if (!mediaRecorder) { resetStage(); return; }
  mediaRecorder.addEventListener('stop', () => {
    const blob = new Blob(recChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
    releaseMic();
    runAnalysis(blob);
  }, { once: true });
  mediaRecorder.stop();
}

function releaseMic() {
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
  mediaStream = null;
  mediaRecorder = null;
}

/* ---------- 情绪识别（策略模式统一入口，前端只依赖 EmotionService） ---------- */
async function runAnalysis(blob) {
  openStreamSheet();
  let result;
  try {
    /* 唯一调用点：EmotionService 内部已处理供应商选择 + 失败兜底，永不 reject */
    result = await EmotionService.analyzeAudio(blob);
  } catch (e) {
    /* 双保险：万一 EmotionService 内部异常，也不让页面白屏 */
    failStream(e.message || '识别失败，请再试一次');
    return;
  }

  /* 用情绪标签取颜色（契约不含颜色，UI 层本地映射） */
  const color = colorOfEmotion(result.emotion);
  const brick = $('moodIcon');
  brick.style.setProperty('--c', color);
  brick.style.setProperty('--cb', hexA(color, .12));
  $('moodName').textContent = result.emotion;
  $('moodDesc').textContent = `置信度 ${result.confidence}% · ${result.provider}`;
  const badge = $('confBadge');
  badge.style.setProperty('--c', color);
  badge.style.setProperty('--cb', hexA(color, .12));
  badge.textContent = result.confidence + '%';
  $('confBadge').style.display = '';
  $('confBlock').style.display = '';
  /* 新契约无次级预测，清空该区域 */
  $('subPoss').innerHTML = '';

  /* 建议回应：优先用供应商的 translation，置信度低时追加提示 */
  const reply = result.confidence >= 60
    ? result.translation
    : `${result.translation}（置信度偏低，建议再录一次）`;
  finishStream(reply);
  state.result = { moodKey: result.emotion, conf: result.confidence, reply };
}

function resetStage() {
  state.rec = 'idle';
  stage.classList.remove('is-recording', 'is-analyzing');
  timerEl.textContent = '00:00.0';
}
recBtn.addEventListener('click', () => {
  if (state.rec === 'idle') startRec();
  else if (state.rec === 'recording') stopAndAnalyze();
  // analyzing 中按钮禁用（CSS pointer-events:none 双保险）
});

/* ---------- 流式结果 Sheet：先"正在聆听…"，再逐字追加 ---------- */
let streamStarted = false;
function openStreamSheet() {
  const brick = $('moodIcon');
  brick.style.setProperty('--c', '#E87B4F');
  brick.style.setProperty('--cb', 'rgba(232,123,79,.12)');
  brick.innerHTML = icon('cat', 24);
  $('moodName').textContent = '喵声分析';
  $('moodDesc').textContent = 'AI · 情绪识别';
  $('confBadge').style.display = 'none';
  $('confBlock').style.display = 'none';
  $('replyTag').textContent = '分析结果';
  const p = $('replyText');
  p.classList.remove('err');
  p.classList.add('streaming');
  p.textContent = '正在聆听…';
  streamStarted = false;
  state.result = null;
  $('sheetMask').classList.add('open');
  $('sheet').classList.add('open');
}
function paintStream(acc) {
  const p = $('replyText');
  if (!streamStarted) { p.textContent = ''; streamStarted = true; } // 清掉"正在聆听…"
  p.textContent = acc;
}
function finishStream(acc) {
  $('replyText').classList.remove('streaming');
  state.rec = 'result';
  state.result = { reply: acc.trim() };
}
function failStream(msg) {
  const p = $('replyText');
  p.classList.remove('streaming');
  p.classList.add('err');
  p.textContent = msg;
  $('moodName').textContent = '识别失败';
  state.rec = 'result';
  state.result = null; // 失败结果不允许保存
  toast(msg);
}
function closeSheet() {
  $('sheetMask').classList.remove('open');
  $('sheet').classList.remove('open');
  resetStage();
}
$('sheetMask').addEventListener('click', closeSheet);
$('retryBtn').addEventListener('click', () => { closeSheet(); setTimeout(startRec, 380); });
$('saveBtn').addEventListener('click', async () => {
  if (state.saving) return;
  if (!state.result) { toast('还没有可保存的分析结果'); return; }
  state.saving = true;
  await saveRecord(state.result);
  state.saving = false;
  closeSheet();
  toast('已存入历史');
});
/* ---------- 历史页渲染 ---------- */
async function renderHistory() {
  const { data } = await fetchHistory();
  const wrap = $('histWrap'), empty = $('histEmpty');
  if (!data.length) {
    wrap.innerHTML = ''; wrap.hidden = true; empty.hidden = false;
    return;
  }
  wrap.hidden = false; empty.hidden = true;
  /* 按 GROUP_ORDER 分组；未列入的组兜底追加 */
  const groups = [];
  GROUP_ORDER.forEach(g => {
    const arr = data.filter(r => r.group === g);
    if (arr.length) groups.push([g, arr]);
  });
  [...new Set(data.filter(r => !GROUP_ORDER.includes(r.group)).map(r => r.group))]
    .forEach(g => groups.push([g, data.filter(r => r.group === g)]));
  wrap.innerHTML = groups.map(([g, arr]) => `
    <div class="hist-group">
      <div class="hist-date">${g}</div>
      ${arr.map(r => {
        const m = moodOf(r.moodKey) || { name: '喵声分析', color: '#E87B4F', icon: 'cat' }; // 真实 API 记录无情绪分类时的兜底
        return `<div class="hist-item" style="--c:${m.color};--cb:${hexA(m.color, .12)}">
          <div class="hist-brick">${icon(m.icon, 20)}</div>
          <div class="hist-mid">
            <div class="hist-top"><span class="hist-mood">${m.name}</span><span class="hist-conf">${r.conf != null ? r.conf + '%' : 'AI'}</span></div>
            <div class="hist-reply">${r.reply}</div>
          </div>
          <div class="hist-right">
            <span class="hist-time">${r.time}</span>
            <button class="hist-del" data-del="${r.id}" aria-label="删除这条记录">${icon('x', 13)}</button>
          </div>
        </div>`;
      }).join('')}
    </div>`).join('');
}
/* 事件委托：删除 + 点按显示删除钮 */
$('histWrap').addEventListener('click', async e => {
  const del = e.target.closest('[data-del]');
  if (del) {
    e.stopPropagation();
    const item = del.closest('.hist-item');
    item.classList.add('removing');
    await deleteRecord(del.dataset.del);
    setTimeout(renderHistory, 240);
    toast('已删除这条记录');
    return;
  }
  const item = e.target.closest('.hist-item');
  if (item) {
    document.querySelectorAll('.hist-item.show-del').forEach(el => { if (el !== item) el.classList.remove('show-del'); });
    item.classList.toggle('show-del');
  }
});

/* ---------- 我的猫页渲染 ---------- */
async function renderCat() {
  const [{ data: cat }, { data: week }] = await Promise.all([fetchCatProfile(), fetchWeeklySummary()]);
  state.cat = cat;
  const top = moodOf(cat.topMoodKey);
  $('catProfile').innerHTML = `
    <img src="${cat.avatar}" alt="${cat.name}的头像">
    <div class="cp-mid">
      <div class="cp-name">${cat.name}</div>
      <div class="cp-tags">
        <span class="cp-tag">${cat.breed}</span><span class="cp-tag">${cat.sex}</span><span class="cp-tag">${cat.age}</span>
      </div>
    </div>
    <span class="cp-chev">${icon('chevron-right', 18)}</span>`;
  $('statRow').innerHTML = `
    <div class="stat"><b>${cat.weekCount}</b><span>本周记录(次)</span></div>
    <div class="stat"><b class="st-mood" style="color:${top.color}">${top.short}</b><span>本周最常见</span></div>
    <div class="stat"><b>${cat.streak}</b><span>连续记录(天)</span></div>`;
  const max = Math.max(...week.map(d => d.value), 1);
  $('weekChart').innerHTML = week.map(d => {
    const m = moodOf(d.moodKey);
    return `<div class="wcol">
      <span class="wval">${d.value}</span>
      <div class="wbar" style="background:${m.color};height:${Math.round(d.value / max * 100)}px" title="${m.short} ${d.value}"></div>
      <span class="wday">${d.day}</span>
    </div>`;
  }).join('');
  $('weekLegend').innerHTML = [...new Set(week.map(d => d.moodKey))].map(k => {
    const m = moodOf(k);
    return `<span class="wl"><i style="background:${m.color}"></i>${m.short}</span>`;
  }).join('');
}

/* ---------- 编辑猫资料（点头像卡弹出编辑 Sheet） ---------- */
const AVATARS = ['assets/avatar.jpg', 'assets/avatar2.jpg', 'assets/avatar3.jpg', 'assets/avatar4.jpg'];
let epSelAvatar = AVATARS[0];
function openProfileEdit() {
  const cat = state.cat;
  if (!cat) return;
  epSelAvatar = AVATARS.includes(cat.avatar) ? cat.avatar : AVATARS[0];
  $('epName').value = cat.name;
  $('epBreed').value = cat.breed;
  $('epAge').value = cat.age;
  $('epAvas').innerHTML = AVATARS.map(a =>
    `<button type="button" class="ep-ava${a === epSelAvatar ? ' sel' : ''}" data-ava="${a}"><img src="${a}" alt="头像选项"></button>`).join('');
  $('epSex').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.sex === cat.sex));
  $('epMask').classList.add('open');
  $('epSheet').classList.add('open');
}
function closeProfileEdit() {
  $('epMask').classList.remove('open');
  $('epSheet').classList.remove('open');
}
$('catProfile').addEventListener('click', openProfileEdit);
$('epMask').addEventListener('click', closeProfileEdit);
$('epCancel').addEventListener('click', closeProfileEdit);
$('epAvas').addEventListener('click', e => {
  const b = e.target.closest('[data-ava]');
  if (!b) return;
  epSelAvatar = b.dataset.ava;
  $('epAvas').querySelectorAll('.ep-ava').forEach(el => el.classList.toggle('sel', el === b));
});
$('epSex').addEventListener('click', e => {
  const b = e.target.closest('[data-sex]');
  if (!b) return;
  $('epSex').querySelectorAll('button').forEach(el => el.classList.toggle('on', el === b));
});
$('epSave').addEventListener('click', async () => {
  const name = $('epName').value.trim();
  if (!name) { toast('名字不能为空'); return; }
  const cur = state.cat;
  const patch = {
    name,
    breed: $('epBreed').value.trim() || cur.breed,
    sex: ($('epSex').querySelector('button.on') || {}).dataset?.sex || cur.sex,
    age: $('epAge').value.trim() || cur.age,
    avatar: epSelAvatar
  };
  const { data } = await saveCatProfile(patch);
  state.cat = data;
  closeProfileEdit();
  renderCat();
  toast('猫资料已更新');
});

/* ---------- 录音提醒开关（持久化） ---------- */
const remind = $('remindToggle');
function paintRemind(on) {
  remind.classList.toggle('on', on);
  remind.setAttribute('aria-checked', on ? 'true' : 'false');
}
remind.addEventListener('click', async () => {
  const on = !remind.classList.contains('on');
  paintRemind(on);
  await putRemindSetting(on);
  toast(on ? '已开启录音提醒' : '已关闭录音提醒');
});

/* ---------- 启动 ---------- */
document.querySelectorAll('[data-ic]').forEach(el => {
  el.innerHTML = icon(el.dataset.ic, el.dataset.sz ? +el.dataset.sz : 22);
});
paintRemind(getRemindSetting());
route();                    // 初次路由（默认 #/record）
renderHistory();            // 预渲染，切 Tab 不白屏
renderCat();
/* 首屏阶梯入场（60ms 阶梯） */
document.querySelectorAll('.reveal').forEach((el, i) => {
  setTimeout(() => el.classList.add('in'), 60 * i + 60);
});
