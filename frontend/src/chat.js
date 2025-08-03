document.addEventListener("DOMContentLoaded", function () {
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const chatbox = document.getElementById("chatbox");
  const botNotify = document.getElementById("botNotify");
  const openChatButton = document.getElementById("openChatButton");
  const notificactionSFX = new Audio("./sfx/notification.mp3");
  const status = document.getElementById("status");
  const deleteChatButton = document.getElementById("deleteChat");
  const suggestions = document.getElementById("suggestions");
  let lastTime = null;

  const APP_STATUS = {
    ONLINE: {
      text: "En linea <i class='fa-solid fa-signal animate-pulse'></i>",
      color: "!text-primary",
    },
    OFFLINE: {
      text: "Desconectada <i class='fa-solid fa-skull'></i>",
      color: "!text-gray-200",
    },
    THINKING: {
      text: " <i class='fa-solid fa-circle-notch animate-spin-and-pulse flex'></i>",
      color: "!text-gray-400",
    },
    RESPONDING: {
      text: "Respondiendo <i class='fa-solid fa-i-cursor animate-pulse'></i>",
      color: "!text-gray-200",
    },
    ERROR: {
      text: "En Mantenimiento <i class='fa-solid fa-exclamation-triangle'></i>",
      color: "!text-red-400",
    },
  };

  let currentStatus = APP_STATUS.OFFLINE;

  status.innerHTML = currentStatus["text"];
  status.classList.add(currentStatus["color"]);

  function resetChat() {
    const allMessages = chatbox.querySelectorAll(".chatBoxMessage");
    allMessages.forEach((message) => message.remove());
    localStorage.setItem("sessionId", crypto.randomUUID());
    status.classList.remove(currentStatus["color"]);
    currentStatus = APP_STATUS.OFFLINE;
    status.innerHTML = currentStatus["text"];
    status.classList.add(currentStatus["color"]);
    suggestions.style.display = "";
    lastTime = null;
  }

  function getOrCreateSessionId() {
    let sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("sessionId", sessionId);
    }
    return sessionId;
  }

  async function getBotResponse(message, onChunk) {
    const response = await fetch(`http://localhost:4000/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: message,
        sessionId: getOrCreateSessionId(),
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(
        "Massi, tu asistente de Tienda Mass, está fuera de servicio por unos momentos. ¡Lo sentimos! Estamos trabajando para volver pronto. 🛠 Gracias por tu paciencia."
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let rawText = "";
    let fullResponse = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunkText = decoder.decode(value, { stream: true });
      rawText += chunkText;
      fullResponse += chunkText;

      if (onChunk) onChunk(chunkText);
    }

    console.log(rawText);

    return fullResponse;
  }

  function formatDate(date) {
    const d = date.getDate().toString().padStart(2, "0");
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const y = date.getFullYear();

    let hh = date.getHours();
    const mm = date.getMinutes().toString().padStart(2, "0");

    const ampm = hh >= 12 ? "PM" : "AM";
    hh = hh % 12;
    hh = hh ? hh : 12;

    const hourFormatted = hh.toString().padStart(2, "0");

    return `${d}/${m}/${y} - ${hourFormatted}:${mm} ${ampm}`;
  }

  function formatBotResponse(text) {
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    text = text.replace(/(\bhttps?:\/\/[^\s<]+|\bwww\.[^\s<]+)/gi, (url) => {
      const href = url.startsWith("http") ? url : `https://${url}`;
      return `<a class="underline underline-offset-1" href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });

    const lines = text.split("\n");
    let html = "";
    let inList = false;

    for (let line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith("* ")) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }

        html += `<li> - ${trimmed.substring(2)}</li>`;
      } else if (trimmed === "") {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
      } else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<p>${trimmed}</p>`;
      }
    }

    if (inList) {
      html += "</ul>";
    }

    return html;
  }

  async function updateLastBotMessage(newText) {
    const allMessages = chatbox.querySelectorAll(".botMessage");
    const lastBotMessage = allMessages[allMessages.length - 1];

    if (lastBotMessage) {
      let formatted = formatBotResponse(newText);

      lastBotMessage.innerHTML = formatted;
      chatbox.scrollTo({
        top: chatbox.scrollHeight,
        behavior: "smooth",
      });
    }
  }

  openChatButton.addEventListener("click", () => {
    botNotify.style.opacity = 0;
  });

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendButton.click();
      messageInput.value = "";
      messageInput.rows = "1";
      messageInput.focus();
    }
  });

  document.querySelectorAll(".suggestionMessage").forEach((suggestion) => {
    suggestion.addEventListener("click", (e) => {
      e.preventDefault();
      const message = suggestion.querySelector("span");
      messageInput.value = message.textContent;
      sendButton.click();
    });
  });

  sendButton.addEventListener("click", (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    
    if (message === "") {
      messageInput.focus();
      return;
    }
    
    suggestions.style.display = "none";

    sendMessage("user", messageInput.value);
    messageInput.disabled = true;
    messageInput.classList.add("!bg-gray-200");
    messageInput.value = "";

    status.classList.remove(currentStatus["color"]);
    currentStatus = APP_STATUS.THINKING;
    status.innerHTML = currentStatus["text"];
    status.classList.add(currentStatus["color"]);

    const waitingElement = sendMessage("bot", null);

    let finalResponse = "";
    let playedSound = false;

    getBotResponse(message, async (chunk) => {
      if (!playedSound) {
        status.classList.remove(currentStatus["color"]);
        currentStatus = APP_STATUS.RESPONDING;
        status.innerHTML = currentStatus["text"];
        status.classList.add(currentStatus["color"]);
        botNotify.style.opacity = 1;
        notificactionSFX.play();
        playedSound = true;
      }

      if (waitingElement && waitingElement.isConnected) {
        waitingElement.remove();
        sendMessage("bot", "_");
      }

      finalResponse += chunk;
      updateLastBotMessage(finalResponse);
    })
      .then(() => {
        messageInput.disabled = false;
        messageInput.classList.remove("!bg-gray-200");
        messageInput.focus();
        status.classList.remove(currentStatus["color"]);
        currentStatus = APP_STATUS.ONLINE;
        status.innerHTML = currentStatus["text"];
        status.classList.add(currentStatus["color"]);
      })
      .catch((error) => {
        messageInput.disabled = false;
        waitingElement.remove();
        sendMessage("bot", error.message);
        status.classList.remove(currentStatus["color"]);
        currentStatus = APP_STATUS.ERROR;
        status.innerHTML = currentStatus["text"];
        status.classList.add(currentStatus["color"]);
      });
  });

  deleteChatButton.addEventListener("click", (e) => {
    e.preventDefault();
    resetChat();
  });

  function sendMessage(sender, message, type = "") {
    if (sender === "bot") {
      if (message === null) {
        let waiting = document.createElement("div");
        waiting.innerHTML = `
          <div class="flex items-center justify-start gap-2">
            <span class="overflow-hidden rounded-full flex items-center justify-center bg-primary w-[40px] h-[40px] border-2 border-secondary text-secondary">
              <img class="w-full h-full object-cover rounded-full" src="./favicon.png">
            </span>
            <div class="w-[16px] h-[16px] flex bg-secondary rounded-full animate-dot-1 origin-center"></div>
            <div class="w-[16px] h-[16px] flex bg-secondary rounded-full animate-dot-2 origin-center"></div>
            <div class="w-[16px] h-[16px] flex bg-secondary rounded-full animate-dot-3 origin-center"></div>
          </div>
        `;

        chatbox.appendChild(waiting);

        chatbox.scrollTo({
          top: chatbox.scrollHeight,
          behavior: "smooth",
        });

        return waiting;
      }

      let template = document.getElementById("botChatbox");
      let botChatbox = template.content.cloneNode(true);

      let botMessage = botChatbox.querySelector(".botMessage");
      botMessage.textContent = message;
      let parent = botMessage.parentElement;

      let currentTime = new Date().getMinutes();

      if (lastTime + 5 <= currentTime) {
        let currentDate = document.createElement("div");
        currentDate.classList.add(
          "w-full",
          "flex",
          "items-center",
          "justify-center",
          "opacity-80"
        );
        currentDate.innerHTML = `
          <span class="text-white text-xs bg-secondary px-3 py-1 rounded-full flex">
            ${new Date().toLocaleString()}
          </span>
        `;

        parent.parentElement.insertBefore(currentDate, parent);
        lastTime = new Date().getMinutes();
      }

      chatbox.appendChild(botChatbox);

      chatbox.scrollTo({
        top: chatbox.scrollHeight,
        behavior: "smooth",
      });
    } else if (sender === "user") {
      let template = document.getElementById("userChatbox");
      let userChatbox = template.content.cloneNode(true);

      let userMessage = userChatbox.querySelector(".userMessage");
      userMessage.textContent = message;
      let parent = userMessage.parentElement;

      let currentTime = new Date().getMinutes();

      if (lastTime + 5 <= currentTime) {
        let currentDate = document.createElement("div");
        currentDate.classList.add(
          "w-full",
          "flex",
          "items-center",
          "justify-center",
          "opacity-80"
        );
        currentDate.innerHTML = `
          <span class="text-white text-xs bg-secondary px-3 py-1 rounded-full flex">
            ${formatDate(new Date())}
          </span>
        `;

        parent.parentElement.insertBefore(currentDate, parent);
        lastTime = new Date().getMinutes();
      }

      chatbox.appendChild(userChatbox);

      chatbox.scrollTo({
        top: chatbox.scrollHeight,
        behavior: "smooth",
      });
    }
  }
});
