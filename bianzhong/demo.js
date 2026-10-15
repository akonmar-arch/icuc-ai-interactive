/* 六分音合成；默认模型十一钟按真实三维位置逐钟映射。 */
(() => {
  'use strict';
  const NOTES = [
    { pitch: 'G3', frequency: 196, degree: '徵' },
    { pitch: 'A3', frequency: 220, degree: '羽' },
    { pitch: 'C4', frequency: 261.63, degree: '宫' },
    { pitch: 'D4', frequency: 293.66, degree: '商' },
    { pitch: 'E4', frequency: 329.63, degree: '角' },
    { pitch: 'G4', frequency: 392, degree: '徵' },
    { pitch: 'A4', frequency: 440, degree: '羽' },
    { pitch: 'C5', frequency: 523.25, degree: '宫' },
    { pitch: 'D5', frequency: 587.33, degree: '商' },
    { pitch: 'E5', frequency: 659.25, degree: '角' },
    { pitch: 'G5', frequency: 784, degree: '徵' }
  ];
  const PARTIALS = [[1, 1], [2.01, .55], [2.76, .38], [3.52, .22], [5.06, .14], [6.8, .08]];
  const MODEL = typeof window === 'undefined' ? require('./bell-map.js') : window.BIANZHONG_MODEL;
  const SHORTCUTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'];
  const MELODY = NOTES.map((_, i) => i);
  function selfCheck() {
    const expected = ['徵', '羽', '宫', '商', '角'];
    if (NOTES.length !== 11 || PARTIALS.length !== 6 || MODEL.bells.length !== NOTES.length) throw Error('音列、钟体映射或分音数量不正确');
    NOTES.forEach((note, i) => {
      if (note.degree !== expected[i % 5]) throw Error('五声音级映射不正确');
      if (i && note.frequency <= NOTES[i - 1].frequency) throw Error('音高必须从左至右递增');
      if (i >= 5 && Math.abs(note.frequency / NOTES[i - 5].frequency - 2) > .001) throw Error('八度频率不正确');
    });
    if (MELODY.some(i => !Number.isInteger(i) || i < 0 || i >= NOTES.length)) throw Error('旋律音符超出十一音范围');
    MODEL.bells.forEach((region, i) => {
      if (region.noteIndex !== i || MODEL.bellIndexFromPoint({x:(region.min[0]+region.max[0])/2,y:(region.min[1]+region.max[1])/2,z:0}) !== i) throw Error('钟体与音符应一一对应');
    });
    if (MELODY.length !== NOTES.length || MELODY.some((note, index) => note !== index)) throw Error('自动演奏应按音阶由低到高进行');
    if (PARTIALS.slice(1).every(([ratio]) => Number.isInteger(ratio))) throw Error('应包含非谐分音');
    return true;
  }
  selfCheck();
  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined') module.exports = { NOTES, PARTIALS, MELODY, selfCheck };
    console.log('BIANZHONG_SELF_CHECK_PASS: 11 ascending notes, 11 unique bell regions, 6 inharmonic partials, valid melody.');
    return;
  }

  const $ = id => document.getElementById(id);
  const stage = $('stage'), rack = $('bellRack'), keys = $('noteKeys'), mv = $('modelViewer');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let audioContext, output, muted = false, sequenceId = 0, sequenceTimers = [];
  let modelURL = null, modelName = '', modelReady = false, modelScriptPromise, pointerStart = null;
  let activeBellMap = false;
  const modelMarkers = [];
  let flashTimer, modelLoadTimer, fileAttempt = 0;
  const voices = new Set(), highlightTimers = new Map();
  if (window.self !== window.top) document.documentElement.classList.add('embedded');

  rack.innerHTML = `<defs>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#654733"/><stop offset=".35" stop-color="#473123"/><stop offset=".65" stop-color="#75533a"/><stop offset="1" stop-color="#3e2a20"/></linearGradient>
    <linearGradient id="bronze" x1="0" y1="0" x2="1" y2=".2"><stop stop-color="#514d32"/><stop offset=".18" stop-color="#8d8755"/><stop offset=".45" stop-color="#ada06a"/><stop offset=".7" stop-color="#6a714c"/><stop offset="1" stop-color="#464a31"/></linearGradient>
    <linearGradient id="bronzeEdge" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#6e6543"/><stop offset=".5" stop-color="#c3ad72"/><stop offset="1" stop-color="#6a6544"/></linearGradient>
    <radialGradient id="stud"><stop stop-color="#c7b57e"/><stop offset=".6" stop-color="#878455"/><stop offset="1" stop-color="#4e563b"/></radialGradient>
    <radialGradient id="floor"><stop stop-color="#5b4031" stop-opacity=".17"/><stop offset="1" stop-color="#5b4031" stop-opacity="0"/></radialGradient>
    <pattern id="meander" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 0H10V8H4V4H7M0 12V2" fill="none" stroke="#c1ad71" stroke-opacity=".52" stroke-width="1.2"/></pattern>
    <filter id="bellShadow" x="-30%" y="-10%" width="160%" height="140%"><feDropShadow dx="1" dy="5" stdDeviation="4" flood-color="#392a1d" flood-opacity=".2"/></filter>
  </defs>
  <ellipse cx="550" cy="351" rx="480" ry="25" fill="url(#floor)"/>
  <g fill="url(#wood)" stroke="#38271c" stroke-width="1.3">
    <path d="M103 96H127V337H103Z M973 96H997V337H973Z"/>
    <path d="M88 330H142L151 343H79Z M958 330H1012L1021 343H949Z"/>
    <path d="M75 84Q87 73 109 75H990Q1013 73 1026 84L1017 109H84Z"/>
    <path d="M115 113L151 145V157L115 127Z M985 113L949 145V157L985 127Z"/>
  </g>
  <g fill="none" stroke="#b4935b"><path d="M87 89H1014M88 103H1013" stroke-width="1.8"/><path d="M109 119V320M991 119V320" opacity=".6"/><path d="M91 336H139M961 336H1009"/><path d="M98 80Q73 59 91 52Q111 45 117 75M1003 80Q1027 59 1010 52Q989 45 983 75" stroke-width="4"/><path d="M89 57Q106 56 107 69M1011 57Q994 56 993 69" stroke-width="2"/></g>
  <path d="M145 97H955" stroke="url(#meander)" stroke-width="10"/>
  <g id="bells"></g>
  <text x="550" y="374" text-anchor="middle" fill="#a38a63" font-size="10" letter-spacing="5">五声相和 · 十一钟成列</text>`;

  const svgNS = 'http://www.w3.org/2000/svg';
  NOTES.forEach((note, i) => {
    const x = 174 + i * 751.5 / (NOTES.length - 1), height = 155 - i * 6.3, width = 58 - i * 1.7, y = 134;
    const group = document.createElementNS(svgNS, 'g');
    group.setAttribute('class', 'bell'); group.dataset.index = i;
    group.setAttribute('transform', `translate(${x},${y})`);
    const studs = [0, 1, 2].map(row => [-1, 1].map(side => [0, 1, 2].map(col => `<circle cx="${side * (11 + col * 6.2)}" cy="${height * (.29 + row * .15)}" r="2.7" fill="url(#stud)"/>`).join('')).join('')).join('');
    group.innerHTML = `<path d="M0 -25V-10" stroke="#6f5733" stroke-width="2.8"/>
      <path d="M-9 2V-7Q-9 -18 0 -18Q9 -18 9 -7V2" fill="none" stroke="url(#bronzeEdge)" stroke-width="5"/>
      <g class="bell-body" filter="url(#bellShadow)">
        <path d="M${-width / 2 + 8} 0Q0 -5 ${width / 2 - 8} 0L${width / 2 + 6} ${height - 12}Q${width / 2} ${height + 3} 0 ${height - 1}Q${-width / 2} ${height + 3} ${-width / 2 - 6} ${height - 12}Z" fill="url(#bronze)" stroke="#575338" stroke-width="1.2"/>
        <path d="M${-width / 2 + 10} 9Q0 5 ${width / 2 - 10} 9M${-width / 2 + 9} 16Q0 12 ${width / 2 - 9} 16M${-width / 2 - 3} ${height - 19}Q0 ${height - 9} ${width / 2 + 3} ${height - 19}M${-width / 2 - 3} ${height - 12}Q0 ${height - 2} ${width / 2 + 3} ${height - 12}" fill="none" stroke="#c3b176" stroke-opacity=".7" stroke-width="1.8"/>
        <path d="M-4 16V${height - 19}H4V16Z" fill="url(#meander)" stroke="#b4a26a" stroke-opacity=".45" stroke-width=".7"/>
        ${studs}
        <path d="M-14 ${height * .8}Q-7 ${height * .73} -5 ${height * .8}M5 ${height * .8}Q7 ${height * .73} 14 ${height * .8}" fill="none" stroke="#b8a572" stroke-opacity=".7" stroke-width="2"/>
      </g>
      <rect class="bell-hit" x="-38" y="-24" width="76" height="${height + 44}"/>
      <text x="0" y="${height + 25}" text-anchor="middle" fill="#886d42" font-size="12" font-family="Microsoft YaHei, sans-serif">${note.degree}</text>`;
    group.addEventListener('click', event => ring(i, event.clientX, event.clientY));
    $('bells').appendChild(group);
    const key = document.createElement('button'); key.type = 'button'; key.className = 'note-key'; key.dataset.index = i;
    key.setAttribute('aria-label', `${MODEL.bells[i].label}，${note.degree}，${note.pitch}，${note.frequency}赫兹，键盘${SHORTCUTS[i]}`);
    key.innerHTML = `<span class="shortcut" aria-hidden="true">${SHORTCUTS[i]}</span><span class="degree">${note.degree}</span><span class="pitch">${note.pitch}</span><span class="key-location">${MODEL.bells[i].label}</span>`;
    key.addEventListener('click', () => ring(i)); keys.appendChild(key);
  });

  function clearModelMarkers() {
    modelMarkers.forEach(marker => marker.remove()); modelMarkers.length = 0;
  }
  function createModelMarkers() {
    clearModelMarkers();
    MODEL.bells.forEach((region, index) => {
      const marker = document.createElement('button'); marker.type = 'button'; marker.className = 'bell-hotspot';
      marker.slot = `hotspot-bell-${index}`; marker.dataset.position = region.anchor.map(value => `${value}m`).join(' ');
      marker.dataset.normal = '0m 0m -1m'; marker.dataset.visibilityAttribute = 'visible';
      marker.setAttribute('aria-label', `${region.label}，${NOTES[index].degree}，${NOTES[index].pitch}`);
      marker.textContent = `${NOTES[index].degree} · ${NOTES[index].pitch}`;
      ['pointerdown', 'pointerup'].forEach(type => marker.addEventListener(type, event => event.stopPropagation()));
      marker.addEventListener('click', event => { event.stopPropagation(); ring(index, event.clientX, event.clientY); });
      mv.appendChild(marker); modelMarkers.push(marker);
    });
  }
  function updateKeyLocations(mapped) {
    [...keys.children].forEach((key, i) => {
      const label = mapped ? MODEL.bells[i].label : `第${i + 1}音`;
      key.querySelector('.key-location').textContent = label;
      key.setAttribute('aria-label', `${label}，${NOTES[i].degree}，${NOTES[i].pitch}，${NOTES[i].frequency}赫兹，键盘${SHORTCUTS[i] === '-' ? '减号' : SHORTCUTS[i]}`);
    });
  }

  function ensureAudio() {
    if (!audioContext || audioContext.state === 'closed') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw Error('当前浏览器不支持声音合成，请换用较新的浏览器。');
      audioContext = new AudioContextClass(); output = audioContext.createGain();
      const limiter = audioContext.createDynamicsCompressor();
      limiter.threshold.value = -5; limiter.ratio.value = 8;
      output.connect(limiter); limiter.connect(audioContext.destination); updateVolume();
    }
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => { $('status').textContent = '声音尚未启用，请再次点击钟体或音键。'; });
    return audioContext;
  }
  function updateVolume() {
    const value = Number($('volume').value);
    $('volumeValue').textContent = `${value}%`;
    if (output) output.gain.setTargetAtTime(muted ? 0 : value / 100 * .26, audioContext.currentTime, .015);
  }
  function bell(frequency) {
    const ctx = ensureAudio(), now = ctx.currentTime, envelope = ctx.createGain();
    // 保留原案例 6 毫秒起音、约 3.4 秒衰减及六个非谐分音。
    envelope.connect(output); envelope.gain.setValueAtTime(.0001, now);
    envelope.gain.exponentialRampToValueAtTime(.85, now + .006);
    envelope.gain.exponentialRampToValueAtTime(.0001, now + 3.4);
    const voice = { envelope, oscillators: [], gains: [], remaining: PARTIALS.length };
    voices.add(voice);
    PARTIALS.forEach(([ratio, amplitude]) => {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency * ratio; gain.gain.value = amplitude;
      oscillator.connect(gain); gain.connect(envelope); voice.oscillators.push(oscillator); voice.gains.push(gain);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); if (--voice.remaining === 0) { envelope.disconnect(); voices.delete(voice); } };
      oscillator.start(now); oscillator.stop(now + 3.5);
    });
  }
  function ring(index, clientX, clientY) {
    if (!Number.isInteger(index) || !NOTES[index]) return;
    try { bell(NOTES[index].frequency); } catch (error) { $('status').textContent = error.message; return; }
    const note = NOTES[index], key = keys.children[index], shape = $('bells').children[index];
    clearTimeout(highlightTimers.get(index));
    key.classList.remove('is-playing'); shape.classList.remove('is-playing');
    void shape.getBoundingClientRect();
    key.classList.add('is-playing'); shape.classList.add('is-playing');
    modelMarkers[index]?.classList.add('is-playing');
    highlightTimers.set(index, setTimeout(() => { key.classList.remove('is-playing'); shape.classList.remove('is-playing'); modelMarkers[index]?.classList.remove('is-playing'); highlightTimers.delete(index); }, 620));
    $('flashDegree').textContent = note.degree; $('flashPitch').textContent = note.pitch;
    $('noteFlash').classList.add('on'); clearTimeout(flashTimer);
    flashTimer = setTimeout(() => $('noteFlash').classList.remove('on'), 650);
    if (!reducedMotion) {
      const rect = stage.getBoundingClientRect(), ripple = document.createElement('span'); ripple.className = 'ripple';
      const position = shape.getBoundingClientRect();
      ripple.style.left = `${(clientX ?? position.left + position.width / 2) - rect.left}px`;
      ripple.style.top = `${(clientY ?? position.top + position.height / 2) - rect.top}px`;
      if (rack.hidden && clientX == null) {
        const hotspot = activeBellMap ? mv.queryHotspot(`hotspot-bell-${index}`) : null;
        const modelRect = mv.getBoundingClientRect();
        ripple.style.left = `${hotspot ? modelRect.left - rect.left + hotspot.canvasPosition.x : (index + .5) / NOTES.length * rect.width}px`;
        ripple.style.top = `${hotspot ? modelRect.top - rect.top + hotspot.canvasPosition.y : rect.height * .55}px`;
      }
      stage.appendChild(ripple); ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
      setTimeout(() => ripple.remove(), 800);
    }
    $('status').textContent = `正在奏响：${note.degree} · ${note.pitch} · ${note.frequency} 赫兹${muted ? '（已静音）' : ''}`;
  }
  function stopSequence(silence = true) {
    sequenceId++; sequenceTimers.forEach(clearTimeout); sequenceTimers = [];
    $('playSequence').disabled = false; $('stopSequence').disabled = true;
    if (silence && audioContext) {
      const now = audioContext.currentTime;
      voices.forEach(voice => {
        voice.envelope.gain.cancelScheduledValues(now);
        voice.envelope.gain.setTargetAtTime(.0001, now, .015);
        voice.oscillators.forEach(oscillator => { try { oscillator.stop(now + .08); } catch (_) { /* 已结束的分音无需再次停止。 */ } });
      });
    }
  }
  $('playSequence').addEventListener('click', () => {
    stopSequence(); try { ensureAudio(); } catch (error) { $('status').textContent = error.message; return; }
    const currentSequence = sequenceId;
    $('playSequence').disabled = true; $('stopSequence').disabled = false;
    MELODY.forEach((index, i) => sequenceTimers.push(setTimeout(() => { if (sequenceId === currentSequence) ring(index); }, i * 230)));
    sequenceTimers.push(setTimeout(() => { if (sequenceId === currentSequence) { stopSequence(false); $('status').textContent = '这一段演奏结束。试着用十一个音键接着奏下去。'; } }, MELODY.length * 230));
  });
  $('stopSequence').addEventListener('click', () => { stopSequence(); $('status').textContent = '演奏已停止，仍可随时点击钟体或音键。'; });
  $('muteButton').addEventListener('click', () => {
    muted = !muted; $('muteButton').setAttribute('aria-pressed', String(muted)); $('muteButton').textContent = muted ? '取消静音' : '静音'; updateVolume();
    $('status').textContent = muted ? '已静音。钟体、涟漪与音键仍会响应演奏。' : '已取消静音。';
  });
  $('volume').addEventListener('input', updateVolume);
  document.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    if (SHORTCUTS.includes(event.key)) { event.preventDefault(); ring(SHORTCUTS.indexOf(event.key)); }
    if (event.key === 'Escape') { stopSequence(); $('status').textContent = '演奏已停止。'; }
  });

  function showRack(message) {
    modelReady = false; mv.hidden = true; rack.hidden = false; rack.style.display = 'block';
    activeBellMap = false; clearModelMarkers();
    updateKeyLocations(false);
    $('modeLabel').textContent = '示意钟架 · 浏览器合成钟声';
    $('stageHint').textContent = '点击钟体，听见从左到右的音高变化';
    mv.autoRotate = false; $('spin').checked = false;
    ['resetView', 'showRack', 'spin'].forEach(id => { $(id).disabled = true; });
    $('loadModel').textContent = '选择模型';
    if (message) $('modelStatus').textContent = message;
  }
  function releaseModel() {
    clearTimeout(modelLoadTimer); mv.removeAttribute('src');
    if (modelURL?.startsWith('blob:')) URL.revokeObjectURL(modelURL);
    modelURL = null;
  }
  function ensureModelViewer() {
    if (customElements.get('model-viewer')) return Promise.resolve();
    if (!modelScriptPromise) {
      modelScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.type = 'module'; script.src = 'assets/vendor/model-viewer.min.js';
        script.onload = () => customElements.get('model-viewer') ? resolve() : reject(Error('三维组件未能启动'));
        script.onerror = () => { script.remove(); modelScriptPromise = null; reject(Error('三维组件无法加载')); };
        document.head.appendChild(script);
      });
    }
    return modelScriptPromise;
  }
  async function displayModel(source, name, mapped, attempt) {
    await ensureModelViewer(); if (attempt !== fileAttempt) return;
    releaseModel(); showRack(); modelName = name; activeBellMap = mapped;
    mv.cameraOrbit = mapped ? defaultOrbit() : '180deg 78deg auto';
    modelURL = typeof source === 'string' ? source : URL.createObjectURL(source);
    mv.src = modelURL;
    modelLoadTimer = setTimeout(() => { if (attempt === fileAttempt && !modelReady) { releaseModel(); showRack('模型载入超时，已保留可演奏的示意钟架。可点击“恢复默认模型”重试。'); } }, 120000);
  }
  function defaultOrbit() {
    return `180deg 78deg ${window.matchMedia('(max-width:650px)').matches ? '100%' : '65%'}`;
  }
  async function loadDefaultModel() {
    if (location.protocol === 'file:') return;
    const attempt = ++fileAttempt;
    $('modelStatus').textContent = '正在载入默认双层编钟模型，载入后可逐钟演奏；示意钟架仍可使用……';
    try { await displayModel(MODEL.url + '?v=default-bells-1', MODEL.name, true, attempt); }
    catch (_) { if (attempt === fileAttempt) showRack('默认模型暂未载入。可点击“恢复默认模型”重试，或导入自己的 GLB。'); }
  }
  async function loadModel(file) {
    if (!file) return;
    if (location.protocol === 'file:') {
      $('modelStatus').textContent = '当前以本地文件打开，浏览器会阻止三维组件加载。请点击下方“打开网页版”，在网站中选择 GLB 进行展示。';
      return;
    }
    const attempt = ++fileAttempt;
    if (!/\.glb$/i.test(file.name)) { $('modelStatus').textContent = '请选择单文件 GLB；GLTF、OBJ、FBX 等格式请先转换为 GLB。'; return; }
    if (file.size > 100 * 1024 * 1024) { $('modelStatus').textContent = '模型超过 100 MB，建议先简化模型并压缩纹理，再导出单文件 GLB。'; return; }
    $('modelStatus').textContent = '正在检查并载入本地模型，示意钟架仍可演奏……';
    try {
      const header = new DataView(await file.slice(0, 20).arrayBuffer());
      if (header.byteLength < 20 || header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== file.size || header.getUint32(16, true) !== 0x4e4f534a) throw Error('文件不是有效的 GLB 2.0 模型');
      const jsonLength = header.getUint32(12, true);
      if (jsonLength > file.size - 20) throw Error('模型文件不完整');
      const gltf = JSON.parse(await file.slice(20, 20 + jsonLength).text());
      if ([...(gltf.buffers || []), ...(gltf.images || [])].some(resource => resource.uri && !resource.uri.startsWith('data:'))) throw Error('模型包含外部资源，请将全部纹理与数据打包到单个 GLB');
      if ((gltf.extensionsUsed || []).some(extension => ['KHR_draco_mesh_compression', 'KHR_texture_basisu', 'EXT_meshopt_compression'].includes(extension))) throw Error('模型包含压缩扩展，请导出无需额外解码器的未压缩 GLB');
      await displayModel(file, file.name, file.size === MODEL.byteLength && gltf.accessors?.some(accessor => accessor.count === 888257), attempt);
    } catch (error) {
      const message = /[\u4e00-\u9fff]/.test(error.message || '') ? error.message : '模型未能载入，请检查文件格式与资源是否完整';
      if (attempt === fileAttempt) showRack(`${message}。示意钟架仍可正常演奏。`);
    }
  }
  mv.addEventListener('load', () => {
    if (!modelURL) return;
    clearTimeout(modelLoadTimer); modelReady = true; rack.hidden = true; rack.style.display = 'none'; mv.hidden = false;
    $('modeLabel').textContent = activeBellMap ? '双层编钟 · 十一钟逐钟演奏' : '自载三维模型 · 浏览器合成钟声';
    $('stageHint').textContent = activeBellMap ? '点击真实钟体或音名演奏 · 木架与空白不发声' : '拖动旋转 · 缩放查看 · 点击十一个横向音区发声';
    if (activeBellMap) createModelMarkers();
    updateKeyLocations(activeBellMap);
    ['resetView', 'showRack', 'spin'].forEach(id => { $(id).disabled = false; });
    $('loadModel').textContent = '更换模型';
    $('modelStatus').textContent = activeBellMap ? `已载入：${modelName}。11 只钟分别绑定 11 个音，钟体、音名和下方音键一一对应。` : `已载入：${modelName}。当前使用十一个横向演奏音区；点击“恢复默认模型”可回到逐钟映射。`;
  });
  mv.addEventListener('progress', event => {
    if (modelURL && !modelReady) $('modelStatus').textContent = `正在载入：${modelName}（${Math.round(event.detail.totalProgress * 100)}%）……`;
  });
  mv.addEventListener('error', () => { releaseModel(); showRack('模型载入失败，已回到可演奏的示意钟架。请确认模型及纹理都包含在同一个 GLB 中。'); });
  mv.addEventListener('pointerdown', event => { pointerStart = { x: event.clientX, y: event.clientY }; });
  mv.addEventListener('pointercancel', () => { pointerStart = null; });
  mv.addEventListener('pointerup', event => {
    if (!modelReady || !pointerStart) return;
    const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y); pointerStart = null;
    if (moved > 7) return;
    const hit = mv.positionAndNormalFromPoint(event.clientX, event.clientY);
    if (!hit) return;
    if (activeBellMap) {
      const index = MODEL.bellIndexFromPoint(hit.position);
      if (index >= 0) ring(index, event.clientX, event.clientY);
      return;
    }
    const rect = mv.getBoundingClientRect(); ring(Math.max(0, Math.min(NOTES.length - 1, Math.floor((event.clientX - rect.left) / rect.width * NOTES.length))), event.clientX, event.clientY);
  });
  $('loadModel').addEventListener('click', () => $('modelFile').click());
  $('defaultModel').addEventListener('click', loadDefaultModel);
  if (location.protocol === 'file:') {
    $('loadModel').disabled = true;
    $('defaultModel').disabled = true;
    $('onlineVersion').hidden = false;
    $('modelStatus').textContent = '当前以本地文件打开，浏览器会阻止三维组件加载。请点击下方“打开网页版”，在网站中选择 GLB 进行展示；示意钟架仍可演奏。';
  }
  $('modelFile').addEventListener('change', event => { loadModel(event.target.files[0]); event.target.value = ''; });
  ['dragenter', 'dragover'].forEach(name => stage.addEventListener(name, event => { event.preventDefault(); stage.classList.add('dragover'); }));
  stage.addEventListener('dragleave', event => { if (!stage.contains(event.relatedTarget)) stage.classList.remove('dragover'); });
  stage.addEventListener('drop', event => { event.preventDefault(); stage.classList.remove('dragover'); $('modelTools').open = true; if (event.dataTransfer.files.length !== 1) { $('modelStatus').textContent = '请一次拖入一个单文件 GLB 模型。'; return; } loadModel(event.dataTransfer.files[0]); });
  $('spin').addEventListener('change', event => { mv.autoRotate = event.target.checked; });
  $('resetView').addEventListener('click', () => { mv.cameraOrbit = activeBellMap ? defaultOrbit() : '180deg 78deg auto'; mv.cameraTarget = 'auto auto auto'; mv.fieldOfView = 'auto'; if (mv.resetTurntableRotation) mv.resetTurntableRotation(); });
  $('showRack').addEventListener('click', () => { fileAttempt++; releaseModel(); showRack('已回到示意钟架。可随时重新导入单文件 GLB。'); });
  window.addEventListener('pagehide', () => { stopSequence(); releaseModel(); if (audioContext) audioContext.close(); });
  window.BIANZHONG = Object.freeze({ notes: NOTES, partials: PARTIALS, selfCheck, get audioState() { return audioContext?.state || '未启用'; }, get activeVoices() { return voices.size; } });
  loadDefaultModel();
})();
