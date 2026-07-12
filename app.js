const state = {
  recipes: [],
  filtered: [],
  view: localStorage.getItem("recipeView") || "grid",
  query: "",
  sort: "title",
};

const nodes = {
  recipesView: document.querySelector("#recipesView"),
  detailView: document.querySelector("#detailView"),
  builderView: document.querySelector("#builderView"),
  recipeGrid: document.querySelector("#recipeGrid"),
  resultCount: document.querySelector("#resultCount"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  gridButton: document.querySelector("#gridButton"),
  listButton: document.querySelector("#listButton"),
  recipeDetail: document.querySelector("#recipeDetail"),
  printButton: document.querySelector("#printButton"),
  form: document.querySelector("#recipeForm"),
  jsonPreview: document.querySelector("#jsonPreview"),
  builderFilename: document.querySelector("#builderFilename"),
  copyJsonButton: document.querySelector("#copyJsonButton"),
  downloadJsonButton: document.querySelector("#downloadJsonButton"),
};

function imagePath(path) {
  return path ? path.replace(/^images\//, "assets/images/") : "";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value) {
  return String(value || "recipe")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-") || "recipe";
}

async function loadIndex() {
  const response = await fetch("data/recipes-index.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("Could not load recipe index");
  const data = await response.json();
  state.recipes = data.recipes || [];
  applyFilters();
}

function applyFilters() {
  const query = state.query.trim().toLowerCase();
  state.filtered = state.recipes.filter((recipe) => {
    if (!query) return true;
    return recipe.search.includes(query);
  });

  state.filtered.sort((a, b) => {
    if (state.sort === "ingredients") return b.ingredientCount - a.ingredientCount || a.title.localeCompare(b.title);
    if (state.sort === "steps") return b.stepCount - a.stepCount || a.title.localeCompare(b.title);
    return a.title.localeCompare(b.title);
  });

  renderCards();
}

function renderCards() {
  nodes.recipeGrid.classList.toggle("list", state.view === "list");
  nodes.gridButton.setAttribute("aria-pressed", String(state.view === "grid"));
  nodes.listButton.setAttribute("aria-pressed", String(state.view === "list"));
  nodes.resultCount.textContent = `${state.filtered.length} of ${state.recipes.length} recipes`;

  nodes.recipeGrid.innerHTML = state.filtered.map((recipe) => {
    const image = imagePath(recipe.image);
    const imageMarkup = image
      ? `<img src="${escapeHtml(image)}" alt="">`
      : `<span class="placeholder-pot" aria-hidden="true"></span>`;
    const sourceHost = recipe.source?.url ? new URL(recipe.source.url).hostname.replace(/^www\./, "") : "";
    return `
      <a class="recipe-card" href="#/recipe/${encodeURIComponent(recipe.id)}">
        <span class="card-image">${imageMarkup}</span>
        <span class="card-body">
          <span class="card-title">${escapeHtml(recipe.title)}</span>
          <span class="card-meta">
            ${recipe.servings ? `<span class="pill">${escapeHtml(recipe.servings)} servings</span>` : ""}
            <span class="pill">${recipe.ingredientCount} ingredients</span>
            <span class="pill">${recipe.stepCount} steps</span>
          </span>
          <span class="card-source">${escapeHtml(sourceHost)}</span>
        </span>
      </a>
    `;
  }).join("");
}

async function showRecipe(id) {
  setActiveNav("recipes");
  nodes.recipesView.hidden = true;
  nodes.builderView.hidden = true;
  nodes.detailView.hidden = false;
  nodes.recipeDetail.innerHTML = "";

  const response = await fetch(`data/recipes/${encodeURIComponent(id)}.json`, { cache: "no-cache" });
  if (!response.ok) {
    nodes.recipeDetail.innerHTML = "<p>Recipe not found.</p>";
    return;
  }
  renderDetail(await response.json());
}

function renderDetail(recipe) {
  const image = imagePath(recipe.image);
  const imageMarkup = image
    ? `<img src="${escapeHtml(image)}" alt="">`
    : `<span class="placeholder-pot" aria-hidden="true"></span>`;
  const source = recipe.source?.url
    ? `<a href="${escapeHtml(recipe.source.url)}" target="_blank" rel="noreferrer">${escapeHtml(recipe.source.label || recipe.source.url)}</a>`
    : "";

  nodes.recipeDetail.innerHTML = `
    <div class="detail-hero">
      <div class="detail-hero-media">${imageMarkup}</div>
      <div class="detail-heading">
        <h1>${escapeHtml(recipe.title)}</h1>
        ${recipe.description ? `<p>${escapeHtml(recipe.description)}</p>` : ""}
        <div class="detail-meta">
          ${recipe.servings ? `<span class="pill">Servings: ${escapeHtml(recipe.servings)}</span>` : ""}
          <span class="pill">${recipe.ingredients.filter((item) => item.type === "item").length} ingredients</span>
          <span class="pill">${recipe.instructions.filter((item) => item.type === "step").length} steps</span>
        </div>
        ${source ? `<p>${source}</p>` : ""}
      </div>
    </div>
    <div class="detail-content">
      <section class="recipe-section">
        <h2>Ingredients</h2>
        <ul>${renderStructuredList(recipe.ingredients, "ul")}</ul>
      </section>
      <section class="recipe-section">
        <h2>Steps</h2>
        <ol>${renderStructuredList(recipe.instructions, "ol")}</ol>
        ${recipe.notes?.length ? `<h2>Notes</h2><ul>${recipe.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}
      </section>
    </div>
  `;
}

function renderStructuredList(items) {
  if (!items?.length) return "<li>No entries yet.</li>";
  return items.map((item) => {
    if (item.type === "heading") return `<li class="section-heading">${escapeHtml(item.text)}</li>`;
    return `<li>${escapeHtml(item.text).replaceAll("\n", "<br>")}</li>`;
  }).join("");
}

function showRecipes() {
  setActiveNav("recipes");
  nodes.recipesView.hidden = false;
  nodes.detailView.hidden = true;
  nodes.builderView.hidden = true;
}

function showBuilder() {
  setActiveNav("builder");
  nodes.recipesView.hidden = true;
  nodes.detailView.hidden = true;
  nodes.builderView.hidden = false;
  updateBuilder();
}

function setActiveNav(name) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === name);
  });
}

function route() {
  const hash = location.hash || "#/";
  const match = hash.match(/^#\/recipe\/(.+)$/);
  if (match) {
    showRecipe(decodeURIComponent(match[1]));
  } else if (hash === "#/builder") {
    showBuilder();
  } else {
    showRecipes();
  }
}

function parseLines(value, itemType) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.startsWith("##")
      ? { type: "heading", text: line.replace(/^##\s*/, "") }
      : { type: itemType, text: line });
}

function builderRecipe() {
  const form = new FormData(nodes.form);
  const title = form.get("title") || "Untitled Recipe";
  const sourceUrl = form.get("sourceUrl") || "";
  return {
    id: slugify(title),
    title,
    description: form.get("description") || "",
    source: { label: sourceUrl, url: sourceUrl },
    image: form.get("image") || "",
    servings: form.get("servings") || "",
    categories: String(form.get("categories") || "").split(",").map((item) => item.trim()).filter(Boolean),
    ingredients: parseLines(form.get("ingredients"), "item"),
    instructions: parseLines(form.get("instructions"), "step"),
    notes: String(form.get("notes") || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    extra: "",
  };
}

function updateBuilder() {
  const recipe = builderRecipe();
  const filename = `${recipe.id}.json`;
  nodes.builderFilename.textContent = filename;
  nodes.jsonPreview.textContent = JSON.stringify(recipe, null, 2);
  return { recipe, filename };
}

nodes.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  applyFilters();
});

nodes.sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  applyFilters();
});

nodes.gridButton.addEventListener("click", () => {
  state.view = "grid";
  localStorage.setItem("recipeView", state.view);
  renderCards();
});

nodes.listButton.addEventListener("click", () => {
  state.view = "list";
  localStorage.setItem("recipeView", state.view);
  renderCards();
});

nodes.printButton.addEventListener("click", () => window.print());
nodes.form.addEventListener("input", updateBuilder);

nodes.copyJsonButton.addEventListener("click", async () => {
  const { recipe } = updateBuilder();
  await navigator.clipboard.writeText(JSON.stringify(recipe, null, 2));
  nodes.copyJsonButton.textContent = "Copied";
  setTimeout(() => nodes.copyJsonButton.textContent = "Copy JSON", 1200);
});

nodes.downloadJsonButton.addEventListener("click", () => {
  const { recipe, filename } = updateBuilder();
  const blob = new Blob([JSON.stringify(recipe, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
});

window.addEventListener("hashchange", route);

loadIndex()
  .then(route)
  .catch((error) => {
    nodes.recipeGrid.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  });
