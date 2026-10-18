const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const script = [
  fs.readFileSync(path.join(__dirname, "translations.js"), "utf8"),
  fs.readFileSync(path.join(__dirname, "main.js"), "utf8"),
].join("\n");

class FakeElement {
  constructor({ attributes = {}, dataset = {}, textContent = "", id = "" } = {}) {
    this.nodeType = 1;
    this.tagName = "DIV";
    this.childNodes = [];
    this.attributes = new Map(Object.entries(attributes));
    this.dataset = dataset;
    this.textContent = textContent;
    this.id = id;
    this.listeners = new Map();
    this.children = new Map();
    this.collections = new Map();
    this.classes = new Set();
    this.hidden = false;
    this.tabIndex = 0;
    this.focusCount = 0;
    this.open = false;
    this.style = {
      removeProperty: (property) => delete this.style[property],
    };
    this.classList = {
      toggle: (name, force) => {
        const shouldAdd = force === undefined ? !this.classes.has(name) : force;
        if (shouldAdd) this.classes.add(name);
        else this.classes.delete(name);
        return shouldAdd;
      },
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      contains: (name) => this.classes.has(name),
    };
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type, event = {}) {
    const dispatchedEvent = {
      target: this,
      ...event,
    };
    dispatchedEvent.defaultPrevented = false;
    dispatchedEvent.preventDefault = () => {
      dispatchedEvent.defaultPrevented = true;
    };
    for (const listener of this.listeners.get(type) || []) listener(dispatchedEvent);
    return dispatchedEvent;
  }

  click() {
    this.dispatch("click");
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  querySelector(selector) {
    return this.children.get(selector) || null;
  }

  querySelectorAll(selector) {
    return this.collections.get(selector) || [];
  }

  getBoundingClientRect() {
    return this.bounds || { top: 0, bottom: 0, height: 0 };
  }

  contains(element) {
    return element === this || Array.from(this.children.values()).includes(element) ||
      Array.from(this.collections.values()).some((items) => items.includes(element));
  }

  focus() {
    this.focusCount += 1;
  }

  showModal() {
    this.open = true;
    this.showModalCount = (this.showModalCount || 0) + 1;
  }

  close() {
    this.open = false;
    this.dispatch("close");
  }

  replaceChildren(content) {
    this.content = content;
  }

  get src() {
    return this.getAttribute("src") || "";
  }

  set src(value) {
    this.setAttribute("src", value);
  }

  get alt() {
    return this.getAttribute("alt") || "";
  }

  set alt(value) {
    this.setAttribute("alt", value);
  }
}

function createDocument() {
  return {
    elements: new Map(),
    collections: new Map(),
    listeners: new Map(),
    documentElement: { scrollHeight: 3000 },
    querySelector(selector) {
      return this.elements.get(selector) || null;
    },
    querySelectorAll(selector) {
      return this.collections.get(selector) || [];
    },
    getElementById(id) {
      return this.elements.get(`#${id}`) || null;
    },
    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) || [];
      listeners.push(listener);
      this.listeners.set(type, listeners);
    },
    dispatch(type, event = {}) {
      for (const listener of this.listeners.get(type) || []) {
        listener({ target: new FakeElement(), preventDefault() {}, ...event });
      }
    },
  };
}

function runScript(document, { reduceMotion = false, mobile = false } = {}) {
  const pendingAnimationFrames = [];
  const window = {
    scrollY: 120,
    innerHeight: 800,
    listeners: new Map(),
    pendingAnimationFrames,
    matchMedia: (query) => ({
      matches: query.includes("prefers-reduced-motion") ? reduceMotion :
        query.includes("max-width: 680px") && mobile,
    }),
    scrollTo(options) {
      this.lastScroll = options;
    },
    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) || [];
      listeners.push(listener);
      this.listeners.set(type, listeners);
    },
    requestAnimationFrame(callback) {
      pendingAnimationFrames.push(callback);
      return pendingAnimationFrames.length;
    },
    flushAnimationFrames() {
      while (pendingAnimationFrames.length) {
        pendingAnimationFrames.splice(0).forEach((callback) => callback());
      }
    },
    dispatch(type) {
      for (const listener of this.listeners.get(type) || []) listener();
    },
  };
  vm.runInNewContext(script, { document, window, Date });
  return window;
}

test("le script fonctionne avec le DOM complet", () => {
  const document = createDocument();
  const menuToggle = new FakeElement({ attributes: { "aria-expanded": "false" } });
  const navigation = new FakeElement();
  const menuLink = new FakeElement();
  menuLink.closest = (selector) => selector === "a" ? menuLink : null;
  navigation.children.set("link", menuLink);
  document.elements.set(".menu-toggle", menuToggle);
  document.elements.set("#navigation", navigation);

  const schoolTab = new FakeElement({ attributes: { "aria-controls": "panel-school" } });
  const holidayTab = new FakeElement({ attributes: { "aria-controls": "panel-holiday" } });
  const schoolPanel = new FakeElement({ id: "panel-school" });
  const holidayPanel = new FakeElement({ id: "panel-holiday" });
  document.collections.set(".routine-tab", [schoolTab, holidayTab]);
  document.collections.set('[role="tabpanel"]', [schoolPanel, holidayPanel]);

  const profileCard = new FakeElement({ dataset: { profile: "experience" } });
  profileCard.children.set(".profile-title", new FakeElement({ textContent: "Expérience" }));
  profileCard.children.set(".card-icon", new FakeElement({ textContent: "🎓" }));
  const profileTemplate = { content: { cloneNode: () => ({ cloned: true }) } };
  const profileDialog = new FakeElement();
  const profileTitle = new FakeElement();
  const profileIcon = new FakeElement();
  const profileContent = new FakeElement();
  const profileClose = new FakeElement();
  document.collections.set(".profile-card", [profileCard]);
  document.elements.set(".profile-dialog", profileDialog);
  document.elements.set("#profile-dialog-title", profileTitle);
  document.elements.set(".profile-dialog-icon", profileIcon);
  document.elements.set(".profile-dialog-content", profileContent);
  document.elements.set(".profile-dialog-close", profileClose);
  document.elements.set("#profile-experience", profileTemplate);

  const image = new FakeElement({ attributes: { src: "photo.jpeg", alt: "Enfant qui joue" } });
  image.currentSrc = "https://example.test/photo.jpeg";
  const galleryCard = new FakeElement({ dataset: { caption: "Jeu en famille" } });
  galleryCard.children.set("img", image);
  const nextImage = new FakeElement({ attributes: { src: "photo-suivante.jpeg", alt: "Jeu de société" } });
  nextImage.currentSrc = "https://example.test/photo-suivante.jpeg";
  const nextGalleryCard = new FakeElement({ dataset: { caption: "Partie de jeu" } });
  nextGalleryCard.children.set("img", nextImage);
  const lightbox = new FakeElement();
  const lightboxImage = new FakeElement();
  const caption = new FakeElement();
  const count = new FakeElement();
  const lightboxClose = new FakeElement();
  const lightboxPrevious = new FakeElement();
  const lightboxNext = new FakeElement();
  lightbox.children.set("img", lightboxImage);
  lightbox.children.set(".lightbox-caption-text", caption);
  lightbox.children.set(".lightbox-count", count);
  lightbox.children.set(".lightbox-close", lightboxClose);
  lightbox.children.set(".lightbox-previous", lightboxPrevious);
  lightbox.children.set(".lightbox-next", lightboxNext);
  document.collections.set(".gallery-card", [galleryCard, nextGalleryCard]);
  document.elements.set(".gallery-lightbox", lightbox);

  const year = new FakeElement();
  document.elements.set("#year", year);
  const window = runScript(document);

  menuToggle.click();
  assert.equal(menuToggle.getAttribute("aria-expanded"), "true");
  assert.equal(menuToggle.getAttribute("aria-label"), "Fermer le menu");
  assert.equal(navigation.classList.contains("is-open"), true);
  navigation.dispatch("click", { target: menuLink });
  assert.equal(menuToggle.getAttribute("aria-expanded"), "false");

  holidayTab.click();
  assert.equal(holidayTab.getAttribute("aria-selected"), "true");
  assert.equal(holidayTab.tabIndex, 0);
  assert.equal(holidayPanel.hidden, false);
  assert.equal(schoolPanel.hidden, true);

  profileCard.click();
  assert.equal(profileTitle.textContent, "Expérience");
  assert.equal(profileIcon.textContent, "🎓");
  assert.deepEqual(profileContent.content, { cloned: true });
  assert.equal(profileDialog.open, true);
  assert.equal(profileClose.focusCount, 1);
  profileClose.click();
  assert.equal(profileDialog.open, false);
  assert.equal(profileCard.focusCount, 1);

  galleryCard.click();
  assert.equal(lightbox.open, true);
  assert.equal(lightboxImage.src, "https://example.test/photo.jpeg");
  assert.equal(lightboxImage.alt, "Enfant qui joue");
  assert.equal(caption.textContent, "Jeu en famille");
  assert.equal(count.textContent, "1 / 2");
  lightboxNext.click();
  assert.equal(lightboxImage.src, "https://example.test/photo-suivante.jpeg");
  assert.equal(caption.textContent, "Partie de jeu");
  assert.equal(count.textContent, "2 / 2");
  document.dispatch("keydown", { key: "ArrowLeft" });
  assert.equal(lightboxImage.src, "https://example.test/photo.jpeg");
  assert.equal(count.textContent, "1 / 2");
  lightboxPrevious.click();
  assert.equal(lightboxImage.src, "https://example.test/photo-suivante.jpeg");
  assert.equal(count.textContent, "2 / 2");
  lightboxClose.click();
  assert.equal(galleryCard.focusCount, 1);
  assert.equal(lightboxImage.getAttribute("src"), null);
  assert.equal(caption.textContent, "");
  assert.equal(count.textContent, "");
  assert.equal(year.textContent, new Date().getFullYear());
  assert.equal(window.lastScroll.top, 120);
  assert.equal(window.lastScroll.behavior, "instant");
});

test("les fonctionnalités absentes du DOM ne bloquent pas le script", () => {
  const document = createDocument();

  assert.doesNotThrow(() => runScript(document));
});

test("les réponses de FAQ s’animent à l’ouverture et à la fermeture", () => {
  const document = createDocument();
  const item = new FakeElement();
  const summary = new FakeElement();
  const answer = new FakeElement();
  answer.bounds = { top: 0, bottom: 0, height: 0 };
  answer.scrollHeight = 120;
  const animations = [];
  answer.animate = (keyframes, options) => {
    const animation = {
      keyframes,
      options,
      onfinish: null,
      cancelled: false,
      cancel() {
        this.cancelled = true;
      },
      finish() {
        if (this.onfinish) this.onfinish();
      },
    };
    animations.push(animation);
    return animation;
  };
  item.children.set("summary", summary);
  item.children.set(".faq-answer", answer);
  document.collections.set(".faq-item", [item]);
  const window = runScript(document);

  const openingEvent = summary.dispatch("click");
  assert.equal(openingEvent.defaultPrevented, true);
  assert.equal(item.open, true);
  assert.equal(animations[0].options.duration, 280);
  assert.equal(animations[0].keyframes[1].height, "120px");
  animations[0].finish();
  assert.equal(answer.style.height, undefined);
  assert.equal(answer.style.overflow, undefined);

  answer.bounds = { top: 0, bottom: 120, height: 120 };
  summary.click();
  assert.equal(item.open, true);
  assert.equal(animations[1].keyframes[1].height, "0px");
  summary.click();
  assert.equal(animations[1].cancelled, true);
  assert.equal(animations[2].keyframes[1].height, "120px");
  animations[2].finish();
  assert.equal(item.open, true);

  answer.bounds = { top: 0, bottom: 120, height: 120 };
  summary.click();
  assert.equal(animations[3].keyframes[1].height, "0px");
  animations[3].finish();
  assert.equal(item.open, false);

  const reducedMotionDocument = createDocument();
  const reducedMotionItem = new FakeElement();
  const reducedMotionSummary = new FakeElement();
  const reducedMotionAnswer = new FakeElement();
  reducedMotionItem.children.set("summary", reducedMotionSummary);
  reducedMotionItem.children.set(".faq-answer", reducedMotionAnswer);
  reducedMotionDocument.collections.set(".faq-item", [reducedMotionItem]);
  runScript(reducedMotionDocument, { reduceMotion: true });
  reducedMotionSummary.click();
  assert.equal(reducedMotionItem.open, true);
  assert.equal(reducedMotionAnswer.style.height, undefined);
});

test("le lien de navigation actif suit le défilement et la fin de page", () => {
  const document = createDocument();
  const navigation = new FakeElement();
  const header = new FakeElement();
  header.bounds = { height: 76 };
  const aboutLink = new FakeElement({ attributes: { href: "#apropos" } });
  const contactLink = new FakeElement({ attributes: { href: "#contact" } });
  const aboutSection = new FakeElement();
  const contactSection = new FakeElement();
  aboutSection.bounds = { top: 50, bottom: 1200 };
  contactSection.bounds = { top: 1250, bottom: 2200 };
  navigation.collections.set('a[href^="#"]', [aboutLink, contactLink]);
  document.elements.set("#navigation", navigation);
  document.elements.set(".site-header", header);
  document.elements.set("#apropos", aboutSection);
  document.elements.set("#contact", contactSection);
  const window = runScript(document);

  assert.equal(aboutLink.getAttribute("aria-current"), "location");
  assert.equal(contactLink.getAttribute("aria-current"), null);

  aboutSection.bounds = { top: -500, bottom: 90 };
  contactSection.bounds = { top: 90, bottom: 1600 };
  window.dispatch("scroll");
  window.flushAnimationFrames();
  assert.equal(aboutLink.getAttribute("aria-current"), null);
  assert.equal(contactLink.getAttribute("aria-current"), "location");

  window.scrollY = 2200;
  window.innerHeight = 800;
  document.documentElement.scrollHeight = 3000;
  window.dispatch("scroll");
  window.flushAnimationFrames();
  assert.equal(contactLink.getAttribute("aria-current"), "location");
});

test("les mises à jour du défilement sont regroupées sur une seule frame", () => {
  const document = createDocument();
  const navigation = new FakeElement();
  const header = new FakeElement();
  header.bounds = { height: 76 };
  const aboutLink = new FakeElement({ attributes: { href: "#apropos" } });
  const aboutSection = new FakeElement();
  aboutSection.bounds = { top: -100, bottom: 1200 };
  navigation.collections.set('a[href^="#"]', [aboutLink]);
  document.elements.set("#navigation", navigation);
  document.elements.set(".site-header", header);
  document.elements.set("#apropos", aboutSection);

  const backToTop = new FakeElement();
  backToTop.hidden = true;
  document.elements.set(".back-to-top", backToTop);
  const window = runScript(document);

  window.scrollY = 500;
  window.dispatch("scroll");
  window.dispatch("scroll");
  window.dispatch("scroll");

  assert.equal(window.pendingAnimationFrames.length, 1);
  assert.equal(backToTop.classList.contains("is-visible"), false);
  window.flushAnimationFrames();
  assert.equal(backToTop.classList.contains("is-visible"), true);
  assert.equal(aboutLink.getAttribute("aria-current"), "location");
});

test("une galerie vide initialise la lightbox sans ouvrir de photo", () => {
  const document = createDocument();
  const lightbox = new FakeElement();
  lightbox.children.set("img", new FakeElement());
  lightbox.children.set(".lightbox-caption-text", new FakeElement());
  lightbox.children.set(".lightbox-count", new FakeElement());
  lightbox.children.set(".lightbox-close", new FakeElement());
  lightbox.children.set(".lightbox-previous", new FakeElement());
  lightbox.children.set(".lightbox-next", new FakeElement());
  document.elements.set(".gallery-lightbox", lightbox);

  assert.doesNotThrow(() => runScript(document));
  assert.equal(lightbox.open, false);
});

test("les cartes dont les informations requises manquent sont ignorées", () => {
  const document = createDocument();
  const profileCard = new FakeElement({ dataset: { profile: "missing" } });
  const imageLessCard = new FakeElement({ dataset: {} });
  const lightbox = new FakeElement();
  const lightboxImage = new FakeElement();
  const caption = new FakeElement();
  lightbox.children.set("img", lightboxImage);
  lightbox.children.set(".lightbox-caption-text", caption);
  lightbox.children.set(".lightbox-count", new FakeElement());
  lightbox.children.set(".lightbox-previous", new FakeElement());
  lightbox.children.set(".lightbox-next", new FakeElement());
  lightbox.children.set(".lightbox-close", new FakeElement());

  document.collections.set(".profile-card", [profileCard]);
  document.collections.set(".gallery-card", [imageLessCard]);
  document.elements.set(".profile-dialog", new FakeElement());
  document.elements.set("#profile-dialog-title", new FakeElement());
  document.elements.set(".profile-dialog-icon", new FakeElement());
  document.elements.set(".profile-dialog-content", new FakeElement());
  document.elements.set(".profile-dialog-close", new FakeElement());
  document.elements.set(".gallery-lightbox", lightbox);

  runScript(document);
  profileCard.click();
  imageLessCard.click();

  assert.equal(document.querySelector(".profile-dialog").open, false);
  assert.equal(lightbox.open, false);
});

test("une image valide utilise son texte alternatif si la légende manque", () => {
  const document = createDocument();
  const image = new FakeElement({ attributes: { src: "photo.jpeg", alt: "Photo descriptive" } });
  image.currentSrc = "";
  const galleryCard = new FakeElement();
  galleryCard.children.set("img", image);
  const lightbox = new FakeElement();
  const lightboxImage = new FakeElement();
  const caption = new FakeElement();
  lightbox.children.set(".lightbox-caption-text", caption);
  lightbox.children.set(".lightbox-count", new FakeElement());
  lightbox.children.set(".lightbox-previous", new FakeElement());
  lightbox.children.set(".lightbox-next", new FakeElement());
  lightbox.children.set("img", lightboxImage);
  lightbox.children.set(".lightbox-close", new FakeElement());

  document.collections.set(".gallery-card", [galleryCard]);
  document.elements.set(".gallery-lightbox", lightbox);
  runScript(document);
  galleryCard.click();

  assert.equal(lightbox.open, true);
  assert.equal(caption.textContent, "Photo descriptive");
});

test("la routine affiche trois étapes puis permet de développer et réduire la liste", () => {
  const document = createDocument();
  const timeline = new FakeElement({ id: "timeline-school" });
  const items = Array.from({ length: 5 }, () => new FakeElement());
  timeline.collections.set(".routine-item", items);
  const moreButton = new FakeElement({
    attributes: { "aria-controls": "timeline-school", "aria-expanded": "false" },
  });
  moreButton.hidden = true;
  document.elements.set("#timeline-school", timeline);
  document.collections.set(".routine-more", [moreButton]);

  runScript(document);

  assert.deepEqual(items.map((item) => item.hidden), [false, false, false, true, true]);
  assert.equal(moreButton.hidden, false);
  assert.equal(moreButton.textContent, "Voir plus");
  moreButton.click();
  assert.deepEqual(items.map((item) => item.hidden), [false, false, false, false, false]);
  assert.equal(moreButton.getAttribute("aria-expanded"), "true");
  assert.equal(moreButton.textContent, "Voir moins");
  moreButton.click();
  assert.deepEqual(items.map((item) => item.hidden), [false, false, false, true, true]);
  assert.equal(moreButton.getAttribute("aria-expanded"), "false");
});

test("le contrôle routine reste masqué si la liste est courte ou absente", () => {
  const document = createDocument();
  const timeline = new FakeElement({ id: "timeline-short" });
  timeline.collections.set(".routine-item", Array.from({ length: 3 }, () => new FakeElement()));
  const shortListButton = new FakeElement({ attributes: { "aria-controls": "timeline-short" } });
  shortListButton.hidden = true;
  const missingListButton = new FakeElement({ attributes: { "aria-controls": "timeline-missing" } });
  missingListButton.hidden = true;
  document.elements.set("#timeline-short", timeline);
  document.collections.set(".routine-more", [shortListButton, missingListButton]);

  assert.doesNotThrow(() => runScript(document));
  assert.equal(shortListButton.hidden, true);
  assert.equal(missingListButton.hidden, true);
});

test("les étapes supplémentaires sont animées à l’ouverture et à la fermeture", () => {
  const document = createDocument();
  const timeline = new FakeElement({ id: "timeline-animated" });
  const animations = [];
  const items = Array.from({ length: 5 }, () => new FakeElement());
  items.slice(3).forEach((item) => {
    item.animate = (keyframes, options) => {
      const animation = {
        keyframes,
        options,
        onfinish: null,
        cancel() {},
        finish() {
          if (this.onfinish) this.onfinish();
        },
      };
      animations.push(animation);
      return animation;
    };
  });
  timeline.collections.set(".routine-item", items);
  const moreButton = new FakeElement({ attributes: { "aria-controls": "timeline-animated" } });
  document.elements.set("#timeline-animated", timeline);
  document.collections.set(".routine-more", [moreButton]);
  runScript(document);

  moreButton.click();
  assert.equal(items[3].hidden, false);
  assert.equal(animations[0].options.duration, 280);
  assert.equal(animations[1].options.delay, 55);
  animations.slice(0, 2).forEach((animation) => animation.finish());

  moreButton.click();
  assert.equal(items[3].hidden, false);
  animations.slice(2).forEach((animation) => animation.finish());
  assert.equal(items[3].hidden, true);
  assert.equal(items[4].hidden, true);
});

test("le bouton de retour en haut suit le défilement et respecte la réduction des animations", () => {
  const document = createDocument();
  const backToTop = new FakeElement();
  backToTop.hidden = true;
  const brand = new FakeElement();
  document.elements.set(".back-to-top", backToTop);
  document.elements.set(".brand", brand);
  const window = runScript(document);

  assert.equal(backToTop.hidden, false);
  assert.equal(backToTop.classList.contains("is-visible"), false);
  assert.equal(backToTop.getAttribute("aria-hidden"), "true");
  assert.equal(backToTop.tabIndex, -1);

  window.scrollY = 500;
  window.dispatch("scroll");
  window.flushAnimationFrames();
  assert.equal(backToTop.classList.contains("is-visible"), true);
  assert.equal(backToTop.getAttribute("aria-hidden"), "false");
  assert.equal(backToTop.tabIndex, 0);

  backToTop.click();
  assert.equal(window.lastScroll.top, 0);
  assert.equal(window.lastScroll.behavior, "smooth");
  assert.equal(brand.focusCount, 1);
});

test("le retour en haut défile instantanément si les animations sont réduites", () => {
  const document = createDocument();
  const backToTop = new FakeElement();
  document.elements.set(".back-to-top", backToTop);
  const window = runScript(document, { reduceMotion: true });
  backToTop.click();
  assert.equal(window.lastScroll.top, 0);
  assert.equal(window.lastScroll.behavior, "instant");
});

test("le contact flottant mobile apparaît après défilement et disparaît devant le contact", () => {
  const document = createDocument();
  const mobileContact = new FakeElement();
  mobileContact.hidden = true;
  const contactSection = new FakeElement();
  contactSection.bounds = { top: 900, bottom: 1400, height: 500 };
  document.elements.set(".mobile-contact-cta", mobileContact);
  document.elements.set("#contact", contactSection);
  const window = runScript(document, { mobile: true });

  assert.equal(mobileContact.hidden, true);
  window.scrollY = 500;
  window.dispatch("scroll");
  window.flushAnimationFrames();
  assert.equal(mobileContact.hidden, false);

  contactSection.bounds = { top: 400, bottom: 900, height: 500 };
  window.dispatch("scroll");
  window.flushAnimationFrames();
  assert.equal(mobileContact.hidden, true);
});

test("le sélecteur traduit le contenu et les libellés accessibles dans les trois langues", () => {
  const document = createDocument();
  const languageTrigger = new FakeElement({
    attributes: { "aria-label": "Choisir la langue du site", "aria-expanded": "false" },
  });
  const languageOptions = new FakeElement();
  languageOptions.hidden = true;
  const languageCurrent = new FakeElement({ textContent: "FR" });
  const languageButtons = ["fr", "en", "de"].map((language) => new FakeElement({
    attributes: {
      "data-language": language,
      "aria-pressed": String(language === "fr"),
    },
  }));
  languageOptions.collections.set(".language-option", languageButtons);
  languageTrigger.children.set(".language-current", languageCurrent);
  const translatedText = { nodeType: 3, nodeValue: "Accueil" };
  const heroGreeting = { nodeType: 3, nodeValue: "Bonjour ! Je suis " };
  const siteName = { nodeType: 3, nodeValue: "Actuellement à Balen, en Belgique" };
  const brandRole = { nodeType: 3, nodeValue: "GARÇON AU PAIR" };
  const languageName = { nodeType: 3, nodeValue: "Français" };
  const testimonialQuote = { nodeType: 3, nodeValue: "Accueillir Nambinintsoa au sein de notre foyer a été une expérience formidable !" };
  const testimonialGenderedCopy = [
    { nodeType: 3, nodeValue: "Dès son arrivée, il a su créer un lien fort et naturel avec nos enfants." },
    { nodeType: 3, nodeValue: "Toujours ponctuel, organisé et d’une grande douceur, il a su gérer la routine quotidienne avec une aisance remarquable, tout en proposant des activités créatives et des sorties passionnantes." },
    { nodeType: 3, nodeValue: "En plus d’être une personne de confiance sur qui nous pouvions compter à 100 %, il a apporté une vraie énergie positive à notre maison." },
    { nodeType: 3, nodeValue: "Nous le recommandons les yeux fermés à toute famille qui cherche une personne bienveillante et responsable !" },
  ];
  const testimonialAuthor = { nodeType: 3, nodeValue: "La famille Bielen" };
  const testimonialLocation = { nodeType: 3, nodeValue: "Balen, Belgique" };
  const templateText = { nodeType: 3, nodeValue: "Fermer les détails" };
  const profileTemplate = new FakeElement();
  profileTemplate.tagName = "TEMPLATE";
  profileTemplate.content = { nodeType: 11, childNodes: [templateText] };
  const body = new FakeElement();
  body.childNodes = [
    translatedText, heroGreeting, siteName, brandRole, languageName,
    testimonialQuote, ...testimonialGenderedCopy, testimonialAuthor, testimonialLocation, profileTemplate,
    languageTrigger, languageOptions,
  ];
  const descriptionMeta = new FakeElement({
    attributes: {
      name: "description",
      content: "Faites connaissance avec Nambinintsoa, au pair en Belgique : expérience auprès d’enfants, langues parlées, permis B et disponibilité dès juin 2027.",
    },
  });
  const shareDescriptionMeta = new FakeElement({
    attributes: {
      property: "og:description",
      content: "Découvrez mon expérience auprès des enfants, mes langues, ma routine et mes disponibilités comme Au Pair.",
    },
  });
  const twitterDescriptionMeta = new FakeElement({
    attributes: {
      name: "twitter:description",
      content: "Découvrez mon expérience auprès des enfants, mes langues, ma routine et mes disponibilités comme Au Pair.",
    },
  });
  const siteNameMeta = new FakeElement({
    attributes: { property: "og:site_name", content: "Nambinintsoa" },
  });
  const ogTitleMeta = new FakeElement({
    attributes: { property: "og:title", content: "Nambinintsoa — Au pair en Belgique" },
  });
  const twitterTitleMeta = new FakeElement({
    attributes: { name: "twitter:title", content: "Nambinintsoa — Au pair en Belgique" },
  });
  const ogLocale = new FakeElement({ attributes: { content: "fr_FR" } });
  const head = new FakeElement();
  head.childNodes = [
    descriptionMeta, shareDescriptionMeta, twitterDescriptionMeta, siteNameMeta,
    ogTitleMeta, twitterTitleMeta, ogLocale,
  ];
  const routineTimeline = new FakeElement({ id: "timeline-school" });
  routineTimeline.collections.set(".routine-item", Array.from({ length: 4 }, () => new FakeElement()));
  const routineMore = new FakeElement({
    attributes: { "aria-controls": "timeline-school", "aria-expanded": "false" },
  });
  routineMore.hidden = true;
  document.head = head;
  document.body = body;
  document.documentElement.lang = "fr";
  document.title = "Nambinintsoa — Au pair en Belgique";
  document.elements.set(".language-trigger", languageTrigger);
  document.elements.set(".language-options", languageOptions);
  document.elements.set(".language-current", languageCurrent);
  document.collections.set(".language-option", languageButtons);
  document.elements.set("#timeline-school", routineTimeline);
  document.collections.set(".routine-more", [routineMore]);
  document.elements.set('meta[property="og:locale"]', ogLocale);
  runScript(document);

  languageTrigger.click();
  assert.equal(languageTrigger.getAttribute("aria-expanded"), "true");
  assert.equal(languageOptions.hidden, false);
  languageButtons[1].click();
  assert.equal(document.documentElement.lang, "en");
  assert.equal(translatedText.nodeValue, "Home");
  assert.equal(heroGreeting.nodeValue, "Hello! I’m ");
  assert.equal(siteName.nodeValue, "Currently in Balen, Belgium");
  assert.equal(brandRole.nodeValue, "MALE AU PAIR");
  assert.equal(languageName.nodeValue, "French");
  assert.equal(testimonialQuote.nodeValue, "Welcoming Nambinintsoa into our home has been a wonderful experience!");
  assert.deepEqual(testimonialGenderedCopy.map((node) => node.nodeValue), [
    "From the moment he arrived, he built a strong and natural bond with our children.",
    "Always punctual, organised and gentle, he handled the daily routine with remarkable ease while offering creative activities and exciting outings.",
    "As well as being someone we could rely on completely, he brought wonderful positive energy into our home.",
    "We wholeheartedly recommend him to any family looking for someone caring and responsible!",
  ]);
  assert.equal(testimonialAuthor.nodeValue, "The Bielen family");
  assert.equal(testimonialLocation.nodeValue, "Balen, Belgium");
  assert.equal(templateText.nodeValue, "Close details");
  assert.equal(languageTrigger.getAttribute("aria-label"), "Choose site language");
  assert.equal(languageCurrent.textContent, "EN");
  assert.equal(languageButtons[1].getAttribute("aria-pressed"), "true");
  assert.equal(languageOptions.hidden, true);
  assert.equal(languageTrigger.getAttribute("aria-expanded"), "false");
  assert.equal(routineMore.textContent, "See more");
  assert.equal(document.title, "Nambinintsoa — Au Pair in Belgium");
  assert.equal(document.querySelector('meta[property="og:locale"]').getAttribute("content"), "en_GB");
  assert.equal(descriptionMeta.getAttribute("content"), "Meet Nambinintsoa, an au pair in Belgium with childcare experience, language skills, a category B driving licence and availability from June 2027.");
  assert.equal(shareDescriptionMeta.getAttribute("content"), "Discover my childcare experience, languages, daily routine and availability as an au pair.");
  assert.equal(twitterDescriptionMeta.getAttribute("content"), "Discover my childcare experience, languages, daily routine and availability as an au pair.");
  assert.equal(siteNameMeta.getAttribute("content"), "Nambinintsoa");
  assert.equal(ogTitleMeta.getAttribute("content"), "Nambinintsoa — Au Pair in Belgium");
  assert.equal(twitterTitleMeta.getAttribute("content"), "Nambinintsoa — Au Pair in Belgium");
  routineMore.click();
  assert.equal(routineMore.textContent, "See less");

  languageButtons[2].click();
  assert.equal(document.documentElement.lang, "de");
  assert.equal(translatedText.nodeValue, "Startseite");
  assert.equal(heroGreeting.nodeValue, "Hallo! Ich bin ");
  assert.equal(siteName.nodeValue, "Derzeit in Balen, Belgien");
  assert.equal(brandRole.nodeValue, "AU PAIR JUNGE");
  assert.equal(languageName.nodeValue, "Französisch");
  assert.equal(testimonialQuote.nodeValue, "Nambinintsoa bei uns aufzunehmen, war eine wunderbare Erfahrung!");
  assert.deepEqual(testimonialGenderedCopy.map((node) => node.nodeValue), [
    "Schon bei seiner Ankunft hat er eine starke und natürliche Verbindung zu unseren Kindern aufgebaut.",
    "Er war stets pünktlich, organisiert und sehr einfühlsam. Den Alltag meisterte er souverän und bot zugleich kreative Aktivitäten und spannende Ausflüge an.",
    "Außerdem war er eine Person, auf die wir uns vollkommen verlassen konnten, und brachte viel positive Energie in unser Zuhause.",
    "Wir empfehlen ihn uneingeschränkt jeder Familie, die eine fürsorgliche und verantwortungsbewusste Unterstützung sucht!",
  ]);
  assert.equal(testimonialAuthor.nodeValue, "Die Familie Bielen");
  assert.equal(testimonialLocation.nodeValue, "Balen, Belgien");
  assert.equal(templateText.nodeValue, "Details schließen");
  assert.equal(languageTrigger.getAttribute("aria-label"), "Website-Sprache auswählen");
  assert.equal(languageCurrent.textContent, "DE");
  assert.equal(routineMore.textContent, "Weniger anzeigen");
  assert.equal(document.title, "Nambinintsoa — Au-pair in Belgien");
  assert.equal(descriptionMeta.getAttribute("content"), "Lernen Sie Nambinintsoa kennen, Au-pair in Belgien mit Erfahrung in der Kinderbetreuung, Sprachkenntnissen, Führerschein Klasse B und Verfügbarkeit ab Juni 2027.");
  assert.equal(shareDescriptionMeta.getAttribute("content"), "Entdecken Sie meine Erfahrung mit Kindern, meine Sprachen, meinen Alltag und meine Verfügbarkeit als Au-pair.");
  assert.equal(ogTitleMeta.getAttribute("content"), "Nambinintsoa — Au-pair in Belgien");

  languageButtons[0].click();
  assert.equal(document.documentElement.lang, "fr");
  assert.equal(translatedText.nodeValue, "Accueil");
  assert.equal(heroGreeting.nodeValue, "Bonjour ! Je suis ");
  assert.equal(siteName.nodeValue, "Actuellement à Balen, en Belgique");
  assert.equal(brandRole.nodeValue, "GARÇON AU PAIR");
  assert.equal(languageName.nodeValue, "Français");
  assert.equal(testimonialQuote.nodeValue, "Accueillir Nambinintsoa au sein de notre foyer a été une expérience formidable !");
  assert.deepEqual(testimonialGenderedCopy.map((node) => node.nodeValue), [
    "Dès son arrivée, il a su créer un lien fort et naturel avec nos enfants.",
    "Toujours ponctuel, organisé et d’une grande douceur, il a su gérer la routine quotidienne avec une aisance remarquable, tout en proposant des activités créatives et des sorties passionnantes.",
    "En plus d’être une personne de confiance sur qui nous pouvions compter à 100 %, il a apporté une vraie énergie positive à notre maison.",
    "Nous le recommandons les yeux fermés à toute famille qui cherche une personne bienveillante et responsable !",
  ]);
  assert.equal(testimonialAuthor.nodeValue, "La famille Bielen");
  assert.equal(testimonialLocation.nodeValue, "Balen, Belgique");
  assert.equal(templateText.nodeValue, "Fermer les détails");
  assert.equal(languageTrigger.getAttribute("aria-label"), "Choisir la langue du site");
  assert.equal(languageCurrent.textContent, "FR");
  assert.equal(routineMore.textContent, "Voir moins");
  assert.equal(document.title, "Nambinintsoa — Au pair en Belgique");
  assert.equal(descriptionMeta.getAttribute("content"), "Faites connaissance avec Nambinintsoa, au pair en Belgique : expérience auprès d’enfants, langues parlées, permis B et disponibilité dès juin 2027.");
  assert.equal(ogTitleMeta.getAttribute("content"), "Nambinintsoa — Au pair en Belgique");
});

test("le choix initial de langue ouvre l’accueil dans la langue sélectionnée", () => {
  const document = createDocument();
  const languageGate = new FakeElement();
  const heroHeading = new FakeElement();
  const languageButtons = ["fr", "en", "de"].map((language) => new FakeElement({
    attributes: { "data-language": language },
  }));
  document.elements.set(".language-gate", languageGate);
  document.elements.set("#hero-title", heroHeading);
  document.collections.set(".language-gate-option", languageButtons);

  const window = runScript(document);
  assert.equal(languageGate.showModalCount, 1);
  assert.equal(languageButtons[0].focusCount, 1);

  const cancelEvent = languageGate.dispatch("cancel");
  assert.equal(cancelEvent.defaultPrevented, true);
  assert.equal(languageGate.open, true);

  languageButtons[1].click();
  assert.equal(document.documentElement.lang, "en");
  assert.equal(document.title, "Nambinintsoa — Au Pair in Belgium");
  assert.equal(languageGate.open, false);
  assert.equal(heroHeading.focusCount, 1);
  assert.deepEqual(window.lastScroll, { top: 0, behavior: "instant" });
});

test("la FAQ avant le pied de page est traduite dans les trois langues et présente la future famille d’accueil", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "..", "index.html"), "utf8");
  const faq = html.match(/<section class="faq"[\s\S]*?<\/section>/)?.[0];
  assert.ok(faq, "la section FAQ existe");
  assert.ok(html.indexOf(faq) < html.indexOf("<footer"), "la FAQ précède le pied de page");

  const questions = Array.from(faq.matchAll(/<span class="faq-question">([^<]+)<\/span>/g), (match) => match[1]);
  const numbers = Array.from(faq.matchAll(/<span class="faq-number">([^<]+)<\/span>/g), (match) => match[1]);
  assert.equal(questions.length, 6);
  assert.deepEqual(numbers, ["01", "02", "03", "04", "05", "06"]);
  assert.ok(questions[2].includes("au pair"), "la question sur les hommes au pair est en troisième position");

  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "translations.js"), "utf8"), context);
  const visibleText = Array.from(faq.matchAll(/>([^<>]+)</g), (match) => match[1].trim())
    .filter((text) => /\p{L}/u.test(text));
  ["en", "de"].forEach((language) => {
    visibleText.forEach((text) => {
      assert.ok(context.window.portfolioTranslations[language][text], `${language}: traduction manquante pour « ${text} »`);
    });
  });

  const hostFamilyAnswer = faq.match(/<p>(Pour la suite,[\s\S]*?)<\/p>/)?.[1];
  assert.ok(hostFamilyAnswer, "la réponse précise la recherche d’une future famille d’accueil");
  assert.match(context.window.portfolioTranslations.en[hostFamilyAnswer], /host family/);
  assert.match(context.window.portfolioTranslations.de[hostFamilyAnswer], /Gastfamilie/);
});
