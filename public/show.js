/* Short, skippable reveal. The server has already chosen an affordable result. */
window.MashShow = (() => {
  let sound = false;
  let audio;
  let finishReveal;
  const voices = new Set();
  const categories = ['dinner', 'activity', 'treat', 'entertainment'];
  const labels = ['Dinner', 'Activity', 'Treat', 'Entertainment'];
  function node(tag, text, className) {
    const item = document.createElement(tag);
    if (text) item.textContent = text;
    if (className) item.className = className;
    return item;
  }
  function reducedMotion() { return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false; }
  function tone(frequency, duration = .09, volume = .025, type = 'sine', delay = 0, end = frequency) {
    if (!sound || !audio || audio.state !== 'running') return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(end, start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain).connect(audio.destination);
    voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start);
    oscillator.stop(start + duration + .01);
  }
  function stopSound() {
    voices.forEach(voice => { try { voice.stop(); } catch {} });
    voices.clear();
  }
  function primeSound() {
    if (sound && audio && audio.state !== 'running') audio.resume().catch(() => {});
  }
  function ping(index) {
    const note = [392, 494, 587, 784][index];
    tone(note, .23, .035);
    tone(note * 1.5, .2, .012, 'sine', .045);
    if (index === 3) [392, 494, 587].forEach((note, i) => tone(note, .32, .012, 'sine', .07 + i * .04));
  }
  function toggleSound() {
    sound = !sound;
    if (sound) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) { sound = false; return false; }
      try { audio ||= new Context(); audio.resume().catch(() => {}); } catch { sound = false; }
      tone(587, .09, .02);
    }
    else stopSound();
    return sound;
  }
  function reveal(plan, pool, instant) {
    finishReveal?.();
    primeSound();
    if (instant || reducedMotion()) return Promise.resolve();
    const stage = document.querySelector('#mash-stage');
    const board = document.querySelector('#reveal-board');
    const skip = document.querySelector('#skip-reveal');
    board.replaceChildren();
    const columns = plan.picks.map((pick, index) => {
      const column = node('article', '', `reveal-column ${categories[index]}`);
      column.append(node('h3', labels[index]));
      const list = node('ul');
      const others = pool.filter(option => option.category === pick.category && option.id !== pick.id).slice(0, 3);
      const rows = others.map(option => node('li', option.name));
      rows.forEach(row => list.append(row));
      const winner = node('li', `${pick.emoji || '✳'} ${pick.name}`);
      list.append(winner);
      column.append(list);
      board.append(column);
      return { column, rows, winner };
    });
    stage.hidden = false;
    stage.scrollIntoView({ block: 'nearest' });
    return new Promise(resolve => {
      const timers = [];
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        timers.forEach(clearTimeout);
        stopSound();
        stage.hidden = true;
        skip.onclick = null;
        finishReveal = null;
        resolve();
      };
      finishReveal = finish;
      skip.onclick = finish;
      // Short mechanical ticks slow down as each card settles. All audio is opt-in.
      for (let i = 0, at = 0; at < 1810; i++, at += 65 + i * 7) {
        const step = i;
        timers.push(setTimeout(() => tone(250 + step * 38, .045, .018, 'triangle', 0, 140 + step * 22), at));
      }
      columns.forEach(({ column, rows, winner }, index) => {
        rows.forEach((row, rowIndex) => timers.push(setTimeout(() => {
          row.classList.add('crossed');
          tone(800, .035, .009, 'triangle', 0, 320);
        }, 180 + index * 240 + rowIndex * 150)));
        timers.push(setTimeout(() => {
          rows.forEach(row => row.classList.add('crossed'));
          winner.classList.add('winner');
          column.classList.add('revealed');
          ping(index);
        }, 800 + index * 340));
      });
      timers.push(setTimeout(finish, 2300));
    });
  }
  function celebrate() {
    if (reducedMotion()) return;
    const holder = document.querySelector('#confetti');
    holder.replaceChildren();
    const colors = ['#7042d2', '#f09775', '#b5ce69', '#e19abd', '#ead657'];
    for (let i = 0; i < 24; i++) {
      const bit = node('i', '', 'confetti-bit');
      bit.style.setProperty('--x', `${(i * 37) % 100}%`);
      bit.style.setProperty('--color', colors[i % colors.length]);
      bit.style.setProperty('--delay', `${(i % 5) * .07}s`);
      holder.append(bit);
    }
    setTimeout(() => holder.replaceChildren(), 2300);
  }
  window.addEventListener('pagehide', () => { finishReveal?.(); stopSound(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { finishReveal?.(); stopSound(); } });
  return { reveal, celebrate, toggleSound, primeSound };
})();
