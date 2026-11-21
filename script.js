const WORKER_URL = "https://loreal-chatbot.gonzalez-ivan1201.workers.dev";
const STORAGE_KEY = "loreal_selected_product_ids";
const RTL_STORAGE_KEY = "loreal_rtl_mode";

/* DOM References */
const categoryFilter = document.getElementById("categoryFilter");
const productSearchInput = document.getElementById("productSearchInput");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const selectedCount = document.getElementById("selectedCount");
const clearAllBtn = document.getElementById("clearAllBtn");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatWindow = document.getElementById("chatWindow");
const rtlToggleBtn = document.getElementById("rtlToggleBtn");
const rtlToggleLabel = document.getElementById("rtlToggleLabel");

/* Modal DOM References */
const productModal = document.getElementById("productModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalProductImg = document.getElementById("modalProductImg");
const modalProductBrand = document.getElementById("modalProductBrand");
const modalProductTitle = document.getElementById("modalProductTitle");
const modalProductCategory = document.getElementById("modalProductCategory");
const modalProductDesc = document.getElementById("modalProductDesc");
const modalSelectBtn = document.getElementById("modalSelectBtn");

/* Application State */
let allProducts = [];
let selectedProductIds = new Set(
  JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
);

/* System Prompt keeping the AI focused on L'Oréal products & beauty routines */
const SYSTEM_PROMPT = `You are the L'Oréal Smart Routine & Product Advisor, an expert beauty, skincare, haircare, makeup, and fragrance specialist.
Your role:
1. Build clear, step-by-step personalized routines (e.g., Morning / Evening or Application Order) using ONLY the products provided by the user, explaining why each product fits its step and how to layer or apply them safely.
2. Answer follow-up questions strictly related to the generated routine, L'Oréal group brands (L'Oréal Paris, CeraVe, La Roche-Posay, Garnier, Lancôme, Maybelline, Kérastase, Redken, Kiehl's, YSL, etc.), skincare, haircare, makeup, suncare, men's grooming, or fragrance.
3. If a user asks about unrelated topics (coding, politics, math, general trivia), politely decline and steer the conversation back to their beauty routine or L'Oréal products.
4. When live web search results are available, incorporate up-to-date product insights and include clickable Markdown source links where helpful.`;

/* Conversation history sent to the Worker */
let conversationHistory = [
  { role: "system", content: SYSTEM_PROMPT }
];

/* Save selected IDs to localStorage */
function saveSelections() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...selectedProductIds]));
}

/* Load products from products.json */
async function loadProducts() {
  try {
    const response = await fetch("products.json");
    const data = await response.json();
    allProducts = data.products || [];
    filterAndRenderProducts();
    renderSelectedProducts();
  } catch (error) {
    console.error("Failed to load products.json:", error);
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Unable to load products. Please refresh the page.
      </div>
    `;
  }
}

/* Filter by both category dropdown and live search input */
function filterAndRenderProducts() {
  const selectedCategory = categoryFilter.value;
  const searchTerm = productSearchInput.value.trim().toLowerCase();

  const filtered = allProducts.filter((product) => {
    const matchesCategory =
      selectedCategory === "all" ||
      selectedCategory === "" ||
      product.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      !searchTerm ||
      product.name.toLowerCase().includes(searchTerm) ||
      product.brand.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm) ||
      (product.description &&
        product.description.toLowerCase().includes(searchTerm));

    return matchesCategory && matchesSearch;
  });

  displayProducts(filtered);
}

/* Render product cards */
function displayProducts(products) {
  if (!products.length) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No matching products found. Try another category or search keyword.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProductIds.has(product.id);
      return `
        <div
          class="product-card ${isSelected ? "selected" : ""}"
          data-id="${product.id}"
          tabindex="0"
          role="button"
          aria-pressed="${isSelected}"
        >
          <span class="selected-badge"><i class="fa-solid fa-check"></i> Selected</span>
          <img src="${product.image}" alt="${product.name}" loading="lazy" />
          <div class="product-info">
            <div>
              <p class="brand-label">${product.brand}</p>
              <h3>${product.name}</h3>
            </div>
            <button
              type="button"
              class="details-btn"
              data-details-id="${product.id}"
            >
              <i class="fa-solid fa-circle-info"></i> View Details
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

/* Toggle product selection state */
function toggleProductSelection(productId) {
  const id = Number(productId);
  if (selectedProductIds.has(id)) {
    selectedProductIds.delete(id);
  } else {
    selectedProductIds.add(id);
  }
  saveSelections();
  filterAndRenderProducts();
  renderSelectedProducts();
}

/* Render Selected Products chips + Clear All button */
function renderSelectedProducts() {
  const selectedItems = allProducts.filter((p) => selectedProductIds.has(p.id));
  selectedCount.textContent = selectedItems.length;
  clearAllBtn.hidden = selectedItems.length === 0;

  if (selectedItems.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="empty-selection-msg">
        No products selected yet. Click any product card above to add it.
      </p>
    `;
    return;
  }

  selectedProductsList.innerHTML = selectedItems
    .map(
      (item) => `
      <div class="selected-chip">
        <span><strong>${item.brand}:</strong> ${item.name}</span>
        <button
          type="button"
          class="remove-chip-btn"
          data-remove-id="${item.id}"
          aria-label="Remove ${item.name}"
        >
          &times;
        </button>
      </div>
    `
    )
    .join("");
}

/* Open Product Description Modal */
function openProductModal(productId) {
  const product = allProducts.find((p) => p.id === Number(productId));
  if (!product) return;

  modalProductImg.src = product.image;
  modalProductImg.alt = product.name;
  modalProductBrand.textContent = product.brand;
  modalProductTitle.textContent = product.name;
  modalProductCategory.textContent = product.category;
  modalProductDesc.textContent =
    product.description || "No description available for this product.";

  const updateModalBtn = () => {
    const isSelected = selectedProductIds.has(product.id);
    modalSelectBtn.textContent = isSelected
      ? "Remove from Routine"
      : "Add to Routine";
    modalSelectBtn.classList.toggle("selected-state", isSelected);
  };

  updateModalBtn();
  modalSelectBtn.onclick = () => {
    toggleProductSelection(product.id);
    updateModalBtn();
  };

  productModal.hidden = false;
}

/* Format basic Markdown (bold, links, lists, line breaks) safely */
function formatMarkdown(text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    .replace(/^###\s+(.+)$/gm, "<h4>$1</h4>")
    .replace(/^##\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^\s*[-*]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

/* Append message bubble to chat window */
function appendMessage(role, content, isLoading = false) {
  const msgWrapper = document.createElement("div");
  msgWrapper.className = `chat-message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  if (isLoading) {
    bubble.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${content}`;
  } else if (role === "assistant") {
    bubble.innerHTML = formatMarkdown(content);
  } else {
    bubble.textContent = content;
  }

  msgWrapper.appendChild(bubble);
  chatWindow.appendChild(msgWrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return msgWrapper;
}

/* Send conversationHistory to Cloudflare Worker */
async function sendToWorker(messages) {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      enableWebSearch: true
    })
  });

  if (!response.ok) {
    throw new Error(`Worker returned status ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data.reply;
}

/* Generate Routine Button Handler */
generateRoutineBtn.addEventListener("click", async () => {
  const selectedItems = allProducts.filter((p) => selectedProductIds.has(p.id));

  if (selectedItems.length === 0) {
    appendMessage(
      "assistant",
      "Please select at least one product from the grid above before generating your routine!"
    );
    return;
  }

  const productPayload = selectedItems.map(({ id, name, brand, category, description }) => ({
    id,
    name,
    brand,
    category,
    description
  }));

  const userPrompt = `Please build a personalized routine using these selected products:\n${JSON.stringify(
    productPayload,
    null,
    2
  )}`;

  appendMessage(
    "user",
    `Generate a routine for my ${selectedItems.length} selected product(s): ${selectedItems
      .map((p) => p.name)
      .join(", ")}.`
  );

  conversationHistory.push({ role: "user", content: userPrompt });

  generateRoutineBtn.disabled = true;
  sendBtn.disabled = true;
  const loadingMsg = appendMessage(
    "assistant",
    "Analyzing your selected products and crafting your routine…",
    true
  );

  try {
    const reply = await sendToWorker(conversationHistory);
    loadingMsg.remove();
    appendMessage("assistant", reply);
    conversationHistory.push({ role: "assistant", content: reply });
  } catch (error) {
    loadingMsg.remove();
    appendMessage(
      "assistant",
      `Sorry, I couldn't connect to the routine advisor right now (${error.message}). Please check your Cloudflare Worker URL and try again.`
    );
  } finally {
    generateRoutineBtn.disabled = false;
    sendBtn.disabled = false;
  }
});

/* Follow-up Chat Form Submission */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  userInput.value = "";
  appendMessage("user", text);
  conversationHistory.push({ role: "user", content: text });

  sendBtn.disabled = true;
  generateRoutineBtn.disabled = true;
  const loadingMsg = appendMessage("assistant", "Thinking…", true);

  try {
    const reply = await sendToWorker(conversationHistory);
    loadingMsg.remove();
    appendMessage("assistant", reply);
    conversationHistory.push({ role: "assistant", content: reply });
  } catch (error) {
    loadingMsg.remove();
    appendMessage(
      "assistant",
      `Error reaching the advisor: ${error.message}`
    );
  } finally {
    sendBtn.disabled = false;
    generateRoutineBtn.disabled = false;
    userInput.focus();
  }
});

/* Event Listeners for Filters, Grid Clicks, Selected Chips, Modal, and RTL */
categoryFilter.addEventListener("change", filterAndRenderProducts);
productSearchInput.addEventListener("input", filterAndRenderProducts);

productsContainer.addEventListener("click", (e) => {
  const detailsBtn = e.target.closest("[data-details-id]");
  if (detailsBtn) {
    e.stopPropagation();
    openProductModal(detailsBtn.dataset.detailsId);
    return;
  }

  const card = e.target.closest(".product-card");
  if (card) {
    toggleProductSelection(card.dataset.id);
  }
});

productsContainer.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    const card = e.target.closest(".product-card");
    if (card && !e.target.closest(".details-btn")) {
      e.preventDefault();
      toggleProductSelection(card.dataset.id);
    }
  }
});

selectedProductsList.addEventListener("click", (e) => {
  const removeBtn = e.target.closest("[data-remove-id]");
  if (removeBtn) {
    toggleProductSelection(removeBtn.dataset.removeId);
  }
});

clearAllBtn.addEventListener("click", () => {
  selectedProductIds.clear();
  saveSelections();
  filterAndRenderProducts();
  renderSelectedProducts();
});

closeModalBtn.addEventListener("click", () => {
  productModal.hidden = true;
});

productModal.addEventListener("click", (e) => {
  if (e.target === productModal) {
    productModal.hidden = true;
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !productModal.hidden) {
    productModal.hidden = true;
  }
});

/* LevelUp: RTL Toggle Support */
function applyRtlState(isRtl) {
  document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
  rtlToggleBtn.classList.toggle("active", isRtl);
  rtlToggleLabel.textContent = isRtl ? "RTL Mode: On" : "RTL Mode: Off";
  localStorage.setItem(RTL_STORAGE_KEY, String(isRtl));
}

rtlToggleBtn.addEventListener("click", () => {
  const currentlyRtl = document.documentElement.getAttribute("dir") === "rtl";
  applyRtlState(!currentlyRtl);
});

/* Initialize App */
applyRtlState(localStorage.getItem(RTL_STORAGE_KEY) === "true");
loadProducts();