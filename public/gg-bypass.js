(() => {
  "use strict";

  // ===== HOOK REPLACEMENT =====
  // Override their event system
  const hijackEventSystem = () => {
    const blockedEvents = [
      "before-unload/override",
      "explicit-image-filter/openBlockReasonModal",
      "health/checkHealth",
      "youtube/settingsRequest",
      "youtube/settingsResponse",
      "youtube/checkVideo",
      "youtube/checkVideoResult",
      "youtube/videoPlayed",
      "youtube/injectionHealthy",
      "youtube/destroy",
    ];

    const originalDispatch = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function (event) {
      if (event instanceof CustomEvent && blockedEvents.includes(event.type)) {
        console.log("[GG-BYPASS] Blocked event:", event.type);
        return false;
      }
      return originalDispatch.call(this, event);
    };

    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (blockedEvents.includes(type)) {
        console.log("[GG-BYPASS] Blocked listener:", type);
        return;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  };

  // ===== RESTORE BEFOREUNLOAD =====
  const restoreBeforeUnload = () => {
    Object.defineProperty(window, "onbeforeunload", {
      set: function (value) {
        console.log("[GG-BYPASS] Prevented onbeforeunload override");
      },
      get: function () {
        return null;
      },
      configurable: true,
    });

    window.addEventListener(
      "beforeunload",
      function (e) {
        const original = e.stopImmediatePropagation;
        e.stopImmediatePropagation = function () {
          console.log("[GG-BYPASS] Blocked stopImmediatePropagation");
        };
      },
      true,
    );
  };

  // ===== ELEMENT REMOVAL =====
  const forceRemoveElements = () => {
    const removeByAttribute = (attrPrefix) => {
      document.querySelectorAll("*").forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
          if (attr.name.startsWith(attrPrefix)) {
            console.log("[GG-BYPASS] Removing element with:", attr.name);
            el.remove();
          }
        });
      });
    };

    const removeBySelector = (selectors) => {
      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          console.log("[GG-BYPASS] Removing element:", selector);
          el.remove();
        });
      });
    };

    removeByAttribute("data-gg-");

    removeBySelector([
      "[data-gg-beacon-banner-anchor]",
      '[class*="gg-"]',
      '[id*="gg-"]',
      'iframe[src*="goguardian"]',
      'script[src*="goguardian"]',
      'div[class*="goguardian"]',
    ]);
  };

  // ===== MUTATION OBSERVER =====
  const watchForInjections = () => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const el = node;

            const hasGGAttribute = Array.from(el.attributes || []).some((attr) =>
              attr.name.startsWith("data-gg-"),
            );

            if (
              hasGGAttribute ||
              el.className?.includes("gg-") ||
              el.id?.includes("gg-") ||
              (el.tagName === "SCRIPT" && el.src?.includes("goguardian"))
            ) {
              console.log("[GG-BYPASS] Blocked injection:", el);
              el.remove();
            }

            el.querySelectorAll?.("*").forEach((child) => {
              const hasChildGG = Array.from(child.attributes || []).some((attr) =>
                attr.name.startsWith("data-gg-"),
              );
              if (hasChildGG) {
                console.log("[GG-BYPASS] Blocked child injection:", child);
                child.remove();
              }
            });
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-gg-beacon-banner-anchor"],
    });

    return observer;
  };

  // ===== POSTMESSAGE BLOCKER =====
  const blockPostMessages = () => {
    const originalPostMessage = window.postMessage;
    window.postMessage = function (message, targetOrigin, transfer) {
      if (message && typeof message === "object" && message.type) {
        if (
          message.type.includes("/") ||
          message.type.includes("gg") ||
          message.type.includes("youtube")
        ) {
          console.log("[GG-BYPASS] Blocked postMessage:", message.type);
          return;
        }
      }
      return originalPostMessage.call(this, message, targetOrigin, transfer);
    };
  };

  // ===== IFRAME BLOCKER =====
  const blockIframes = () => {
    const originalCreateElement = document.createElement;
    document.createElement = function (tagName) {
      const element = originalCreateElement.call(document, tagName);

      if (tagName.toLowerCase() === "iframe") {
        const originalSetAttribute = element.setAttribute;
        element.setAttribute = function (name, value) {
          if (
            name === "src" &&
            (value.includes("goguardian") || value.includes("gg-") || value.includes("beacon"))
          ) {
            console.log("[GG-BYPASS] Blocked iframe:", value);
            return;
          }
          return originalSetAttribute.call(this, name, value);
        };
      }

      return element;
    };
  };

  // ===== NETWORK REQUEST BLOCKER =====
  const blockNetworkRequests = () => {
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const url = args[0];
      if (
        typeof url === "string" &&
        (url.includes("goguardian") || url.includes("gg-") || url.includes("beacon"))
      ) {
        console.log("[GG-BYPASS] Blocked fetch:", url);
        return Promise.reject(new Error("Blocked by GG-Bypass"));
      }
      return originalFetch.apply(this, args);
    };

    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function () {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      xhr.open = function (method, url) {
        if (
          typeof url === "string" &&
          (url.includes("goguardian") || url.includes("gg-") || url.includes("beacon"))
        ) {
          console.log("[GG-BYPASS] Blocked XHR:", url);
          return;
        }
        return originalOpen.apply(this, arguments);
      };
      return xhr;
    };
  };

  // ===== SCRIPT BLOCKER =====
  const blockScripts = () => {
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function (child) {
      if (
        child.tagName === "SCRIPT" &&
        (child.src?.includes("goguardian") ||
          child.src?.includes("gg-") ||
          child.textContent?.includes("gg-inject"))
      ) {
        console.log("[GG-BYPASS] Blocked script:", child.src || "inline");
        return child;
      }
      return originalAppendChild.call(this, child);
    };
  };

  // ===== CONTINUOUS CLEANUP =====
  const continuousCleanup = () => {
    setInterval(() => {
      forceRemoveElements();
    }, 1000);
  };

  // ===== INIT =====
  console.log("[GG-BYPASS] Initializing...");

  hijackEventSystem();
  restoreBeforeUnload();
  blockPostMessages();
  blockIframes();
  blockNetworkRequests();
  blockScripts();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      forceRemoveElements();
      watchForInjections();
      continuousCleanup();
    });
  } else {
    forceRemoveElements();
    watchForInjections();
    continuousCleanup();
  }

  console.log("[GG-BYPASS] Active and monitoring");
})();
