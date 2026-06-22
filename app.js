const UI_STORAGE_KEY = "codex-study-wiki-ui-v1";

const els = {
  topicForm: document.querySelector("#topicForm"),
  topicInput: document.querySelector("#topicInput"),
  newButton: document.querySelector("#newButton"),
  searchInput: document.querySelector("#searchInput"),
  docList: document.querySelector("#docList"),
  conceptList: document.querySelector("#conceptList"),
  conceptCount: document.querySelector("#conceptCount"),
  breadcrumb: document.querySelector("#breadcrumb"),
  docTitle: document.querySelector("#docTitle"),
  docSummary: document.querySelector("#docSummary"),
  requestDocButton: document.querySelector("#requestDocButton"),
  exportButton: document.querySelector("#exportButton"),
  notice: document.querySelector("#notice"),
  requestPanel: document.querySelector("#requestPanel"),
  requestTitle: document.querySelector("#requestTitle"),
  requestMeta: document.querySelector("#requestMeta"),
  requestPrompt: document.querySelector("#requestPrompt"),
  copyRequestButton: document.querySelector("#copyRequestButton"),
  copyHashButton: document.querySelector("#copyHashButton"),
  copyStatus: document.querySelector("#copyStatus"),
  closeRequestButton: document.querySelector("#closeRequestButton"),
  documentBody: document.querySelector("#documentBody"),
  elementSection: document.querySelector("#elementSection"),
  elementList: document.querySelector("#elementList"),
  metaId: document.querySelector("#metaId"),
  metaParents: document.querySelector("#metaParents"),
  metaChildren: document.querySelector("#metaChildren"),
  metaUpdated: document.querySelector("#metaUpdated")
};

const state = {
  data: normalizeData(window.STUDY_WIKI_DATA || { docs: {} }),
  currentId: null,
  pendingRequest: null,
  collapsedDocIds: new Set()
};

loadUiState();
readHashRequest();
render();
bindEvents();

function bindEvents() {
  els.topicForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const topic = els.topicInput.value.trim();
    if (!topic) return;
    openOrRequestTopic(topic);
  });

  els.newButton.addEventListener("click", () => {
    els.topicInput.focus();
    els.topicInput.select();
  });

  els.searchInput.addEventListener("input", renderDocList);

  els.requestDocButton.addEventListener("click", () => {
    const doc = currentDoc();
    if (!doc) return;
    createCodexRequest({
      label: `${doc.title}の詳細分解`,
      parentDoc: doc,
      reason: "現在の文書をさらに細かく分解して理解するため。",
      source: "document-action"
    });
  });

  els.exportButton.addEventListener("click", exportData);

  els.copyRequestButton.addEventListener("click", async () => {
    if (!state.pendingRequest) return;
    const result = await copyText(state.pendingRequest.prompt);
    showCopyResult(result, "依頼文");
  });

  els.copyHashButton.addEventListener("click", async () => {
    const result = await copyText(window.location.href);
    showCopyResult(result, "URL依頼");
  });

  els.closeRequestButton.addEventListener("click", () => {
    state.pendingRequest = null;
    if (location.hash.startsWith("#codex-request=")) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    renderRequestPanel();
  });

  els.documentBody.addEventListener("contextmenu", (event) => {
    const selectedText = getSelectedText();
    if (!selectedText) return;
    event.preventDefault();
    showSelectionMenu(selectedText, event.clientX, event.clientY);
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".selection-menu")) return;
    closeSelectionMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSelectionMenu();
  });
}

function openOrRequestTopic(topic) {
  const existing = findDocByConcept(topic);
  if (existing) {
    openDoc(existing.id);
    return;
  }

  createCodexRequest({
    label: topic,
    parentDoc: null,
    reason: "新しいルート題材として文書を作るため。",
    source: "topic"
  });
}

function requestFromSelection(selectedText) {
  const label = cleanupSelection(selectedText);
  if (!label) return;

  const existing = findDocByConcept(label);
  if (existing) {
    openDoc(existing.id);
    showNotice(`「${label}」の既存文書を開きました。`);
    return;
  }

  createCodexRequest({
    label,
    parentDoc: currentDoc(),
    reason: "本文中で選択した語句を理解するため。",
    source: "selection"
  });
}

function searchSelectionInBrowser(selectedText) {
  const label = cleanupSelection(selectedText);
  if (!label) return;
  window.open(`https://www.google.com/search?q=${encodeURIComponent(label)}`, "_blank", "noopener");
}

function createCodexRequest({ label, parentDoc, reason, source }) {
  const request = {
    version: 1,
    action: "generate-doc",
    label,
    key: conceptKey(label),
    source,
    reason,
    parentId: parentDoc?.id || null,
    parentTitle: parentDoc?.title || null,
    parentSummary: parentDoc?.summary || null,
    selectionText: source === "selection" ? label : null,
    createdAt: new Date().toISOString()
  };
  request.prompt = buildCodexPrompt(request, parentDoc);
  state.pendingRequest = request;
  updateRequestHash(request);
  renderRequestPanel();
  emphasizeRequestPanel();
  showNotice("生成依頼を作りました。");
}

function buildCodexPrompt(request, parentDoc) {
  const parentBlock = parentDoc
    ? [
        `親文書ID: ${parentDoc.id}`,
        `親文書タイトル: ${parentDoc.title}`,
        `親文書要約: ${parentDoc.summary}`,
        "親文書の本文抜粋:",
        parentDoc.markdown.slice(0, 1800)
      ].join("\n")
    : "親文書なし。ルート文書として作成。";

  return [
    "Codex生成依頼:",
    `対象要素: ${request.label}`,
    `対象key: ${request.key}`,
    `生成元: ${request.source}`,
    `理由: ${request.reason}`,
    parentBlock,
    "",
    "作業内容:",
    "1. data.js の window.STUDY_WIKI_DATA.docs に、この対象要素の新しい文書を追加してください。",
    "2. 新規文書IDは英数字とハイフンの短いIDにしてください。",
    "3. 新規文書には title, key, summary, markdown, elements, aliases, parentLinks, createdAt, updatedAt を入れてください。",
    "4. 親文書がある場合、新規文書の parentLinks に { docId, title, elementKey, elementLabel, source } を入れてください。",
    "5. 生成元が selection の場合、elementLabel は本文で選択された語句そのものにしてください。親本文は編集しなくても、アプリが parentLinks を見て自動で本文内リンクにします。",
    "6. 既存文書の elements に同じ key がある場合は linkedDocId を新しい文書IDにしてください。",
    "7. 文書は日本語で、網羅的かつ詳細に説明してください。",
    "8. markdown本文と、理解に必要な細かい要素 8から18個を elements に入れてください。",
    "9. 既存の data.js の書式に合わせ、外部APIやlocalStorageは使わないでください。"
  ].join("\n");
}

function updateRequestHash(request) {
  const hashPayload = {
    action: request.action,
    label: request.label,
    key: request.key,
    parentId: request.parentId,
    parentTitle: request.parentTitle,
    reason: request.reason,
    source: request.source,
    selectionText: request.selectionText || null
  };
  const encoded = encodeURIComponent(JSON.stringify(hashPayload));
  history.replaceState(null, "", `${location.pathname}${location.search}#codex-request=${encoded}`);
}

function readHashRequest() {
  if (!location.hash.startsWith("#codex-request=")) return;
  try {
    const raw = decodeURIComponent(location.hash.replace("#codex-request=", ""));
    const request = JSON.parse(raw);
    const parentDoc = request.parentId ? state.data.docs[request.parentId] : null;
    request.createdAt = request.createdAt || new Date().toISOString();
    request.prompt = buildCodexPrompt(request, parentDoc);
    state.pendingRequest = request;
  } catch {
    state.pendingRequest = null;
  }
}

function render() {
  renderDocList();
  renderConceptList();
  renderCurrentDocument();
  renderRequestPanel();
}

function renderDocList() {
  const query = conceptKey(els.searchInput.value || "");
  const tree = buildDocTree();
  const allDocs = Object.values(state.data.docs);
  const matchedIds = new Set(
    query ? allDocs.filter((doc) => docMatchesQuery(doc, query)).map((doc) => doc.id) : allDocs.map((doc) => doc.id)
  );
  const visibleIds = query ? collectVisibleDocIds(matchedIds, tree) : new Set(allDocs.map((doc) => doc.id));

  els.docList.innerHTML = "";
  if (!visibleIds.size) {
    const empty = document.createElement("p");
    empty.className = "muted small";
    empty.textContent = "一致する文書はありません。";
    els.docList.append(empty);
    return;
  }

  const renderedIds = new Set();
  tree.roots
    .filter((doc) => visibleIds.has(doc.id))
    .forEach((doc) => {
      appendDocTreeItem(doc, 0, tree, visibleIds, matchedIds, renderedIds, Boolean(query));
    });

  allDocs
    .filter((doc) => visibleIds.has(doc.id) && !renderedIds.has(doc.id))
    .filter((doc) => !tree.parentById.has(doc.id))
    .sort(sortDocsByTitle)
    .forEach((doc) => {
      appendDocTreeItem(doc, 0, tree, visibleIds, matchedIds, renderedIds, Boolean(query));
    });
}

function buildDocTree() {
  const docs = Object.values(state.data.docs);
  const childrenByParent = new Map();
  const parentById = new Map();

  docs.forEach((doc) => {
    const parent = primaryParentLink(doc);
    if (!parent || !state.data.docs[parent.docId] || parent.docId === doc.id) return;
    parentById.set(doc.id, parent);
    if (!childrenByParent.has(parent.docId)) {
      childrenByParent.set(parent.docId, []);
    }
    childrenByParent.get(parent.docId).push(doc);
  });

  childrenByParent.forEach((children, parentId) => {
    children.sort((a, b) => sortDocsByParentOrder(parentId, a, b));
  });

  const roots = docs
    .filter((doc) => !parentById.has(doc.id))
    .sort(sortDocsByTitle);

  return { roots, childrenByParent, parentById };
}

function primaryParentLink(doc) {
  return doc.parentLinks && doc.parentLinks.length ? doc.parentLinks[0] : null;
}

function docMatchesQuery(doc, query) {
  if (!query) return true;
  const aliases = doc.aliases || [];
  const elements = (doc.elements || []).map((element) => `${element.label} ${element.reason || ""}`);
  return conceptKey([doc.title, doc.key, doc.summary, ...aliases, ...elements].join(" ")).includes(query);
}

function collectVisibleDocIds(matchedIds, tree) {
  const visibleIds = new Set();
  matchedIds.forEach((id) => {
    addAncestors(id, tree, visibleIds);
    addDescendants(id, tree, visibleIds);
  });
  return visibleIds;
}

function addAncestors(docId, tree, visibleIds) {
  const seen = new Set();
  let currentId = docId;
  while (currentId && !seen.has(currentId) && state.data.docs[currentId]) {
    seen.add(currentId);
    visibleIds.add(currentId);
    currentId = tree.parentById.get(currentId)?.docId || null;
  }
}

function addDescendants(docId, tree, visibleIds) {
  if (!state.data.docs[docId]) return;
  visibleIds.add(docId);
  (tree.childrenByParent.get(docId) || []).forEach((child) => addDescendants(child.id, tree, visibleIds));
}

function appendDocTreeItem(doc, depth, tree, visibleIds, matchedIds, renderedIds, isFiltered) {
  if (renderedIds.has(doc.id)) return;
  renderedIds.add(doc.id);
  const children = (tree.childrenByParent.get(doc.id) || []).filter((child) => visibleIds.has(child.id));
  const isCollapsed = state.collapsedDocIds.has(doc.id);
  const parent = tree.parentById.get(doc.id);
  const wrapper = document.createElement("div");
  wrapper.className = `doc-tree-row ${depth > 0 ? "is-child" : "is-root"}`;
  if (children.length) wrapper.classList.add("has-children");
  if (isCollapsed) wrapper.classList.add("is-collapsed");
  wrapper.style.setProperty("--depth", String(Math.min(depth, 5)));

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "doc-tree-toggle";
  toggle.disabled = !children.length;
  toggle.textContent = children.length ? (isCollapsed ? "＋" : "−") : "";
  toggle.title = children.length ? (isCollapsed ? "子文書を表示" : "子文書を非表示") : "";
  toggle.setAttribute("aria-label", children.length ? toggle.title : "子文書なし");
  toggle.setAttribute("aria-expanded", children.length ? String(!isCollapsed) : "false");
  toggle.addEventListener("click", () => {
    toggleDocCollapse(doc.id);
  });
  wrapper.append(toggle);

  const button = document.createElement("button");
  button.type = "button";
  button.className = `doc-item ${doc.id === state.currentId ? "is-active" : ""}`;
  if (isFiltered && !matchedIds.has(doc.id)) {
    button.classList.add("is-context");
  }
  button.innerHTML = `
    <span class="doc-node-title">
      <span class="doc-node-badge"></span>
      <strong></strong>
    </span>
    <span class="doc-node-meta"></span>
  `;
  button.querySelector(".doc-node-badge").textContent = parent ? "子" : children.length ? "親" : "ルート";
  button.querySelector("strong").textContent = doc.title;
  button.querySelector(".doc-node-meta").textContent = formatDocTreeMeta(doc, parent, children.length, isCollapsed);
  button.addEventListener("click", () => openDoc(doc.id));
  wrapper.append(button);
  els.docList.append(wrapper);

  if (isCollapsed) return;
  children.forEach((child) => {
    appendDocTreeItem(child, depth + 1, tree, visibleIds, matchedIds, renderedIds, isFiltered);
  });
}

function formatDocTreeMeta(doc, parent, childCount, isCollapsed) {
  const childText = childCount ? `子 ${childCount}${isCollapsed ? " 非表示" : ""}` : "子なし";
  if (!parent) {
    return `ルート文書 / ${childText} / ${doc.elements.length} 要素`;
  }
  const parentTitle = state.data.docs[parent.docId]?.title || parent.title || "親文書";
  return `親 ${parentTitle} > ${parent.elementLabel || doc.title} / ${childText}`;
}

function toggleDocCollapse(docId) {
  if (state.collapsedDocIds.has(docId)) {
    state.collapsedDocIds.delete(docId);
  } else {
    state.collapsedDocIds.add(docId);
  }
  saveUiState();
  renderDocList();
}

function sortDocsByParentOrder(parentId, a, b) {
  const parent = state.data.docs[parentId];
  const aIndex = parent?.elements?.findIndex((element) => element.linkedDocId === a.id) ?? -1;
  const bIndex = parent?.elements?.findIndex((element) => element.linkedDocId === b.id) ?? -1;
  const safeA = aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex;
  const safeB = bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex;
  return safeA - safeB || sortDocsByTitle(a, b);
}

function sortDocsByTitle(a, b) {
  return a.title.localeCompare(b.title, "ja");
}

function renderConceptList() {
  const docs = Object.values(state.data.docs).sort((a, b) => a.title.localeCompare(b.title, "ja"));
  els.conceptCount.textContent = String(docs.length);
  els.conceptList.innerHTML = "";

  docs.forEach((doc) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "concept-item";
    button.innerHTML = "<strong></strong><span></span>";
    button.querySelector("strong").textContent = doc.title;
    button.querySelector("span").textContent = `${incomingLinkCount(doc.id)} 箇所から参照`;
    button.addEventListener("click", () => openDoc(doc.id));
    els.conceptList.append(button);
  });
}

function renderCurrentDocument() {
  const doc = currentDoc();
  if (!doc) {
    els.breadcrumb.textContent = "";
    els.docTitle.textContent = "文書がありません";
    els.docSummary.textContent = "題材を入力すると新しい文書の候補を作れます。";
    els.documentBody.innerHTML = "";
    els.elementList.innerHTML = "";
    els.elementSection.hidden = true;
    renderMeta(null);
    return;
  }

  els.elementSection.hidden = false;
  els.breadcrumb.textContent = buildBreadcrumb(doc);
  els.docTitle.textContent = doc.title;
  els.docSummary.textContent = doc.summary;
  renderMarkdown(doc.markdown, els.documentBody);
  linkDocumentInline(els.documentBody, doc);
  renderElements(doc);
  renderMeta(doc);
}

function renderElements(doc) {
  els.elementList.innerHTML = "";
  doc.elements.forEach((element) => {
    const linkedDoc = element.linkedDocId ? state.data.docs[element.linkedDocId] : findDocByConcept(element.label);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "element-button";
    button.innerHTML = `
      <strong></strong>
      <span class="reason"></span>
      <span class="element-meta">
        <span class="tag category"></span>
        <span class="tag difficulty"></span>
        <span class="tag linked-state"></span>
      </span>
    `;
    button.querySelector("strong").textContent = element.label;
    button.querySelector(".reason").textContent = element.reason || "この要素を詳しく学びます。";
    button.querySelector(".category").textContent = element.category || "その他";
    button.querySelector(".difficulty").textContent = element.difficulty || "標準";
    const linkedTag = button.querySelector(".linked-state");
    linkedTag.textContent = linkedDoc ? "文書あり" : "未作成";
    linkedTag.classList.toggle("linked", Boolean(linkedDoc));
    button.addEventListener("click", () => {
      if (linkedDoc) {
        openDoc(linkedDoc.id);
      } else {
        createCodexRequest({
          label: element.label,
          parentDoc: doc,
          reason: element.reason || "この要素の解説文書を作るため。",
          source: "element"
        });
      }
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      createCodexRequest({
        label: element.label,
        parentDoc: doc,
        reason: element.reason || "この要素の解説文書を作るため。",
        source: "element-contextmenu"
      });
    });
    els.elementList.append(button);
  });
}

function renderMeta(doc) {
  if (!doc) {
    els.metaId.textContent = "-";
    els.metaParents.textContent = "-";
    els.metaChildren.textContent = "-";
    els.metaUpdated.textContent = "-";
    return;
  }

  els.metaId.textContent = doc.id;
  els.metaParents.textContent = doc.parentLinks.length
    ? doc.parentLinks.map((link) => `${link.title} > ${link.elementLabel}`).join(" / ")
    : "ルート文書";
  const children = doc.elements.filter((item) => item.linkedDocId && state.data.docs[item.linkedDocId]);
  els.metaChildren.textContent = children.length ? children.map((item) => item.label).join(" / ") : "なし";
  els.metaUpdated.textContent = formatDate(doc.updatedAt);
}

function renderRequestPanel() {
  const request = state.pendingRequest;
  els.requestPanel.hidden = !request;
  if (!request) return;
  els.requestTitle.textContent = `「${request.label}」の生成依頼`;
  els.requestMeta.textContent = request.parentTitle
    ? `親文書: ${request.parentTitle}`
    : "ルート文書として作成";
  els.requestPrompt.value = request.prompt;
  els.copyStatus.textContent = "生成依頼が作成されています。";
  els.copyStatus.className = "copy-status";
}

function renderMarkdown(markdown, container) {
  container.innerHTML = "";
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const p = document.createElement("p");
    p.innerHTML = renderInline(paragraph.join(" "));
    container.append(p);
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    container.append(list.node);
    list = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = /^(#{2,4})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      const h = document.createElement(heading[1].length === 2 ? "h2" : "h3");
      h.innerHTML = renderInline(heading[2]);
      container.append(h);
      return;
    }

    const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.+)$/.exec(trimmed);
    if (bullet || numbered) {
      flushParagraph();
      const type = bullet ? "ul" : "ol";
      if (!list || list.type !== type) {
        flushList();
        list = { type, node: document.createElement(type) };
      }
      const li = document.createElement("li");
      li.innerHTML = renderInline((bullet || numbered)[1]);
      list.node.append(li);
      return;
    }

    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
}

function renderInline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function linkDocumentInline(container, doc) {
  const targets = getInlineTargets(doc);
  if (!targets.length) return;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest("button, a, code, textarea")) return NodeFilter.FILTER_REJECT;
      return targets.some((target) => node.nodeValue.includes(target.label))
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => linkTextNode(node, targets));
}

function getInlineTargets(doc) {
  const targets = [];
  const addTarget = (label, docId) => {
    const cleanLabel = cleanupSelection(label);
    if (!cleanLabel || !docId || docId === doc.id || !state.data.docs[docId]) return;
    const key = `${conceptKey(cleanLabel)}:${docId}`;
    if (targets.some((target) => target.key === key)) return;
    targets.push({ label: cleanLabel, docId, key });
  };

  doc.elements.forEach((element) => {
    const linkedDoc = element.linkedDocId ? state.data.docs[element.linkedDocId] : findDocByConcept(element.label);
    if (linkedDoc) addTarget(element.label, linkedDoc.id);
  });

  Object.values(state.data.docs).forEach((childDoc) => {
    childDoc.parentLinks.forEach((link) => {
      if (link.docId === doc.id) {
        addTarget(link.elementLabel || childDoc.title, childDoc.id);
      }
    });
  });

  return targets.sort((a, b) => b.label.length - a.label.length);
}

function linkTextNode(textNode, targets) {
  const text = textNode.nodeValue;
  let best = null;
  targets.forEach((target) => {
    const index = text.indexOf(target.label);
    if (index < 0) return;
    if (!best || index < best.index || (index === best.index && target.label.length > best.target.label.length)) {
      best = { target, index };
    }
  });
  if (!best) return;

  const { target, index } = best;
  const before = text.slice(0, index);
  const match = text.slice(index, index + target.label.length);
  const after = text.slice(index + target.label.length);
  const fragment = document.createDocumentFragment();
  if (before) fragment.append(document.createTextNode(before));
  const button = document.createElement("button");
  button.type = "button";
  button.className = "inline-doc-link";
  button.textContent = match;
  button.title = `${state.data.docs[target.docId].title} を開く`;
  button.addEventListener("click", () => openDoc(target.docId));
  fragment.append(button);
  if (after) fragment.append(document.createTextNode(after));
  textNode.replaceWith(fragment);
}

function normalizeData(input) {
  const data = {
    version: input.version || 3,
    currentId: input.currentId || null,
    docs: input.docs || {}
  };
  Object.values(data.docs).forEach((doc) => {
    doc.key = doc.key || conceptKey(doc.title);
    doc.elements = Array.isArray(doc.elements) ? doc.elements : [];
    doc.aliases = Array.isArray(doc.aliases) ? doc.aliases : [doc.title];
    doc.parentLinks = Array.isArray(doc.parentLinks) ? doc.parentLinks : [];
  });
  relinkElements(data);
  if (!data.currentId || !data.docs[data.currentId]) {
    data.currentId = Object.keys(data.docs)[0] || null;
  }
  return data;
}

function relinkElements(data) {
  const index = buildConceptIndex(data);
  Object.values(data.docs).forEach((doc) => {
    doc.elements.forEach((element) => {
      element.key = element.key || conceptKey(element.label);
      if (!element.linkedDocId && index[element.key]) {
        element.linkedDocId = index[element.key];
      }
    });
  });
}

function buildConceptIndex(data = state.data) {
  const index = {};
  Object.values(data.docs).forEach((doc) => {
    [doc.key, doc.title, ...(doc.aliases || [])].forEach((name) => {
      index[conceptKey(name)] = doc.id;
    });
  });
  return index;
}

function findDocByConcept(name) {
  const key = conceptKey(name);
  const index = buildConceptIndex();
  const id = index[key];
  return id ? state.data.docs[id] || null : null;
}

function currentDoc() {
  return state.currentId ? state.data.docs[state.currentId] || null : null;
}

function openDoc(id) {
  if (!state.data.docs[id]) return;
  state.currentId = id;
  state.data.currentId = id;
  expandAncestorsOfDoc(id);
  saveUiState();
  render();
}

function expandAncestorsOfDoc(id) {
  const tree = buildDocTree();
  let parent = tree.parentById.get(id);
  const seen = new Set();
  while (parent && !seen.has(parent.docId)) {
    seen.add(parent.docId);
    state.collapsedDocIds.delete(parent.docId);
    parent = tree.parentById.get(parent.docId);
  }
}

function buildBreadcrumb(doc) {
  const parent = doc.parentLinks[0];
  return parent ? `${parent.title} / ${parent.elementLabel}` : "ルート文書";
}

function incomingLinkCount(docId) {
  let count = 0;
  Object.values(state.data.docs).forEach((doc) => {
    doc.elements.forEach((element) => {
      if (element.linkedDocId === docId) count += 1;
    });
  });
  return count;
}

function exportData() {
  const blob = new Blob([`window.STUDY_WIKI_DATA = ${JSON.stringify(state.data, null, 2)};\n`], {
    type: "text/javascript"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.js";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function loadUiState() {
  try {
    const ui = JSON.parse(localStorage.getItem(UI_STORAGE_KEY) || "{}");
    state.currentId = ui.currentId && state.data.docs[ui.currentId]
      ? ui.currentId
      : state.data.currentId;
    state.collapsedDocIds = new Set(
      Array.isArray(ui.collapsedDocIds)
        ? ui.collapsedDocIds.filter((id) => state.data.docs[id])
        : []
    );
  } catch {
    state.currentId = state.data.currentId;
    state.collapsedDocIds = new Set();
  }
}

function saveUiState() {
  localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({
    currentId: state.currentId,
    collapsedDocIds: [...state.collapsedDocIds]
  }));
}

function getSelectedText() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return "";
  return selection.toString();
}

function showSelectionMenu(selectedText, clientX, clientY) {
  const label = cleanupSelection(selectedText);
  if (!label) return;
  closeSelectionMenu();

  const existing = findDocByConcept(label);
  const menu = document.createElement("div");
  menu.className = "selection-menu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = `
    <p></p>
    <div class="selection-menu-actions">
      <button type="button" data-action="search">ブラウザで検索</button>
      <button type="button" data-action="request"></button>
    </div>
  `;
  menu.querySelector("p").textContent = `「${label}」`;
  menu.querySelector('[data-action="request"]').textContent = existing ? "文書を開く" : "生成依頼";
  menu.querySelector('[data-action="search"]').addEventListener("click", () => {
    searchSelectionInBrowser(label);
    closeSelectionMenu();
  });
  menu.querySelector('[data-action="request"]').addEventListener("click", () => {
    requestFromSelection(label);
    closeSelectionMenu();
  });
  document.body.append(menu);

  const margin = 10;
  const rect = menu.getBoundingClientRect();
  const left = Math.min(clientX, window.innerWidth - rect.width - margin);
  const top = Math.min(clientY, window.innerHeight - rect.height - margin);
  menu.style.left = `${Math.max(margin, left)}px`;
  menu.style.top = `${Math.max(margin, top)}px`;
}

function closeSelectionMenu() {
  document.querySelector(".selection-menu")?.remove();
}

function cleanupSelection(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/[。、「」『』]+$/g, "")
    .trim()
    .slice(0, 80);
}

function conceptKey(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[「」『』（）()[\]{}]/g, "")
    .replace(/\s+/g, "")
    .replace(/とは$/g, "")
    .replace(/[、。,.，．:：;；/／_-]+/g, "");
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return { ok: true, mode: "clipboard" };
    }
  } catch {
    // file:// では権限やセキュアコンテキストの制約で失敗することがあります。
  }

  try {
    els.requestPrompt.focus();
    els.requestPrompt.select();
    const ok = document.execCommand("copy");
    if (ok) return { ok: true, mode: "execCommand" };
  } catch {
    // 最後の手段としてテキストを選択したままにします。
  }

  els.requestPrompt.focus();
  els.requestPrompt.select();
  return { ok: false, mode: "manual" };
}

function showCopyResult(result, label) {
  const copied = result.ok;
  const message = copied
    ? `${label}をコピーしました。`
    : `${label}を選択しました。Ctrl+C でコピーしてください。`;
  els.copyStatus.textContent = message;
  els.copyStatus.className = `copy-status ${copied ? "is-success" : "is-manual"}`;
  showNotice(message);

  const button = label === "依頼文" ? els.copyRequestButton : els.copyHashButton;
  const original = button.textContent;
  button.textContent = copied ? "コピー済み" : "選択済み";
  button.classList.add(copied ? "is-copied" : "is-manual");
  clearTimeout(button.copyTimer);
  button.copyTimer = setTimeout(() => {
    button.textContent = original;
    button.classList.remove("is-copied", "is-manual");
  }, 1800);
}

function emphasizeRequestPanel() {
  els.requestPanel.classList.remove("is-fresh");
  requestAnimationFrame(() => {
    els.requestPanel.classList.add("is-fresh");
    els.requestPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  clearTimeout(emphasizeRequestPanel.timer);
  emphasizeRequestPanel.timer = setTimeout(() => {
    els.requestPanel.classList.remove("is-fresh");
  }, 2800);
}

function showNotice(message) {
  els.notice.hidden = false;
  els.notice.textContent = message;
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => {
    els.notice.hidden = true;
  }, 6500);
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
