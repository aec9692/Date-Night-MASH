/* Short, skippable reveal. The server has already chosen an affordable result. */
window.MashShow = (() => {
  let sound = false;
  let audio;
  const categories = ['dinner', 'activity', 'treat', 'entertainment'];
  const labels = ['Dinner', 'Activity', 'Treat', 'Entertainment'];
  function node(tag, text, className) {
    const item = document.createElement(tag);
    if (text) item.textContent = text;
    if (className) item.className = className;
    return item;
  }
  function reducedMotion() { return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false; }
  function ping(index) {
    if (!sound || !audio || audio.state !== 'running') return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = [392, 494, 587, 784][index];
    gain.gain.setValueAtTime(.035, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .17);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + .18);
  }
  function toggleSound() {
    sound = !sound;
    if (sound) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) { sound = false; return false; }
      try { audio ||= new Context(); audio.resume().catch(() => {}); } catch { sound = false; }
    }
    return sound;
  }
  function reveal(plan, pool, instant) {
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
        stage.hidden = true;
        skip.onclick = null;
        resolve();
      };
      skip.onclick = finish;
      columns.forEach(({ column, rows, winner }, index) => {
        rows.forEach((row, rowIndex) => timers.push(setTimeout(() => row.classList.add('crossed'), 180 + index * 240 + rowIndex * 150)));
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
  return { reveal, celebrate, toggleSound };
})();
