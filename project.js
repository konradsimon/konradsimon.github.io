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

async function loadProject(slug) {
  const res = await fetch("content/projects.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Projects index not found");
  const data = await res.json();
  const list = Array.isArray(data?.projects) ? data.projects : [];
  const found = list.find((p) => String(p?.slug || "").trim() === slug);
  if (!found) throw new Error(`Project not found: ${slug}`);
  return found;
}

function asText(v) {
  return String(v ?? "").trim();
}

function parseYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.replace("/", "") || null;
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/embed/")[1]?.split(/[/?#]/)[0] || null;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/shorts/")[1]?.split(/[/?#]/)[0] || null;
    }
    return null;
  } catch {
    return null;
  }
}

function parseVimeoId(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("vimeo.com")) return null;
    const m = u.pathname.match(/\/(\d+)(?:$|\/)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function buildVideoEmbed(url) {
  const yt = parseYouTubeId(url);
  if (yt) {
    return el("iframe", {
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}`,
      title: "YouTube video",
      allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
      allowfullscreen: "",
      loading: "lazy",
      referrerpolicy: "strict-origin-when-cross-origin",
    });
  }
  const vim = parseVimeoId(url);
  if (vim) {
    return el("iframe", {
      src: `https://player.vimeo.com/video/${encodeURIComponent(vim)}`,
      title: "Vimeo video",
      allow: "autoplay; fullscreen; picture-in-picture",
      allowfullscreen: "",
      loading: "lazy",
    });
  }
  if (/\.(mp4|webm)(\?|#|$)/i.test(url)) {
    return el("video", { src: url, controls: "", playsinline: "", preload: "metadata" });
  }
  return null;
}

function buildDescription(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const p = el("p", { class: "sectionBody" });
  for (let i = 0; i < lines.length; i++) {
    if (i) p.append(el("br"));
    p.append(document.createTextNode(lines[i]));
  }
  return p;
}

function buildMeta(project) {
  const meta = el("div", { class: "projectMeta" });
  const rows = [];
  if (asText(project.role)) rows.push(["Role", asText(project.role)]);

  function multilineNode(text) {
    const lines = String(text ?? "").split(/\r?\n/);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < lines.length; i++) {
      if (i) frag.append(el("br"));
      frag.append(document.createTextNode(lines[i]));
    }
    return frag;
  }

  const creditsText = asText(project.credits);
  const participants = Array.isArray(project.participants) ? project.participants.filter(Boolean).map(asText).filter(Boolean) : [];
  if (creditsText) rows.push(["Credits", multilineNode(creditsText)]);
  else if (participants.length) rows.push(["Credits", participants.join(", ")]);

  if (asText(project.videoUrl)) {
    const url = asText(project.videoUrl);
    rows.push([
      "Video",
      el("a", { href: url, target: "_blank", rel: "noreferrer", text: url.replace(/^https?:\/\//, "") }),
    ]);
  }

  if (!rows.length) {
    meta.append(el("div", { class: "metaRow" }, [el("div", { class: "metaKey", text: "Info" }), el("div", { class: "metaVal", text: "—" })]));
    return meta;
  }

  for (const [k, v] of rows) {
    meta.append(
      el("div", { class: "metaRow" }, [
        el("div", { class: "metaKey", text: k }),
        el("div", { class: "metaVal" }, [typeof v === "string" ? document.createTextNode(v) : v]),
      ]),
    );
  }
  return meta;
}

function normalizePhotos(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((p) => {
      if (!p) return null;
      if (typeof p === "string") return { src: asText(p), credit: "" };
      const src = asText(p.image || p.src || "");
      const credit = asText(p.credit || "");
      if (!src) return null;
      return { src, credit };
    })
    .filter(Boolean);
}

const carouselLayoutRegistry = new WeakMap();

function carouselMaxViewportHeightPx() {
  return Math.min(window.innerHeight * 0.78, 900);
}

function applyCarouselViewportSizingFromFirstImage(carouselRoot, firstSrc) {
  const src = String(firstSrc || "").trim();
  if (!carouselRoot || !src) return;

  const viewport = carouselRoot.querySelector(".carouselViewport");
  const track = carouselRoot.querySelector(".carouselTrack");
  if (!viewport || !track) return;

  let ratioWoverH = null; // width / height of the *first* image

  function setRatioFromNatural(w, h) {
    const nw = Number(w);
    const nh = Number(h);
    if (!Number.isFinite(nw) || !Number.isFinite(nh) || nw <= 0 || nh <= 0) return false;
    ratioWoverH = nw / nh;
    return true;
  }

  function applyHeights() {
    if (!ratioWoverH) return;
    const w = Math.max(1, Math.floor(viewport.clientWidth || 0));
    if (!w) return;

    const maxH = carouselMaxViewportHeightPx();
    let h = w / ratioWoverH;
    if (h > maxH) h = maxH;

    const hPx = `${Math.max(1, Math.floor(h))}px`;
    carouselRoot.style.setProperty("--carousel-h", hPx);
  }

  // Re-apply on responsive width changes (and when the first image finishes loading).
  try {
    const prev = carouselLayoutRegistry.get(carouselRoot);
    if (prev?.ro) prev.ro.disconnect();
    if (prev?.onWin) window.removeEventListener("resize", prev.onWin);
  } catch {}

  const onWin = () => applyHeights();
  window.addEventListener("resize", onWin, { passive: true });

  let ro = null;
  if ("ResizeObserver" in window) {
    ro = new ResizeObserver(() => applyHeights());
    ro.observe(viewport);
  }

  carouselLayoutRegistry.set(carouselRoot, { ro, onWin });

  function armFirstDomImage(img) {
    if (!img) return;
    if (setRatioFromNatural(img.naturalWidth, img.naturalHeight)) {
      applyHeights();
      return;
    }
    img.addEventListener(
      "load",
      () => {
        if (setRatioFromNatural(img.naturalWidth, img.naturalHeight)) applyHeights();
      },
      { once: true },
    );
  }

  try {
    const firstSlideImg = carouselRoot.querySelector(".carouselSlide img");
    armFirstDomImage(firstSlideImg);

    // If the DOM image hasn't decoded yet, also probe (helps with fast navigation / cache timing).
    const probe = new Image();
    probe.decoding = "async";
    probe.onload = () => {
      if (ratioWoverH) return; // first image path already won
      if (setRatioFromNatural(probe.naturalWidth, probe.naturalHeight)) applyHeights();
    };
    probe.onerror = () => {
      if (ratioWoverH) return;
      // Sensible default if the first asset is missing/broken
      ratioWoverH = 16 / 9;
      applyHeights();
    };
    probe.src = src;
  } catch {
    // ignore
  }
}

function buildCarousel(photos) {
  const viewport = el("div", { class: "carouselViewport" });
  const track = el("div", { class: "carouselTrack" });
  viewport.append(track);

  const slides = photos.map((p) => {
    const slide = el("div", { class: "carouselSlide" });
    slide.append(el("img", { src: p.src, alt: "" }));
    if (p.credit) slide.append(el("div", { class: "photoCredit", text: p.credit }));
    track.append(slide);
    return slide;
  });

  const dotsWrap = el("div", { class: "carouselDots" });
  const dots = photos.map((_, idx) => {
    const b = el("button", { class: "dot", type: "button", "aria-label": `Go to image ${idx + 1}` });
    b.addEventListener("click", () => slides[idx].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }));
    dotsWrap.append(b);
    return b;
  });

  function setActive(i) {
    dots.forEach((d, idx) => d.classList.toggle("isActive", idx === i));
  }

  let activeIndex = 0;
  setActive(0);

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
        if (!best) return;
        const idx = slides.indexOf(best.target);
        if (idx >= 0 && idx !== activeIndex) {
          activeIndex = idx;
          setActive(activeIndex);
        }
      },
      { root: viewport, threshold: [0.55, 0.75, 0.9] },
    );
    slides.forEach((s) => io.observe(s));
  }

  function scrollByOne(dir) {
    const next = Math.max(0, Math.min(slides.length - 1, activeIndex + dir));
    slides[next].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  // Keyboard navigation when focused / hovered
  viewport.tabIndex = 0;
  viewport.setAttribute("role", "region");
  viewport.setAttribute("aria-label", "Project photos");
  viewport.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") scrollByOne(-1);
    if (e.key === "ArrowRight") scrollByOne(1);
  });

  const controls = el("div", { class: "carouselControls" }, [dotsWrap]);
  const root = el("div", { class: "carousel" }, [viewport, controls]);

  requestAnimationFrame(() => {
    if (photos[0]?.src) applyCarouselViewportSizingFromFirstImage(root, photos[0].src);
  });

  return root;
}

function renderProject(project) {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const title = asText(project.title) || asText(project.slug) || "Project";
  const subtitle = asText(project.subtitle);

  document.title = `${title} – Konrad Simon`;
  const navTitle = document.getElementById("navTitle");
  if (navTitle) navTitle.textContent = title;

  const heroLeft = el("div", {}, [
    el("h1", { class: "projectTitle", text: title }),
    subtitle ? el("p", { class: "projectSubtitle", text: subtitle }) : el("p", { class: "projectSubtitle", text: "" }),
  ]);

  const meta = buildMeta(project);
  const hero = el("section", { class: "projectHero" }, [heroLeft]);
  app.append(hero);

  if (asText(project.description)) {
    app.append(
      el("section", { class: "section aboutGrid" }, [
        el("h2", { class: "sectionTitle", text: "About" }),
        el("div", { class: "aboutGridContent" }, [buildDescription(project.description)]),
        meta,
      ]),
    );
  } else {
    // If there's no "About" section, keep the meta visible near the top.
    hero.append(meta);
  }

  if (asText(project.videoUrl)) {
    const url = asText(project.videoUrl);
    const embed = buildVideoEmbed(url);
    app.append(
      el("section", { class: "section" }, [
        el("h2", { class: "sectionTitle", text: "Video" }),
        embed
          ? el("div", { class: "videoFrame" }, [embed])
          : el("p", { class: "sectionBody" }, [el("a", { href: url, target: "_blank", rel: "noreferrer", text: url })]),
      ]),
    );
  }

  const photos = normalizePhotos(project.photos);
  if (photos.length) {
    app.append(
      el("section", { class: "section" }, [
        el("h2", { class: "sectionTitle", text: "Photos" }),
        buildCarousel(photos),
      ]),
    );
  }
}

async function main() {
  const slug = qs("slug") || "example";
  try {
    const project = await loadProject(slug);
    renderProject(project);
  } catch (err) {
    document.title = "Not found – Konrad Simon";
    const navTitle = document.getElementById("navTitle");
    if (navTitle) navTitle.textContent = "Not found";
    const app = document.getElementById("app");
    app.innerHTML = "";
    app.append(
      el("div", { class: "notFound" }, [
        el("h1", { class: "projectTitle", text: "Not found" }),
        el("p", { class: "sectionBody" }, [
          document.createTextNode("No project found for slug "),
          el("strong", { text: slug }),
          document.createTextNode("."),
        ]),
        el("div", { class: "section" }, [el("a", { href: "index.html", text: "Back to home" })]),
      ]),
    );
  }
}

main();

