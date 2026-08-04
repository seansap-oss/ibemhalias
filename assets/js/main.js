// IBEMH ALIAS - Main JavaScript with Alpine.js Data

document.addEventListener("alpine:init", () => {
  // Mobile Menu State
  Alpine.data("mobileMenu", () => ({
    open: false,
    toggle() {
      this.open = !this.open;
      document.body.classList.toggle("overflow-hidden");
    },
    close() {
      this.open = false;
      document.body.classList.remove("overflow-hidden");
    },
  }));

  // Dark Mode Toggle
  Alpine.data("darkMode", () => ({
    dark: localStorage.getItem("theme") === "dark" || false,
    toggle() {
      this.dark = !this.dark;
      if (this.dark) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
    },
    init() {
      if (
        localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ) {
        this.dark = true;
        document.documentElement.classList.add("dark");
      }
    },
  }));

  // AI Chatbot
  Alpine.data("aiChatbot", () => ({
    open: false,
    minimized: false,
    newMessage: "",
    messages: [
      {
        from: "ai",
        content: "Hello! I'm your AI Study Assistant from IBEMH ALIAS. How can I help with your UPSC preparation today?",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ],
    quickActions: [
      "Create my study plan",
      "Evaluate my answer",
      "Summarize today's current affairs",
      "Mock interview practice",
      "Explain GS syllabus",
    ],
    toggle() {
      this.open = !this.open;
      this.minimized = false;
      if (this.open) {
        setTimeout(() => {
          const input = document.querySelector("#ai-message-input");
          input?.focus();
        }, 300);
      }
    },
    minimize() {
      this.minimized = !this.minimized;
    },
    sendMessage() {
      if (!this.newMessage.trim()) return;

      const userMessage = this.newMessage;
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      this.messages.push({
        from: "user",
        content: userMessage,
        time: time,
      });

      this.newMessage = "";

      setTimeout(() => {
        let reply = "";
        if (userMessage.toLowerCase().includes("study plan")) {
          reply = "🔍 Based on your profile, here's your personalized study plan:\n\n**Phase 1 (Months 1-3):** NCERT Foundation + Current Affairs (last 1 year)\n**Phase 2 (Months 4-8):** GS Mains + Optional Subject\n**Phase 3 (Months 9-12):** Test Series + Answer Writing\n\nWould you like me to customize this further?";
        } else if (userMessage.toLowerCase().includes("answer")) {
          reply = "Please paste your answer here and I'll evaluate it based on UPSC marking scheme:\n\n- Introduction quality (2 marks)\n- Content coverage (5-6 marks)\n- Structure & flow (2-3 marks)\n- Conclusion (1 mark)\n\nShare your answer and I'll provide detailed feedback.";
        } else if (userMessage.toLowerCase().includes("current affair")) {
          reply = "📰 **Today's Important Current Affairs**\n\n1. **Governance:** New criminal law amendments - key changes in bail provisions\n2. **Economy:** RBI MPC meeting outcomes - repo rate status quo at 6.5%\n3. **International:** India-Japan summit - defence cooperation agreements\n4. **Science & Tech:** ISRO's NavIC satellite mission update\n5. **Environment:** Global bio-diversity framework implementation status\n\nWould you like detailed analysis of any specific topic?";
        } else if (userMessage.toLowerCase().includes("mock interview") || userMessage.toLowerCase().includes("interview")) {
          reply = "🎤 **Mock Interview Simulator Activated**\n\nLet's start! Here's a common UPSC interview question:\n\n\"**What are the key challenges in implementing the National Education Policy 2020?**\"\n\nTake 2 minutes to think, then respond. I'll provide feedback on your answer.";
        } else if (userMessage.toLowerCase().includes("syllabus")) {
          reply = "📚 **UPSC CSE 2024-25 Syllabus Overview**\n\n**Prelims:**\n- GS Paper 1 (200 marks): History, Geography, Economy, Polity, Science & Tech, Environment\n- CSAT (200 marks): Comprehension, Reasoning, Mental Ability\n\n**Mains (5 papers, 1000 marks):**\n- GS 1: Indian Heritage, History, Geography\n- GS 2: Governance, Polity, International Relations\n- GS 3: Economy, Science & Tech, Environment, Security\n- GS 4: Ethics, Integrity, Aptitude\n- Essay (250 marks) + Optional (500 marks)\n\nNeed detailed breakdown of any paper?";
        } else if (
          userMessage.toLowerCase().includes("hello") ||
          userMessage.toLowerCase().includes("hi") ||
          userMessage.toLowerCase().includes("hey")
        ) {
          reply = "Hello! 👋 I'm your AI Study Assistant. I can help you with:\n\n✅ Personalized study plans\n✅ Answer writing feedback\n✅ Current affairs summaries\n✅ Interview preparation\n✅ Syllabus guidance\n\nWhat would you like to start with?";
        } else if (userMessage.toLowerCase().includes("thank")) {
          reply = "You're welcome! 😊 Is there anything else I can help you with in your UPSC preparation?";
        } else {
          reply = "I'm here to help with your UPSC preparation! You can ask me about:\n\n• Creating a personalized study plan\n• Evaluating your answers\n• Current affairs summaries\n• Mock interview practice\n• Syllabus guidance\n\nOr try one of these quick actions: " + this.quickActions.join(", ");
        }

        this.messages.push({
          from: "ai",
          content: reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });

        // Scroll to bottom
        setTimeout(() => {
          const container = document.querySelector("#chat-messages");
          container.scrollTop = container.scrollHeight;
        }, 100);
      }, 800);
    },
    quickAction(action) {
      this.newMessage = action;
      this.sendMessage();
    },
    formatMessage(text) {
      return text
        .replace(/^### (.*$)/gm, "<h3 class='font-semibold text-primary-600 dark:text-primary-400 mt-3 mb-1'>$1</h3>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
    },
  }));

  // Test Series Counter
  Alpine.data("counter", (options = {}) => ({
    count: options.start || 0,
    end: options.end || 100,
    duration: options.duration || 2000,
    step: 0,
    init() {
      const increment = this.end / (this.duration / 16);
      const timer = setInterval(() => {
        this.step += increment;
        if (this.step >= this.end) {
          this.count = this.end;
          clearInterval(timer);
        } else {
          this.count = Math.floor(this.step);
        }
      }, 16);
    },
  }));

  // Course Filter
  Alpine.data("courseFilter", () => ({
    activeFilter: "all",
    filters: ["all", "classroom", "online", "test-series", "ai-tools"],
    filter(category) {
      this.activeFilter = category;
    },
    get filteredCourses() {
      // This would be populated from the page data
      return window.ALL_COURSES ? window.ALL_COURSES.filter(c => this.activeFilter === "all" || c.category === this.activeFilter) : [];
    },
  }));

  // Topper Carousel
  Alpine.data("topperCarousel", () => ({
    currentIndex: 0,
    toppers: [],
    autoPlay: true,
    interval: null,
    init() {
      this.toppers = window.TOPPERS || [];
      if (this.autoPlay && this.toppers.length > 0) {
        this.interval = setInterval(() => {
          this.next();
        }, 5000);
      }
    },
    next() {
      this.currentIndex = (this.currentIndex + 1) % this.toppers.length;
    },
    prev() {
      this.currentIndex =
        (this.currentIndex - 1 + this.toppers.length) % this.toppers.length;
    },
    goTo(index) {
      this.currentIndex = index;
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = setInterval(() => {
          this.next();
        }, 5000);
      }
    },
    pause() {
      if (this.interval) {
        clearInterval(this.interval);
      }
    },
    resume() {
      if (this.autoPlay) {
        this.interval = setInterval(() => {
          this.next();
        }, 5000);
      }
    },
  }));
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// Lazy loading for images
document.addEventListener("DOMContentLoaded", function () {
  const lazyImages = [].slice.call(document.querySelectorAll("img.lazy"));
  if ("IntersectionObserver" in window) {
    let lazyImageObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          let lazyImage = entry.target;
          lazyImage.src = lazyImage.dataset.src;
          lazyImage.classList.remove("lazy");
          lazyImage.classList.add("lazy-loaded");
          lazyImageObserver.unobserve(lazyImage);
        }
      });
    });
    lazyImages.forEach(function (lazyImage) {
      lazyImageObserver.observe(lazyImage);
    });
  }
});

// Close mobile menu when clicking outside
document.addEventListener("click", function (e) {
  if (window.alpine?.mobileMenu && window.alpine.mobileMenu.open) {
    const menu = document.querySelector("[x-cloak] nav > div.fixed");
    const button = document.querySelector("[@click=\"mobileMenu.toggle()\"]");
    if (!menu?.contains(e.target) && !button?.contains(e.target)) {
      window.alpine.mobileMenu.close();
    }
  }
});
