(function () {
  "use strict";
  const data = window.STUDY_DATA;
  const app = document.getElementById("app");
  const storeKey = "wordbridge-ielts-vocab-v1";
  const blankState = { results: {}, favorites: [], wrong: [] };
  let state;
  let activePassage = 0;
  let reviewFilter = "all";
  let reviewSearch = "";
  try {
    state = Object.assign({}, blankState, JSON.parse(localStorage.getItem(storeKey) || "{}"));
    if (!state.results || Array.isArray(state.results)) state.results = {};
    if (!Array.isArray(state.favorites)) state.favorites = [];
    if (!Array.isArray(state.wrong)) state.wrong = [];
  } catch (_) { state = Object.assign({}, blankState); }
  function save() {
    try { localStorage.setItem(storeKey, JSON.stringify(state)); } catch (_) {}
    updateProgress();
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function termById(id) { return data.vocabulary.find(function (item) { return item.id === id; }); }
  function passageById(id) { return data.passages.find(function (item) { return item.id === id; }); }
  function completedCount() { return Object.keys(state.results).filter(function (id) { return !!state.results[id]; }).length; }
  function syncWrong() {
    const wrong = new Set();
    Object.keys(state.results).forEach(function (passageId) {
      const passage = passageById(passageId);
      const result = state.results[passageId];
      if (!passage || !result) return;
      passage.questions.forEach(function (question) {
        if ((result.correctIds || []).indexOf(question.id) < 0 && question.targetId) wrong.add(question.targetId);
      });
    });
    state.wrong = Array.from(wrong);
  }
  function updateProgress() {
    const count = document.getElementById("top-progress-count");
    const fill = document.getElementById("top-progress-fill");
    if (count) count.textContent = completedCount() + " / " + data.passages.length;
    if (fill) fill.style.width = (completedCount() / data.passages.length * 100) + "%";
  }
  function nav(active) {
    document.querySelectorAll(".nav-link").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.action === active);
    });
  }
  function renderHome() {
    nav("home");
    const done = completedCount();
    const attempted = Object.keys(state.results).length;
    const correctTotal = Object.keys(state.results).reduce(function (sum, id) { return sum + (state.results[id].score || 0); }, 0);
    const questionTotal = Object.keys(state.results).reduce(function (sum, id) {
      const passage = passageById(id);
      return sum + (passage ? passage.questions.length : 0);
    }, 0);
    const avg = questionTotal ? Math.round(correctTotal / questionTotal * 100) : 0;
    let cards = "";
    data.passages.forEach(function (p) {
      const result = state.results[p.id];
      cards += '<button class="lesson-card ' + (result ? "is-done" : "") + '" type="button" data-action="open-passage" data-id="' + p.id + '">' +
        '<span class="lesson-top"><span class="lesson-number">READING ' + String(p.number).padStart(2, "0") + '</span><span class="lesson-state">' + (result ? "已完成 · " + result.score + "/" + p.questions.length : "开始学习 ↗") + '</span></span>' +
        '<strong>' + esc(p.title) + '</strong><span class="lesson-topic">' + esc(p.topicZh || p.topic || "主题阅读") + '</span>' +
        '<span class="lesson-meta">目标词 ' + p.targetIds.length + ' 个 <i>·</i> 练习 ' + p.questions.length + ' 题</span></button>';
    });
    const next = data.passages.find(function (p) { return !state.results[p.id]; }) || data.passages[0];
    app.innerHTML = '<section class="hero"><div class="hero-copy"><span class="eyebrow">READ TO REMEMBER</span><h1>把词汇放进<br><em>真实语境。</em></h1><p>读完一篇，再用题目检验理解。答案、原文依据和中文讲解会在提交后展开。</p>' +
      '<button class="primary-button" type="button" data-action="open-passage" data-id="' + next.id + '">继续下一篇 <span>→</span></button><div class="hero-note"><span class="note-dot"></span>原创阅读 · 即时批改 · 本机保存</div></div>' +
      '<div class="hero-art" aria-hidden="true"><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="art-book"><span>READING</span><strong>词汇<br>在语境<br>中生长</strong><i>LEARN BY READING</i></div><div class="art-chip chip-one">context</div><div class="art-chip chip-two">记忆</div><div class="art-spark">✳</div></div></section>' +
      '<section class="stats-row"><div class="stat"><strong>538</strong><span>资料词项</span></div><div class="stat"><strong>20</strong><span>篇原创阅读</span></div><div class="stat"><strong>' + done + '<small> / 20</small></strong><span>完成篇数</span></div><div class="stat"><strong>' + (attempted ? avg + "%" : "—") + '</strong><span>答题正确率</span></div></section>' +
      '<section class="section-heading"><div><span class="eyebrow">YOUR READING PATH</span><h2>学习路径</h2></div><button class="text-button" type="button" data-action="review">浏览全部词库 <span>→</span></button></section><section class="lesson-grid">' + cards + '</section>';
    updateProgress();
  }
  function highlightText(text, ids) {
    const targets = ids.map(termById).filter(Boolean).sort(function (a, b) { return b.word.length - a.word.length; });
    if (!targets.length) return esc(text);
    const pattern = new RegExp("\\b(" + targets.map(function (t) {
      return t.word.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    }).join("|") + ")\\b", "gi");
    let html = "";
    let last = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      html += esc(text.slice(last, match.index));
      const term = targets.find(function (t) { return t.word.toLowerCase() === match[0].toLowerCase(); });
      html += '<button type="button" class="inline-word" data-action="term" data-id="' + term.id + '">' + esc(match[0]) + '</button>';
      last = match.index + match[0].length;
    }
    return html + esc(text.slice(last));
  }
  function questionMarkup(q, index, prior) {
    const oldValue = prior && prior.answers ? prior.answers[q.id] : "";
    let input = "";
    if (q.type === "fill") {
      input = '<input class="fill-input" type="text" name="' + q.id + '" value="' + esc(oldValue) + '" placeholder="输入英文词或词组" autocomplete="off">';
    } else {
      input = '<div class="answer-options">' + q.options.map(function (option, i) {
        const checked = oldValue === option ? " checked" : "";
        return '<label class="answer-option"><input type="radio" name="' + q.id + '" value="' + esc(option) + '"' + checked + '><span class="option-letter">' + String.fromCharCode(65 + i) + '</span><span>' + esc(option) + '</span></label>';
      }).join("") + '</div>';
    }
    let feedback = "";
    if (prior) {
      const correct = prior.correctIds.indexOf(q.id) >= 0;
      feedback = '<div class="answer-feedback ' + (correct ? "is-correct" : "is-wrong") + '"><strong>' + (correct ? "回答正确" : "参考答案：" + esc(q.answer)) + '</strong><p>' + esc(q.explanation) + '</p><div class="evidence"><span>原文依据</span>“' + esc(q.evidence) + '”</div></div>';
    }
    return '<fieldset class="question-card"><legend><span class="question-number">' + String(index + 1).padStart(2, "0") + '</span><span class="question-label">' + esc(q.label) + '</span></legend><p class="question-prompt">' + esc(q.prompt) + '</p>' + input + feedback + '</fieldset>';
  }
  function targetCard(term, passage) {
    const context = passage.targetContexts[term.id] || {};
    return '<article class="vocab-card"><div class="vocab-head"><div><span class="vocab-pos">' + esc(term.pos) + '</span><h4>' + esc(term.word) + '</h4></div><button class="favorite-button ' + (state.favorites.indexOf(term.id) >= 0 ? "is-favorite" : "") + '" type="button" data-action="favorite" data-id="' + term.id + '" aria-label="收藏词条">★</button></div><p class="vocab-gloss">' + esc(term.gloss) + '</p><p class="usage-sentence">“' + esc(context.sentence || term.word) + '”</p><p class="usage-translation">' + esc(context.translation || term.gloss) + '</p><div class="vocab-source">资料第 ' + term.page + ' 页 · 词项序号 ' + term.rank + (term.parent ? ' · 替换线索' : '') + '</div></article>';
  }
  function contextExtension(p) {
    return '<details class="context-extension"><summary><span>目标词语境补充</span><small>' + p.targetIds.length + ' 个词 · 展开例句与译文 <b>＋</b></small></summary><div class="context-intro">原文后附本篇目标词的语境例句。点击英文词条可查看词性与 PDF 释义。</div><div class="context-list">' +
      p.targetIds.map(function (id) {
        const term = termById(id);
        const context = p.targetContexts[id] || {};
        return '<article class="context-item"><div><span class="vocab-pos">' + esc(term.pos) + ' · ' + esc(term.gloss) + '</span><p>' + highlightText(context.sentence || term.word, [id]) + '</p></div><p class="context-translation">' + esc(context.translation || term.gloss) + '</p></article>';
      }).join("") + '</div></details>';
  }
  function renderResult(p) {
    const result = state.results[p.id];
    if (!result) return "";
    return '<section class="result-panel"><div class="result-score"><div><span class="eyebrow">YOUR RESULT</span><h2>本篇得分</h2></div><strong>' + result.score + '<small> / ' + p.questions.length + '</small></strong></div><p class="result-message">' + (result.score === p.questions.length ? "全部答对，语境理解得很扎实。" : "已保存本次成绩。查看解析，理解每道题的依据。") + '</p>' +
      '<section class="translation-section"><div class="subsection-title"><span>01</span><div><h3>阅读译文</h3><p>逐段对照，确认文章理解</p></div></div><div class="translation-copy">' + esc(p.translation).split(/\n+/).filter(Boolean).map(function (part) { return "<p>" + part + "</p>"; }).join("") + '</div></section>' +
      '<section class="target-section"><div class="subsection-title"><span>02</span><div><h3>本篇目标词 <small>' + p.targetIds.length + ' 个</small></h3><p>词义、词性与文中用法</p></div></div><div class="vocab-grid">' + p.targetIds.map(function (id) { return targetCard(termById(id), p); }).join("") + '</div></section></section>';
  }
  function renderReader(p) {
    if (!p) return renderHome();
    nav("");
    activePassage = p.number;
    const result = state.results[p.id];
    const paragraphs = p.text.split(/\n+/).filter(Boolean).map(function (part) { return "<p>" + highlightText(part, p.targetIds) + "</p>"; }).join("");
    const index = p.number - 1;
    app.innerHTML = '<div class="reader-toolbar"><button class="back-button" type="button" data-action="home">← <span>学习路径</span></button><span class="reader-progress">READING ' + String(p.number).padStart(2, "0") + ' <i>/</i> ' + String(data.passages.length).padStart(2, "0") + '</span><div class="reader-arrows"><button type="button" data-action="previous" aria-label="上一篇"' + (index === 0 ? " disabled" : "") + '>←</button><button type="button" data-action="next" aria-label="下一篇"' + (index === data.passages.length - 1 ? " disabled" : "") + '>→</button></div></div>' +
      '<div class="reading-layout"><article class="reading-column"><div class="reading-heading"><span class="eyebrow">READING ' + String(p.number).padStart(2, "0") + ' · ' + esc(p.topic || "IELTS PRACTICE") + '</span><h1>' + esc(p.title) + '</h1><p>' + esc(p.topicZh || "雅思风格原创阅读") + ' <i>·</i> 约 ' + p.text.trim().split(/\s+/).length + ' 词 <i>·</i> 点击高亮词查看词义</p></div><div class="reading-text">' + paragraphs + '</div>' + contextExtension(p) + '<div class="reading-tip"><span>✳</span> 阅读时点击文中的高亮词，可快速查看词性与释义。</div></article>' +
      '<aside class="practice-column"><div class="practice-heading"><span class="eyebrow">CHECK YOUR UNDERSTANDING</span><h2>阅读练习</h2><p>选出最合适的答案，提交后查看解析。</p></div><form id="quiz-form">' + p.questions.map(function (q, i) { return questionMarkup(q, i, result); }).join("") +
      '<button class="primary-button submit-button" type="submit">' + (result ? "重新提交答案" : "提交并查看批改") + ' <span>→</span></button></form>' +
      (result ? '<button class="secondary-button reset-button" type="button" data-action="reset" data-id="' + p.id + '">清空答案重新作答</button>' : '<div class="privacy-note">提交后显示参考答案、原文依据与本篇译文。</div>') + '</aside></div>' + renderResult(p);
    updateProgress();
  }
  function dictionaryCard(term) {
    return '<article class="dictionary-card"><div class="dictionary-card-top"><span class="vocab-pos">' + esc(term.pos) + '</span><button class="favorite-button ' + (state.favorites.indexOf(term.id) >= 0 ? "is-favorite" : "") + '" type="button" data-action="favorite" data-id="' + term.id + '" aria-label="收藏">★</button></div><button class="dictionary-word" type="button" data-action="term" data-id="' + term.id + '">' + esc(term.word) + '</button><p>' + esc(term.gloss) + '</p><small>' + (term.isAlias ? "同义替换 · " + esc(term.parent) : "资料词条") + ' · 第 ' + term.page + ' 页</small></article>';
  }
  function renderReview() {
    nav("review");
    const terms = data.vocabulary.filter(function (term) {
      if (reviewFilter === "favorites" && state.favorites.indexOf(term.id) < 0) return false;
      if (reviewFilter === "wrong" && state.wrong.indexOf(term.id) < 0) return false;
      if (reviewFilter.indexOf("cat-") === 0 && String(term.category) !== reviewFilter.slice(4)) return false;
      const query = reviewSearch.trim().toLowerCase();
      return !query || term.word.toLowerCase().indexOf(query) >= 0 || term.gloss.toLowerCase().indexOf(query) >= 0;
    });
    const filters = [["all","全部 538"],["cat-1","第一组 54"],["cat-2","第二组 171"],["cat-3","第三组 313"],["wrong","错题 "+state.wrong.length],["favorites","收藏 "+state.favorites.length]];
    app.innerHTML = '<section class="review-hero"><span class="eyebrow">VOCABULARY LIBRARY</span><h1>词库复习</h1><p>按资料顺序整理的 538 个词项。搜索英文或中文释义，标记需要回看的词。</p><label class="search-box"><span>⌕</span><input id="review-search" type="search" placeholder="搜索英文或中文释义…" value="' + esc(reviewSearch) + '"><kbd>538</kbd></label></section>' +
      '<div class="filter-row">' + filters.map(function (item) { return '<button type="button" class="filter-pill ' + (reviewFilter === item[0] ? "is-selected" : "") + '" data-action="filter" data-filter="' + item[0] + '">' + item[1] + '</button>'; }).join("") + '</div>' +
      '<div class="review-summary"><span>显示 <strong>' + terms.length + '</strong> 个词项</span><span>来源：PDF 第 1–14 页</span></div><section class="dictionary-grid">' +
      (terms.length ? terms.map(dictionaryCard).join("") : '<div class="empty-state">还没有符合条件的词条。试试其他筛选或搜索词。</div>') + '</section>';
    const input = document.getElementById("review-search");
    if (input) input.addEventListener("input", function () {
      reviewSearch = input.value;
      const scrollY = window.scrollY;
      renderReview();
      const next = document.getElementById("review-search");
      next.focus();
      next.setSelectionRange(reviewSearch.length, reviewSearch.length);
      window.scrollTo(0, scrollY);
    });
  }
  function openTerm(id) {
    const term = termById(id);
    if (!term) return;
    const related = data.passages.find(function (p) { return p.targetIds.indexOf(id) >= 0; });
    const dialog = document.getElementById("word-dialog");
    document.getElementById("word-dialog-content").innerHTML = '<span class="eyebrow">VOCABULARY NOTE</span><h2>' + esc(term.word) + '</h2><p class="dialog-gloss">' + esc(term.gloss) + '</p><span class="vocab-pos">' + esc(term.pos) + '</span><div class="dialog-meta">资料第 ' + term.page + ' 页 · 词项序号 ' + term.rank + '</div>' + (related ? '<p class="dialog-context">学习单元：' + esc(related.title) + '</p>' : '') + '<button class="secondary-button" type="button" data-action="favorite" data-id="' + term.id + '">' + (state.favorites.indexOf(term.id) >= 0 ? "★ 已收藏" : "☆ 加入收藏") + '</button>';
    if (typeof dialog.showModal === "function") dialog.showModal();
  }
  function normalized(value) { return String(value || "").trim().toLowerCase().replace(/[“”"'.,!?;:()[\]{}]/g, "").replace(/\s+/g, " "); }
  function submitQuiz(form, passage) {
    const answers = {};
    const correctIds = [];
    passage.questions.forEach(function (q) {
      const field = form.elements[q.id];
      const value = field && field.type === "radio" ? ((form.querySelector('input[name="' + q.id + '"]:checked') || {}).value || "") : (field ? field.value : "");
      answers[q.id] = value;
      const accepted = q.acceptedAnswers || [q.answer];
      if (accepted.some(function (answer) { return normalized(answer) === normalized(value); })) correctIds.push(q.id);
    });
    state.results[passage.id] = { score: correctIds.length, answers: answers, correctIds: correctIds, date: new Date().toISOString() };
    syncWrong();
    save();
    renderReader(passage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "home") renderHome();
    if (action === "review") renderReview();
    if (action === "open-passage") renderReader(passageById(button.dataset.id));
    if (action === "previous" || action === "next") {
      const number = activePassage + (action === "next" ? 1 : -1);
      if (data.passages[number - 1]) renderReader(data.passages[number - 1]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (action === "term") openTerm(button.dataset.id);
    if (action === "favorite") {
      const id = button.dataset.id;
      state.favorites = state.favorites.indexOf(id) >= 0 ? state.favorites.filter(function (x) { return x !== id; }) : state.favorites.concat(id);
      save();
      if (app.querySelector(".dictionary-grid")) renderReview();
      else if (activePassage) renderReader(data.passages[activePassage - 1]);
      else renderHome();
      const dialog = document.getElementById("word-dialog");
      if (dialog.open) openTerm(id);
    }
    if (action === "filter") { reviewFilter = button.dataset.filter; renderReview(); }
    if (action === "reset") { delete state.results[button.dataset.id]; syncWrong(); save(); renderReader(passageById(button.dataset.id)); }
  });
  document.addEventListener("submit", function (event) {
    if (event.target.id !== "quiz-form") return;
    event.preventDefault();
    submitQuiz(event.target, data.passages[activePassage - 1]);
  });
  renderHome();
})();
