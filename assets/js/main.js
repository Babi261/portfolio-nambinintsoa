(function () {
  const supportedLanguages = new Set(["fr", "en", "de"]);
  const translations = window.portfolioTranslations || {};
  const frameCallbacks = new Set();
  let frameScheduled = false;
  const languageTrigger = document.querySelector(".language-trigger");
  const languageOptions = document.querySelector(".language-options");
  const languageOptionButtons = document.querySelectorAll(".language-option");
  const languageGate = document.querySelector(".language-gate");
  const languageGateOptionButtons = document.querySelectorAll(".language-gate-option");
  const languageCurrent = document.querySelector(".language-current");
  const originalTextNodes = new WeakMap();
  const originalAttributes = new WeakMap();
  const translatableAttributes = ["aria-label", "alt", "title", "data-caption", "content"];
  let currentLanguage = "fr";
  let refreshRoutineLabels = () => {};
  let refreshProfileDialog = () => {};
  let refreshGalleryCaption = () => {};

  const prefersReducedMotion = () =>
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scheduleFrame = (callback) => {
    if (typeof window.requestAnimationFrame !== "function") {
      callback();
      return;
    }

    frameCallbacks.add(callback);
    if (frameScheduled) return;

    frameScheduled = true;
    window.requestAnimationFrame(() => {
      frameScheduled = false;
      const callbacks = Array.from(frameCallbacks);
      frameCallbacks.clear();
      callbacks.forEach((run) => run());
    });
  };

  const phrase = (text) => {
    if (currentLanguage === "fr") return text;
    return translations[currentLanguage] && translations[currentLanguage][text] || text;
  };

  const translateTree = (node, dictionary) => {
    if (node.nodeType === 3) {
      if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue);
      const original = originalTextNodes.get(node);
      const trimmed = original.trim();
      if (!trimmed) return;
      const leading = original.match(/^\s*/)[0];
      const trailing = original.match(/\s*$/)[0];
      node.nodeValue = `${leading}${dictionary[trimmed] || trimmed}${trailing}`;
      return;
    }

    if (node.nodeType !== 1 && node.nodeType !== 9 && node.nodeType !== 11) return;

    if (node.nodeType === 1) {
      let originals = originalAttributes.get(node);
      if (!originals) {
        originals = new Map();
        originalAttributes.set(node, originals);
      }
      translatableAttributes.forEach((attribute) => {
        if (!node.hasAttribute(attribute)) return;
        if (!originals.has(attribute)) originals.set(attribute, node.getAttribute(attribute));
        const original = originals.get(attribute);
        node.setAttribute(attribute, dictionary[original] || original);
      });
    }

    Array.from(node.childNodes || []).forEach((child) => translateTree(child, dictionary));
    if (node.nodeType === 1 && node.tagName === "TEMPLATE" && node.content) {
      translateTree(node.content, dictionary);
    }
  };

  const translatePage = (language) => {
    if (!supportedLanguages.has(language)) return;

    currentLanguage = language;
    const dictionary = language === "fr" ? {} : translations[language] || {};
    if (document.head) translateTree(document.head, dictionary);
    if (document.body) translateTree(document.body, dictionary);
    document.documentElement.lang = language;
    document.title = phrase("Nambinintsoa — Au pair en Belgique");

    const locale = document.querySelector('meta[property="og:locale"]');
    if (locale) locale.setAttribute("content", phrase("fr_FR"));

    if (languageCurrent) languageCurrent.textContent = language.toUpperCase();
    languageOptionButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-language") === language));
    });
    refreshRoutineLabels();
    refreshProfileDialog();
    refreshGalleryCaption();
  };

  if (languageTrigger && languageOptions) {
    const closeLanguageOptions = ({ restoreFocus = false } = {}) => {
      languageOptions.hidden = true;
      languageTrigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) languageTrigger.focus({ preventScroll: true });
    };

    languageTrigger.addEventListener("click", () => {
      const isExpanded = languageTrigger.getAttribute("aria-expanded") === "true";
      languageOptions.hidden = isExpanded;
      languageTrigger.setAttribute("aria-expanded", String(!isExpanded));
      if (!isExpanded) {
        const selectedOption = Array.from(languageOptionButtons).find(
          (option) => option.getAttribute("data-language") === currentLanguage,
        );
        if (selectedOption) selectedOption.focus();
      }
    });

    languageOptionButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        translatePage(button.getAttribute("data-language"));
        closeLanguageOptions({ restoreFocus: true });
      });
      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        languageOptionButtons[(index + direction + languageOptionButtons.length) %
          languageOptionButtons.length].focus();
      });
    });

    document.addEventListener("click", (event) => {
      if (languageTrigger.getAttribute("aria-expanded") === "true" &&
          !languageTrigger.contains(event.target) && !languageOptions.contains(event.target)) {
        closeLanguageOptions();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && languageTrigger.getAttribute("aria-expanded") === "true") {
        closeLanguageOptions({ restoreFocus: true });
      }
    });

    translatePage("fr");
  }

  if (languageGate && typeof languageGate.showModal === "function") {
    languageGate.addEventListener("cancel", (event) => event.preventDefault());
    languageGateOptionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const language = button.getAttribute("data-language");
        if (!supportedLanguages.has(language)) return;

        translatePage(language);
        languageGate.close();
        if (window.location && window.location.hash && window.history) {
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        }
        window.scrollTo({ top: 0, behavior: "instant" });

        const homeHeading = document.querySelector("#hero-title");
        if (homeHeading) homeHeading.focus({ preventScroll: true });
      });
    });

    languageGate.showModal();
    if (languageGateOptionButtons.length) languageGateOptionButtons[0].focus();
  }

  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#navigation");

  if (menuToggle && navigation) {
    const closeNavigation = () => {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", phrase("Ouvrir le menu"));
      navigation.classList.remove("is-open");
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute("aria-label", phrase(isOpen ? "Ouvrir le menu" : "Fermer le menu"));
      navigation.classList.toggle("is-open", !isOpen);
    });

    navigation.addEventListener("click", (event) => {
      if (event.target && typeof event.target.closest === "function" && event.target.closest("a")) {
        closeNavigation();
      }
    });

    document.addEventListener("click", (event) => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      if (isOpen && !navigation.contains(event.target) && !menuToggle.contains(event.target)) {
        closeNavigation();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        closeNavigation();
        menuToggle.focus();
      }
    });
  }

  if (navigation) {
    const navigationLinks = Array.from(navigation.querySelectorAll('a[href^="#"]'));
    const navigationSections = navigationLinks
      .map((link) => {
        const href = link.getAttribute("href");
        const section = href && document.getElementById(href.slice(1));
        return section ? { link, section } : null;
      })
      .filter(Boolean);

    if (navigationSections.length) {
      const updateActiveNavigation = () => {
        const header = document.querySelector(".site-header");
        const marker = (header ? header.getBoundingClientRect().height : 0) +
          Math.min(window.innerHeight * 0.2, 120);
        const atPageBottom = window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 2;
        let activeSection = navigationSections[0];

        if (atPageBottom) {
          activeSection = navigationSections[navigationSections.length - 1];
        } else {
          navigationSections.forEach((item) => {
            const bounds = item.section.getBoundingClientRect();
            if (bounds.top <= marker && bounds.bottom > marker) activeSection = item;
          });
        }

        navigationSections.forEach(({ link, section }) => {
          if (section === activeSection.section) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      };

      window.addEventListener("scroll", () => scheduleFrame(updateActiveNavigation), { passive: true });
      window.addEventListener("resize", () => scheduleFrame(updateActiveNavigation));
      updateActiveNavigation();
    }
  }

  const routineTabs = document.querySelectorAll(".routine-tab");
  const routinePanels = document.querySelectorAll('[role="tabpanel"]');
  const routineMoreButtons = document.querySelectorAll(".routine-more");
  refreshRoutineLabels = () => {
    routineMoreButtons.forEach((button) => {
      button.textContent = phrase(button.getAttribute("aria-expanded") === "true" ? "Voir moins" : "Voir plus");
    });
  };

  routineMoreButtons.forEach((button) => {
    const timelineId = button.getAttribute("aria-controls");
    const timeline = timelineId ? document.getElementById(timelineId) : null;
    const items = timeline ? Array.from(timeline.querySelectorAll(".routine-item")) : [];

    if (!timeline || items.length <= 3) return;

    let expanded = false;
    const itemAnimations = new Map();
    items.forEach((item, index) => {
      if (index >= 3) item.hidden = true;
    });
    const updateRoutineItems = () => {
      items.forEach((item, index) => {
        if (index < 3) return;

        const previousAnimation = itemAnimations.get(item);
        if (previousAnimation) previousAnimation.cancel();
        itemAnimations.delete(item);

        if (!expanded && item.hidden) return;
        if (expanded) item.hidden = false;

        if (prefersReducedMotion() || typeof item.animate !== "function") {
          item.hidden = !expanded;
          return;
        }

        const animation = item.animate(
          expanded
            ? [
              { opacity: 0, transform: "translateY(12px)" },
              { opacity: 1, transform: "translateY(0)" },
            ]
            : [
              { opacity: 1, transform: "translateY(0)" },
              { opacity: 0, transform: "translateY(-8px)" },
            ],
          {
            duration: 280,
            delay: expanded ? (index - 3) * 55 : (items.length - index - 1) * 35,
            easing: "cubic-bezier(.2, .75, .25, 1)",
            fill: "both",
          },
        );
        itemAnimations.set(item, animation);
        animation.onfinish = () => {
          if (itemAnimations.get(item) !== animation) return;
          if (!expanded) item.hidden = true;
          animation.cancel();
          itemAnimations.delete(item);
        };
      });
      button.setAttribute("aria-expanded", String(expanded));
      button.textContent = phrase(expanded ? "Voir moins" : "Voir plus");
    };

    button.hidden = false;
    updateRoutineItems();
    button.addEventListener("click", () => {
      expanded = !expanded;
      updateRoutineItems();
    });
  });

  routineTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      routineTabs.forEach((item) => {
        item.setAttribute("aria-selected", String(item === tab));
        item.tabIndex = item === tab ? 0 : -1;
      });
      routinePanels.forEach((panel) => {
        panel.hidden = panel.id !== tab.getAttribute("aria-controls");
      });
    });

    tab.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextTab = routineTabs[(index + direction + routineTabs.length) % routineTabs.length];
        nextTab.focus();
        nextTab.click();
      }
    });
  });

  const profileCards = document.querySelectorAll(".profile-card");
  const profileDialog = document.querySelector(".profile-dialog");
  const profileDialogTitle = document.querySelector("#profile-dialog-title");
  const profileDialogIcon = document.querySelector(".profile-dialog-icon");
  const profileDialogContent = document.querySelector(".profile-dialog-content");
  const profileDialogClose = document.querySelector(".profile-dialog-close");

  if (profileDialog && profileDialogTitle && profileDialogIcon &&
      profileDialogContent && profileDialogClose) {
    let profileDialogTrigger;
    let activeProfileTemplate;
    let profileDialogScrollY = 0;

    refreshProfileDialog = () => {
      if (!profileDialog.open || !profileDialogTrigger || !activeProfileTemplate) return;
      const title = profileDialogTrigger.querySelector(".profile-title");
      const icon = profileDialogTrigger.querySelector(".card-icon");
      if (!title || !icon) return;

      profileDialogTitle.textContent = title.textContent;
      profileDialogIcon.textContent = icon.textContent;
      profileDialogContent.replaceChildren(activeProfileTemplate.content.cloneNode(true));
    };

    profileCards.forEach((card) => {
      card.addEventListener("click", () => {
        const template = card.dataset.profile
          ? document.querySelector(`#profile-${card.dataset.profile}`)
          : null;
        const title = card.querySelector(".profile-title");
        const icon = card.querySelector(".card-icon");

        if (!template || !title || !icon || !template.content) return;

        profileDialogTrigger = card;
        activeProfileTemplate = template;
        profileDialogScrollY = window.scrollY;
        profileDialogTitle.textContent = title.textContent;
        profileDialogIcon.textContent = icon.textContent;
        profileDialogContent.replaceChildren(template.content.cloneNode(true));
        profileDialog.showModal();
        profileDialogClose.focus({ preventScroll: true });
        window.scrollTo({ top: profileDialogScrollY, behavior: "instant" });
      });
    });

    profileDialogClose.addEventListener("click", () => profileDialog.close());
    profileDialog.addEventListener("click", (event) => {
      if (event.target === profileDialog) profileDialog.close();
    });
    profileDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      profileDialog.close();
    });
    profileDialog.addEventListener("close", () => {
      if (profileDialogTrigger) profileDialogTrigger.focus({ preventScroll: true });
      window.scrollTo({ top: profileDialogScrollY, behavior: "instant" });
      activeProfileTemplate = null;
    });
  }

  const galleryCards = document.querySelectorAll(".gallery-card");
  const lightbox = document.querySelector(".gallery-lightbox");
  const lightboxImage = lightbox && lightbox.querySelector("img");
  const lightboxCaption = lightbox && lightbox.querySelector(".lightbox-caption-text");
  const lightboxCount = lightbox && lightbox.querySelector(".lightbox-count");
  const lightboxClose = lightbox && lightbox.querySelector(".lightbox-close");
  const lightboxPrevious = lightbox && lightbox.querySelector(".lightbox-previous");
  const lightboxNext = lightbox && lightbox.querySelector(".lightbox-next");

  if (lightbox && lightboxImage && lightboxCaption && lightboxCount &&
      lightboxClose && lightboxPrevious && lightboxNext) {
    let lightboxTrigger;
    let lightboxScrollY = 0;
    let lightboxIndex = -1;

    const showGalleryImage = (index) => {
      const card = galleryCards[index];
      const image = card && card.querySelector("img");
      const imageSource = image && image.getAttribute("src");

      if (!card || !image || !imageSource) return false;

      lightboxIndex = index;
      lightboxImage.src = image.currentSrc || image.src;
      lightboxImage.alt = image.alt || "";
      lightboxCaption.textContent = card.dataset.caption || image.alt || "";
      lightboxCount.textContent = `${index + 1} / ${galleryCards.length}`;
      return true;
    };
    refreshGalleryCaption = () => {
      if (lightboxIndex >= 0) showGalleryImage(lightboxIndex);
    };

    const moveGalleryImage = (direction) => {
      if (!galleryCards.length) return;

      for (let offset = 1; offset <= galleryCards.length; offset += 1) {
        const nextIndex = (lightboxIndex + direction * offset + galleryCards.length) % galleryCards.length;
        if (showGalleryImage(nextIndex)) return;
      }
    };

    galleryCards.forEach((card, index) => {
      card.addEventListener("click", () => {
        if (!showGalleryImage(index)) return;

        lightboxTrigger = card;
        lightboxScrollY = window.scrollY;
        lightbox.showModal();
        lightboxClose.focus({ preventScroll: true });
        window.scrollTo({ top: lightboxScrollY, behavior: "instant" });
      });
    });

    lightboxPrevious.addEventListener("click", () => moveGalleryImage(-1));
    lightboxNext.addEventListener("click", () => moveGalleryImage(1));
    lightboxClose.addEventListener("click", () => lightbox.close());
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) lightbox.close();
    });
    document.addEventListener("keydown", (event) => {
      if (!lightbox.open) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveGalleryImage(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveGalleryImage(1);
      }
    });
    lightbox.addEventListener("close", () => {
      if (lightboxTrigger) lightboxTrigger.focus({ preventScroll: true });
      window.scrollTo({ top: lightboxScrollY, behavior: "instant" });
      lightboxImage.removeAttribute("src");
      lightboxImage.alt = "";
      lightboxCaption.textContent = "";
      lightboxCount.textContent = "";
      lightboxIndex = -1;
    });
  }

  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach((item) => {
    const summary = item.querySelector("summary");
    const answer = item.querySelector(".faq-answer");
    if (!summary || !answer) return;

    let animation;
    let shouldBeOpen = item.open;
    summary.addEventListener("click", (event) => {
      event.preventDefault();

      const isOpen = shouldBeOpen;
      shouldBeOpen = !shouldBeOpen;
      const currentHeight = answer.getBoundingClientRect().height;
      const currentOpacity = animation && typeof window.getComputedStyle === "function"
        ? Number(window.getComputedStyle(answer).opacity)
        : isOpen ? 1 : 0;
      if (animation) animation.cancel();
      answer.style.height = `${currentHeight}px`;
      answer.style.overflow = "hidden";
      answer.style.opacity = String(currentOpacity);
      if (shouldBeOpen) item.open = true;

      if (prefersReducedMotion() || typeof answer.animate !== "function") {
        item.open = shouldBeOpen;
        answer.style.removeProperty("height");
        answer.style.removeProperty("overflow");
        answer.style.removeProperty("opacity");
        animation = null;
        return;
      }

      const nextAnimation = answer.animate([
        { height: `${currentHeight}px`, opacity: currentOpacity },
        { height: `${shouldBeOpen ? answer.scrollHeight : 0}px`, opacity: shouldBeOpen ? 1 : 0 },
      ], {
        duration: 280,
        easing: "cubic-bezier(.2, .75, .25, 1)",
      });
      animation = nextAnimation;
      nextAnimation.onfinish = () => {
        if (animation !== nextAnimation) return;
        item.open = shouldBeOpen;
        answer.style.removeProperty("height");
        answer.style.removeProperty("overflow");
        answer.style.removeProperty("opacity");
        animation = null;
      };
    });
  });

  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();

  const backToTop = document.querySelector(".back-to-top");
  const mobileContact = document.querySelector(".mobile-contact-cta");
  if (backToTop || mobileContact) {
    const contactSection = document.querySelector("#contact");
    const updateScrollControls = () => {
      const isVisible = window.scrollY > 420;
      if (backToTop) {
        backToTop.hidden = false;
        backToTop.classList.toggle("is-visible", isVisible);
        backToTop.setAttribute("aria-hidden", String(!isVisible));
        backToTop.tabIndex = isVisible ? 0 : -1;
      }
      if (mobileContact) {
        const isMobile = typeof window.matchMedia === "function" &&
          window.matchMedia("(max-width: 680px)").matches;
        const contactBounds = contactSection && contactSection.getBoundingClientRect();
        const contactIsVisible = contactBounds &&
          contactBounds.top < window.innerHeight && contactBounds.bottom > 0;
        mobileContact.hidden = !(isMobile && isVisible && !contactIsVisible);
      }
    };

    if (backToTop) {
      backToTop.addEventListener("click", (event) => {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "instant" : "smooth" });
        const brand = document.querySelector(".brand");
        if (brand) brand.focus({ preventScroll: true });
      });
    }

    window.addEventListener("scroll", () => scheduleFrame(updateScrollControls), { passive: true });
    window.addEventListener("resize", () => scheduleFrame(updateScrollControls));
    updateScrollControls();
  }
}());
