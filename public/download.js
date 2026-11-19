/* Vector date cards remain crisp when printed. User text is added with DOM APIs. */
window.DateCard = (() => {
  const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  function text(plan) {
    return [plan.title || 'DATE NIGHT MASH', `Setting: ${plan.setting} · Mood: ${plan.mood || 'surprise'}`, `Spending style: ${plan.spending === 'treat' ? 'Treat us' : 'Flexible'}`,
      `Budget for two: ${money(plan.budgetCents)}`, '',
      ...plan.picks.flatMap(pick => [`${pick.category.toUpperCase()}: ${pick.name} — ${money(pick.costCents)}`, pick.description, pick.tip || '', '']),
      `Estimated total: ${money(plan.totalCents)}`, `Remaining budget: ${money(plan.remainingCents)}`, '', plan.notice].join('\n');
  }
  function svg(plan) {
    const namespace = 'http://www.w3.org/2000/svg';
    function shape(tag, attrs, content) {
      const item = document.createElementNS(namespace, tag);
      for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
      if (content !== undefined) item.textContent = content;
      return item;
    }
    const root = shape('svg', { viewBox: '0 0 900 1240', width: 900, height: 1240, role: 'img' });
    root.append(shape('title', {}, plan.title || 'Your Date Night MASH plan'));
    root.append(shape('rect', { width: 900, height: 1240, fill: '#eee4ff' }));
    root.append(shape('rect', { x: 30, y: 30, width: 840, height: 1180, rx: 24, fill: '#fffcf7', stroke: '#292333', 'stroke-width': 3 }));
    function label(x, y, value, size = 24, weight = 400, fill = '#292333') {
      root.append(shape('text', { x, y, 'font-family': 'Arial, sans-serif', 'font-size': size, 'font-weight': weight, fill }, value));
    }
    function lines(value, limit) {
      const chunks = [];
      let rest = value;
      while (rest.length > limit) {
        let cut = rest.lastIndexOf(' ', limit);
        if (cut < limit / 2) cut = limit;
        chunks.push(rest.slice(0, cut));
        rest = rest.slice(cut).trim();
      }
      chunks.push(rest);
      return chunks;
    }
    label(70, 83, 'DATE NIGHT MASH  /  YOUR NEXT LITTLE ADVENTURE', 18, 700, '#7042d2');
    lines(plan.title || 'A little date night magic', 29).slice(0, 2).forEach((line, index) => label(70, 145 + index * 49, line, 43, 800));
    label(70, 222, `${plan.setting.toUpperCase()}  ·  ${(plan.mood || 'surprise').toUpperCase()}  ·  ${plan.spending === 'treat' ? 'TREAT US' : 'FLEXIBLE'}  ·  FOR TWO`, 18, 700, '#675f72');
    const colors = ['#ffd8bd', '#e8dcff', '#ffd6e6', '#dcebb7'];
    plan.picks.forEach((pick, index) => {
      const y = 252 + index * 150;
      root.append(shape('rect', { x: 64, y, width: 772, height: 134, rx: 13, fill: colors[index], stroke: '#292333', 'stroke-width': 1.5 }));
      label(86, y + 29, `${index + 1}  ${pick.category.toUpperCase()}`, 16, 700);
      lines(pick.name, 34).slice(0, 2).forEach((line, i) => label(86, y + 63 + i * 28, line, 26, 700));
      label(700, y + 62, money(pick.costCents), 26, 700);
      const tip = pick.tip || pick.description;
      label(86, y + 115, tip.length > 74 ? tip.slice(0, 71) + '…' : tip, 15, 400, '#51475c');
    });
    label(70, 904, 'ESTIMATED TOTAL FOR TWO', 17, 700, '#675f72');
    label(70, 960, money(plan.totalCents), 52, 800);
    label(70, 1002, `${money(plan.remainingCents)} left from your ${money(plan.budgetCents)} budget`, 23, 400);
    label(70, 1073, 'The best part of the plan? Who you share it with.', 24, 700, '#7042d2');
    label(70, 1126, 'Illustrative estimates for two. Confirm full quotes.', 17, 400, '#675f72');
    label(70, 1155, 'Free ideas use items or access you already have.', 17, 400, '#675f72');
    return new XMLSerializer().serializeToString(root);
  }
  function download(plan, format = 'svg') {
    const isText = format === 'txt';
    const blob = new Blob([isText ? text(plan) : svg(plan)], { type: isText ? 'text/plain;charset=utf-8' : 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `date-night-mash-${isText ? 'plan.txt' : 'date-card.svg'}`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { download, text };
})();
