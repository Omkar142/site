(() => {
  "use strict";
  const root = document.documentElement;
  root.classList.add("js");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let userOff = false;
  try {
    userOff = localStorage.getItem("omkar-motion") === "off";
  } catch {}
  const motion = document.querySelector("#motion");
  const code = document.querySelector("#code");
  const codeStatus = document.querySelector("#code-status");
  const replay = document.querySelector("#replay");
  let mode = "engineering",
    timer = 0,
    generation = 0,
    editorStarted = false;
  const profiles = {
    engineering: {
      text: 'const omkar = {\n  role: "Technical Program Manager",\n  foundation: "Engineering",\n  experience: ["Google Play", "Tracxn", "Cisco"],\n  aiProduct: "ScreenGod / Android",\n  delivery: "APIs → releases → outcomes",\n  collaboration: "Remote"\n};',
      status: "Technical programs, engineering and an independent AI product.",
    },
    delivery: {
      text: 'const delivery = {\n  workstreams: 15,\n  releases: "40+ / Tracxn",\n  dependencies: ["APIs", "RBAC", "data"],\n  governance: ["Jira", "RAID", "milestones"],\n  learn: "Dashboards + corrective actions"\n};',
      status: "Tracxn: 15 technical workstreams and 40+ production releases.",
    },
    ai: {
      text: 'const screenGod = {\n  product: "AI Android assistant",\n  model: "Gemini API",\n  retrieval: "RAG",\n  monitoring: "Firebase Crashlytics",\n  loop: "Build → ship → observe → improve",\n  status: "Published on Google Play"\n};',
      status:
        "ScreenGod: Gemini integration, RAG, releases and production telemetry.",
    },
  };
  const motionOff = () => userOff || reduced.matches;
  let refreshScrollStory = () => {};
  const escape = (value) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function render(text, cursor = false) {
    code.innerHTML =
      text
        .split("\n")
        .map(
          (line, index) =>
            '<span class="line-no">' +
            (index + 1) +
            "</span>" +
            escape(line).replace(
              /("[^"]*"|\bconst\b)/g,
              '<span class="syntax">$1</span>',
            ),
        )
        .join("\n") + (cursor ? '<span class="cursor"></span>' : "");
  }
  function type() {
    clearTimeout(timer);
    const current = ++generation,
      profile = profiles[mode];
    codeStatus.textContent = profile.status;
    if (motionOff()) {
      render(profile.text);
      return;
    }
    let length = 0;
    function tick() {
      if (current !== generation) return;
      length += 1;
      render(profile.text.slice(0, length), length < profile.text.length);
      if (length < profile.text.length) timer = setTimeout(tick, profile.text[length - 1] === "\n" ? 160 : /[,;{}]/.test(profile.text[length - 1]) ? 90 : 34);
    }
    tick();
  }
  function applyMotion() {
    const off = motionOff();
    root.classList.toggle("motion-off", off);
    root.classList.toggle("js-motion", !off);
    motion.disabled = reduced.matches;
    motion.innerHTML = '<span>Animations</span><span class="motion-switch-track" aria-hidden="true"><i></i></span><span class="motion-switch-state">' + (reduced.matches ? 'Reduced' : off ? 'Off' : 'On') + '</span>';
    motion.setAttribute("aria-checked", String(!off));
    motion.setAttribute("aria-label", "Animations");
    motion.title = reduced.matches ? "Reduced motion follows your device settings" : off ? "Enable animations" : "Pause animations";
    if (off) {
      document
        .querySelectorAll(".waiting")
        .forEach((element) => element.classList.remove("waiting"));
      clearTimeout(timer);
      generation++;
      render(profiles[mode].text);
      document.querySelector(".art-tilt").style.transform = "";
    }
    refreshScrollStory();
  }
  motion.hidden = false;
  replay.hidden = false;
  document.querySelector(".code-modes").hidden = false;
  applyMotion();
  motion.addEventListener("click", () => {
    userOff = !userOff;
    try {
      localStorage.setItem("omkar-motion", userOff ? "off" : "on");
    } catch {}
    applyMotion();
    if (!motionOff()) type();
  });
  reduced.addEventListener("change", applyMotion);
  document.querySelectorAll("[data-mode]").forEach((button) =>
    button.addEventListener("click", () => {
      mode = button.dataset.mode;
      document
        .querySelectorAll("[data-mode]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      editorStarted = true;
      type();
    }),
  );
  replay.addEventListener("click", () => {
    editorStarted = true;
    type();
  });

  const menu = document.querySelector(".menu-button"),
    navigation = document.querySelector("#navigation");
  menu.hidden = false;
  function closeMenu() {
    navigation.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  }
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    navigation.classList.toggle("open", open);
  });
  navigation
    .querySelectorAll("a")
    .forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navigation.classList.contains("open")) {
      closeMenu();
      menu.focus();
    }
  });

  const choices = [...document.querySelectorAll("[data-project]")];
  const panels = [...document.querySelectorAll(".case-study")];
  document.querySelector(".project-choices").hidden = false;
  const siteHeader = document.querySelector(".site-header");
  if (siteHeader) {
    const syncWorkHeader = () => root.style.setProperty(
      "--work-header-height",
      Math.ceil(siteHeader.getBoundingClientRect().height) + "px",
    );
    syncWorkHeader();
    window.addEventListener("resize", syncWorkHeader, { passive: true });
    window.addEventListener("omkar:layout", syncWorkHeader);
    if ("ResizeObserver" in window)
      new ResizeObserver(syncWorkHeader).observe(siteHeader);
    if (document.fonts) document.fonts.ready.then(syncWorkHeader);
  }
  function scrollToProject(target) {
    if (!target) return;
    const stage = target.closest(".project-stage");
    const stacked = stage?.classList.contains("stack-ready");
    let top;
    // Sticky/scaled cards report their pinned screen position. Measure the
    // normal-flow destination, then restore the stack before the next paint.
    try {
      if (stacked) stage.classList.remove("stack-ready");
      const padding = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
      const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      let clearance = padding + margin;
      const companyChoices = document.querySelector(".project-choices");
      if (root.classList.contains("compact") && companyChoices) {
        const pinnedTop = parseFloat(getComputedStyle(companyChoices).top) || 0;
        clearance = Math.max(
          clearance,
          pinnedTop + companyChoices.getBoundingClientRect().height + 12,
        );
      }
      top = Math.max(
        0,
        target.getBoundingClientRect().top + window.scrollY - clearance,
      );
    } finally {
      if (stacked) stage.classList.add("stack-ready");
    }
    if (Math.abs(window.scrollY - top) < 1) return;
    window.scrollTo({
      top,
      left: window.scrollX,
      behavior: motionOff() ? "instant" : "smooth",
    });
  }
  function selectProject(project, updateURL = false, animate = true) {
    if (!choices.some((choice) => choice.dataset.project === project))
      project = "google";
    choices.forEach((choice) =>
      choice.setAttribute(
        "aria-pressed",
        String(choice.dataset.project === project),
      ),
    );
    panels.forEach((panel) => {
      const selected = panel.id === "case-" + project;
      panel.hidden = false;
      panel.classList.toggle("is-selected", selected);
      panel.classList.remove("case-enter");
      if (selected && animate && !motionOff())
        requestAnimationFrame(() => panel.classList.add("case-enter"));
    });
    const chosen = choices.find((choice) => choice.dataset.project === project);
    document.querySelector("#project-status").textContent =
      chosen.querySelector(".choice-name").childNodes[0].textContent +
      " story selected. All four work stories are available below.";
    if (updateURL) {
      const url = new URL(location.href);
      url.searchParams.set("project", project);
      url.hash = "case-" + project;
      history.replaceState(null, "", url);
      const target = panels.find((panel) => panel.id === "case-" + project);
      scrollToProject(target);
    }
  }
  function projectFromURL() {
    const byHash = choices.find(
      (choice) => location.hash === "#case-" + choice.dataset.project,
    );
    return byHash
      ? byHash.dataset.project
      : new URLSearchParams(location.search).get("project") || "google";
  }
  selectProject(projectFromURL(), false, false);
  choices.forEach((choice) =>
    choice.addEventListener("click", () =>
      selectProject(choice.dataset.project, true),
    ),
  );
  document.querySelectorAll('a[href^="#case-"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      if (
        event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey
      ) return;
      const choice = choices.find(
        (item) => link.hash === "#case-" + item.dataset.project,
      );
      if (!choice) return;
      event.preventDefault();
      selectProject(choice.dataset.project, true);
    });
  });
  window.addEventListener("popstate", () =>
    selectProject(projectFromURL(), false),
  );
  window.addEventListener("hashchange", () => {
    selectProject(projectFromURL(), false, false);
    if (
      choices.some(
        (choice) => location.hash === "#case-" + choice.dataset.project,
      )
    )
      scrollToProject(panels.find((panel) => "#" + panel.id === location.hash));
  });

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("waiting");
          revealObserver.unobserve(entry.target);
        }),
      { threshold: 0.07 },
    );
    if (!motionOff())
      document.querySelectorAll(".reveal").forEach((element) => {
        element.classList.add("waiting");
        revealObserver.observe(element);
      });
    const editorObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting && !editorStarted) {
            editorStarted = true;
            type();
            editorObserver.disconnect();
          }
        }),
      { threshold: 0.25 },
    );
    editorObserver.observe(document.querySelector(".editor"));
    const navigationObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navigation.querySelectorAll("a").forEach((link) => {
            if (link.hash === "#" + entry.target.id)
              link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        }),
      { rootMargin: "-15% 0px -50% 0px", threshold: 0 },
    );
    ["work", "about", "contact"].forEach((id) =>
      navigationObserver.observe(document.getElementById(id)),
    );
  }
  const figure = document.querySelector(".hero-figure"),
    art = document.querySelector(".art-tilt");
  let rect,
    frame = 0,
    latestX = 0,
    latestY = 0;
  if (matchMedia("(pointer:fine)").matches) {
    figure.addEventListener("pointerenter", () => {
      rect = figure.getBoundingClientRect();
    });
    figure.addEventListener("pointermove", (event) => {
      if (motionOff() || !rect) return;
      latestX = ((event.clientX - rect.left) / rect.width - 0.5) * 9;
      latestY = ((event.clientY - rect.top) / rect.height - 0.5) * -7;
      if (!frame)
        frame = requestAnimationFrame(() => {
          art.style.transform =
            "rotateX(" + latestY + "deg) rotateY(" + latestX + "deg)";
          frame = 0;
        });
    });
    figure.addEventListener("pointerleave", () => {
      cancelAnimationFrame(frame);
      frame = 0;
      rect = null;
      art.style.transform = "";
    });
  }
  // Native scroll drives this original scene. There is no wheel interception,
  // autoplay loop, frame-sequence download or third-party motion dependency.
  const approach = document.querySelector("#approach"),
    story = document.querySelector(".approach-story"),
    storyVisual = document.querySelector(".approach-visual"),
    storySteps = [...document.querySelectorAll("[data-story-step]")],
    heroImage = document.querySelector(".hero-art"),
    desktopStory = matchMedia("(min-width: 851px) and (min-height: 650px)");
  const storyLabels = [
    "Find the signal.",
    "Connect the pieces.",
    "Deliver the outcome.",
  ];
  let storyFrame = 0,
    activeStoryStep = -1;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  function updateScrollStory() {
    storyFrame = 0;
    const enabled =
      !motionOff() && desktopStory.matches && !window.omkarLayout?.compact;
    approach.classList.toggle("story-motion", enabled);
    let progress = 1;
    if (enabled) {
      const bounds = story.getBoundingClientRect();
      const inset = parseFloat(getComputedStyle(storyVisual).top) || 120;
      const travel = bounds.height - storyVisual.getBoundingClientRect().height;
      progress = travel > 0 ? clamp((inset - bounds.top) / travel) : 1;
    }
    approach.style.setProperty("--story-progress", progress.toFixed(4));
    approach.style.setProperty("--trace", clamp(progress * 3).toFixed(4));
    const alignment = clamp(progress * 3 - 1);
    approach.style.setProperty("--align", alignment.toFixed(4));
    approach.style.setProperty(
      "--plane-gap",
      ((1 - alignment) * 42).toFixed(2) + "px",
    );
    approach.style.setProperty(
      "--scene-turn",
      ((1 - alignment) * -8).toFixed(2) + "deg",
    );
    approach.style.setProperty("--deliver", clamp(progress * 3 - 2).toFixed(4));
    const active = enabled ? Math.min(2, Math.floor(progress * 3)) : 2;
    storySteps.forEach((step, index) =>
      step.classList.toggle("is-current", enabled && index === active),
    );
    if (active !== activeStoryStep) {
      activeStoryStep = active;
      document.querySelector(".scene-count").textContent =
        "0" + (active + 1) + " / 03";
      document.querySelector(".scene-label").textContent = storyLabels[active];
    }
    const drift = enabled
      ? clamp(
          -figure.getBoundingClientRect().top /
            Math.max(1, figure.offsetHeight),
        )
      : 0;
    heroImage.style.setProperty(
      "--hero-drift",
      (-drift * 32).toFixed(2) + "px",
    );
    heroImage.style.setProperty("--hero-turn", (drift * 3).toFixed(2) + "deg");
  }
  refreshScrollStory = () => {
    if (!storyFrame) storyFrame = requestAnimationFrame(updateScrollStory);
  };
  window.addEventListener("scroll", refreshScrollStory, { passive: true });
  window.addEventListener("resize", refreshScrollStory, { passive: true });
  desktopStory.addEventListener("change", refreshScrollStory);
  window.addEventListener("load", refreshScrollStory);
  window.addEventListener("omkar:layout", refreshScrollStory);
  if ("ResizeObserver" in window) {
    const layoutObserver = new ResizeObserver(refreshScrollStory);
    layoutObserver.observe(document.querySelector("main"));
  }
  if (document.fonts) document.fonts.ready.then(refreshScrollStory);
  refreshScrollStory();

  const print = document.querySelector("#print");
  print.hidden = false;
  print.addEventListener("click", () => window.print());
  const copy = document.querySelector("#copy-email");
  copy.hidden = false;
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("omkargochhayat@gmail.com");
      document.querySelector("#copy-status").textContent = "Email copied.";
    } catch {
      document.querySelector("#copy-status").textContent =
        "Copy the address: omkargochhayat@gmail.com";
    }
  });
})();
