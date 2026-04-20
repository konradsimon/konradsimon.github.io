function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "class") node.className = v;
    else if (k === "href") node.setAttribute("href", v);
    else if (k === "target") node.setAttribute("target", v);
    else if (k === "rel") node.setAttribute("rel", v);
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

function addSection(container, heading, contentNode) {
  container.append(el("p", { text: heading }));
  container.append(contentNode);
  container.append(el("br"));
}

async function loadProject(slug) {
  const res = await fetch(`content/projects/${encodeURIComponent(slug)}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Project not found: ${slug}`);
  return await res.json();
}

function renderProject(project) {
  const titleEl = document.getElementById("projectTitle");
  const content = document.getElementById("projectContent");
  content.innerHTML = "";

  const title = String(project.title || "").trim() || project.slug || "Project";
  titleEl.textContent = title;
  document.title = `${title} – Konrad Simon`;

  if (project.subtitle) {
    content.append(el("p", { text: String(project.subtitle) }));
    content.append(el("br"));
  }

  content.append(
    el("p", {}, [
      el("a", { href: "index.html", text: "Home" }),
      document.createTextNode(" · "),
      el("a", { href: "admin/", text: "Admin" }),
    ]),
  );
  content.append(el("br"));

  if (project.role) {
    addSection(content, "Role", el("p", { text: String(project.role) }));
  }

  const participants = Array.isArray(project.participants) ? project.participants.filter(Boolean) : [];
  if (participants.length) {
    addSection(content, "Participants", el("p", { text: participants.join(", ") }));
  }

  if (project.videoUrl) {
    const url = String(project.videoUrl);
    addSection(
      content,
      "Video",
      el("p", {}, [el("a", { href: url, target: "_blank", rel: "noreferrer", text: url })]),
    );
  }

  if (project.description) {
    const desc = String(project.description);
    const lines = desc.split(/\r?\n/);
    const p = el("p", {});
    for (let i = 0; i < lines.length; i++) {
      if (i) p.append(el("br"));
      p.append(document.createTextNode(lines[i]));
    }
    addSection(content, "Description", p);
  }

  const photos = Array.isArray(project.photos) ? project.photos.filter(Boolean) : [];
  if (photos.length) {
    content.append(el("p", { text: "Photos" }));
    const wrap = el("p");
    for (const src of photos) {
      wrap.append(el("img", { src, alt: "" }));
    }
    content.append(wrap);
  }
}

async function main() {
  const slug = qs("slug") || "example";
  try {
    const project = await loadProject(slug);
    renderProject(project);
  } catch (err) {
    document.getElementById("projectTitle").textContent = "Not found";
    const content = document.getElementById("projectContent");
    content.innerHTML = "";
    content.append(
      el("p", {}, [
        document.createTextNode("No project found for slug "),
        el("strong", { text: slug }),
        document.createTextNode("."),
      ]),
    );
    content.append(el("br"));
    content.append(el("p", {}, [el("a", { href: "index.html", text: "Back to home" })]));
  }
}

main();

