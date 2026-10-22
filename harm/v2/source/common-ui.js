/* 공통 팩의 파일과 그리기 함수를 그대로 사용합니다. 사건 삽화는 기존 harm 자산입니다. */
'use strict';
const COMMON_MANIFEST = JSON.parse(document.getElementById('common-manifest').textContent);
const COMMON_FILES = JSON.parse(document.getElementById('common-files').textContent);
const COMMON_USED = JSON.parse(document.getElementById('common-used').textContent);
const commonSubset = {
  ...COMMON_MANIFEST,
  characters: Object.fromEntries(COMMON_USED.characters.map(id => [id, COMMON_MANIFEST.characters[id]])),
  backgrounds: Object.fromEntries(COMMON_USED.backgrounds.map(id => [id, COMMON_MANIFEST.backgrounds[id]]))
};
const commonArt = new EthicityAssets.CommonAssets(commonSubset);
// 배포 파일 하나에서도 오프라인 미리보기가 되도록 원본 바이트를 내장합니다.
commonArt.path = path => {
  if (!COMMON_FILES[path]) throw Error('공통 자료가 없습니다: ' + path);
  return COMMON_FILES[path];
};
let commonLoaded = false;
const commonReady = commonArt.load().then(() => { commonLoaded = true; });
commonReady.catch(() => {
  const message = document.createElement('p');
  message.className = 'ee-notice';
  message.setAttribute('role', 'alert');
  message.textContent = '공통 그림을 불러오지 못했습니다. 화면을 새로고침합니다. 글과 선택지는 계속 사용할 수 있습니다.';
  document.getElementById('main').prepend(message);
});
const CHARACTER_ALIAS = {boy:'haneul', pony:'jiho', girl:'jiho', friend:'daon', bot:'robot'};
const EXPRESSION_ALIAS = {normal:'neutral', sad:'worried', think:'explaining'};
function commonCharacter(id) { return CHARACTER_ALIAS[id] || (commonSubset.characters[id] ? id : 'haneul'); }
function commonIcon(id, size = 24) {
  if (!COMMON_MANIFEST.icons.icons[id]) throw Error('아이콘 ID를 확인합니다: ' + id);
  return `<canvas class="ee-icon" width="64" height="64" data-common-icon="${id}" style="width:${size}px;height:${size}px" aria-hidden="true"></canvas>`;
}
function paintArt() {
  commonReady.then(() => {
    document.querySelectorAll('canvas[data-character]').forEach(canvas => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      commonArt.drawPortrait(ctx, commonCharacter(canvas.dataset.character), EXPRESSION_ALIAS[canvas.dataset.mood] || canvas.dataset.mood || 'neutral', 0, 0, 256);
    });
    document.querySelectorAll('canvas[data-common-icon]').forEach(canvas => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      commonArt.drawIcon(ctx, canvas.dataset.commonIcon, 0, 0, 64);
    });
    document.querySelectorAll('canvas[data-village]').forEach(canvas => {
      canvas.width = 1280; canvas.height = 720;
      const ctx = canvas.getContext('2d');
      const background = canvas.dataset.village || 'courtyard';
      commonArt.drawBackground(ctx, background);
      // 지도와 대화의 다온은 같은 manifest ID를 사용합니다.
      commonArt.drawCharacter(ctx, 'daon', 632, 510, 'down', 1, .85);
      commonArt.drawCharacter(ctx, 'haneul', 510, 560, 'right', 1, .85);
      commonArt.drawCharacter(ctx, 'jiho', 746, 560, 'left', 1, .85);
      commonArt.drawCharacter(ctx, 'robot', 846, 482, 'down', 1, .65);
    });
  }).catch(() => {});
}
const commonEffectLayer = document.createElement('div');
commonEffectLayer.className = 'common-effect-layer';
commonEffectLayer.setAttribute('aria-hidden', 'true');
document.body.append(commonEffectLayer);
function commonBurst(x, y, id = 'clue') {
  if (!commonLoaded || document.hidden) return;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  canvas.style.left = (x - 64) + 'px'; canvas.style.top = (y - 64) + 'px';
  commonEffectLayer.append(canvas);
  while (commonEffectLayer.children.length > 8) commonEffectLayer.firstElementChild.remove();
  const ctx = canvas.getContext('2d'), start = performance.now();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const draw = time => {
    if (!canvas.isConnected || document.hidden) { canvas.remove(); return; }
    ctx.clearRect(0, 0, 128, 128);
    if (commonArt.drawEffect(ctx, id, 64, 64, time - start, 112, reduced)) requestAnimationFrame(draw);
    else canvas.remove();
  };
  requestAnimationFrame(draw);
}
let soundEnabled = false;
try { soundEnabled = JSON.parse(localStorage.getItem('ethicity.harm.sfx')) === true; } catch {}
commonArt.setSound(soundEnabled);
function updateSoundControl() {
  const button = document.querySelector('[data-action="sfx"]');
  if (button) { button.textContent = '효과음 ' + (soundEnabled ? '켜짐' : '꺼짐'); button.setAttribute('aria-pressed', String(soundEnabled)); }
}
async function toggleCommonSound() {
  soundEnabled = !soundEnabled;
  try { localStorage.setItem('ethicity.harm.sfx', JSON.stringify(soundEnabled)); } catch {}
  commonArt.setSound(soundEnabled); updateSoundControl();
  if (soundEnabled) await commonArt.playSound('tap');
}
document.addEventListener('click', event => {
  const button = event.target.closest('button,summary');
  if (!button || button.disabled || button.dataset.action === 'sfx') return;
  if (soundEnabled) commonArt.playSound('tap');
});
let lastFeedback = '';
function commonFeedback(key, kind) {
  if (key === lastFeedback) return;
  lastFeedback = key;
  if (soundEnabled) commonArt.playSound(kind === 'safe' ? 'collect' : 'retry');
  commonReady.then(() => {
    const target = document.querySelector('.feedback');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    // 결과가 화면에 보일 때만 효과를 표시합니다.
    if (rect.top >= 0 && rect.top < innerHeight) commonBurst(rect.left + 36, rect.top + 32, kind === 'safe' ? 'correct' : 'retry');
  }).catch(() => {});
}
