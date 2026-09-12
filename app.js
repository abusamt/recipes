function repositoryFromPagesUrl() {
  const ownerMatch = location.hostname.match(/^([^./]+)\.github\.io$/i);
  if (!ownerMatch) return "abusamt/recipes";
  const project = location.pathname.split("/").filter(Boolean)[0] || `${ownerMatch[1]}.github.io`;
  return `${ownerMatch[1]}/${project}`;
}

const REPOSITORY = location.hostname.endsWith(".github.io")
  ? repositoryFromPagesUrl()
  : (window.RECIPE_REPOSITORY || repositoryFromPagesUrl());
const BRANCH = "main";
const GITHUB_EDIT_BASE = `https://github.com/${REPOSITORY}/edit/${BRANCH}/`;

const state = {
  recipes: [],
  recipeData: new Map(),
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
  editButton: document.querySelector("#editButton"),
  printButton: document.querySelector("#printButton"),
  form: document.querySelector("#recipeForm"),
  markdownPreview: document.querySelector("#markdownPreview"),
  builderFilename: document.querySelector("#builderFilename"),
  copyMarkdownButton: document.querySelector("#copyMarkdownButton"),
  openGitHubButton: document.querySelector("#openGitHubButton"),
  downloadMarkdownButton: document.querySelector("#downloadMarkdownButton"),
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

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function sourceHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function loadIndex() {
  let data = window.RECIPE_INDEX;
  if (!data) {
    const response = await fetch("data/recipes-index.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Could not load recipe index");
    data = await response.json();
  }
  state.recipes = data.recipes || [];
  state.recipeData = new Map((window.RECIPE_DATA || []).map((recipe) => [recipe.id, recipe]));
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
    const host = recipe.source?.url ? sourceHost(recipe.source.url) : "";
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
          <span class="card-source">${escapeHtml(host)}</span>
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

  const embeddedRecipe = state.recipeData.get(id);
  if (embeddedRecipe) {
    renderDetail(embeddedRecipe);
    return;
  }
  const response = await fetch(`data/recipes/${encodeURIComponent(id)}.json`, { cache: "no-cache" });
  if (response.ok) {
    renderDetail(await response.json());
  } else {
    nodes.editButton.hidden = true;
    nodes.recipeDetail.innerHTML = "<p>Recipe not found.</p>";
  }
}

function renderDetail(recipe) {
  const markdownPath = recipe.editPath || `data/recipes-md/${recipe.id}.md`;
  nodes.editButton.href = `${GITHUB_EDIT_BASE}${encodePath(markdownPath)}`;
  nodes.editButton.hidden = false;
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
  const filename = `${recipe.id}.md`;
  const markdown = recipeToMarkdown(recipe);
  nodes.builderFilename.textContent = filename;
  nodes.markdownPreview.textContent = markdown;
  nodes.openGitHubButton.href = `https://github.com/${REPOSITORY}/new/${BRANCH}?filename=${encodeURIComponent(`data/recipes-md/${filename}`)}`;
  return { recipe, filename, markdown };
}

function recipeToMarkdown(recipe) {
  const source = recipe.source || {};
  const metadata = [
    ["id", recipe.id],
    ["title", recipe.title],
    ["servings", recipe.servings],
    ["image", recipe.image],
    ["source_url", source.url],
    ["source_label", source.label],
    ["categories", (recipe.categories || []).join(", ")],
  ];
  const lines = ["---", ...metadata.map(([key, value]) => `${key}: ${repairText(value)}`), "---", "", `# ${repairText(recipe.title)}`];
  if (repairText(recipe.description)) lines.push("", repairText(recipe.description));
  lines.push("", "## Ingredients", ...itemsToMarkdown(recipe.ingredients, false), "", "## Steps", ...itemsToMarkdown(recipe.instructions, true));
  const notes = (recipe.notes || []).map(repairText).filter(Boolean);
  if (notes.length) lines.push("", "## Notes", ...notes.map((note) => `- ${note}`));
  if (repairText(recipe.extra)) lines.push("", "## Extra", repairText(recipe.extra));
  return `${lines.join("\n").trimEnd()}\n`;
}

function itemsToMarkdown(items = [], ordered) {
  const lines = [];
  let number = 1;
  for (const item of items) {
    const text = repairText(item.text);
    if (!text) continue;
    if (item.type === "heading") {
      lines.push(`### ${text}`);
      continue;
    }
    const marker = ordered ? `${number}.` : "-";
    const parts = text.split(/\r?\n/);
    lines.push(`${marker} ${parts[0]}`);
    lines.push(...parts.slice(1).map((line) => `   ${line}`));
    if (ordered) number += 1;
  }
  return lines.length ? lines : ["- "];
}

function repairText(value) {
  return String(value || "").normalize("NFKC").trim();
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

nodes.copyMarkdownButton.addEventListener("click", async () => {
  const { markdown } = updateBuilder();
  await navigator.clipboard.writeText(markdown);
  nodes.copyMarkdownButton.textContent = "Copied";
  setTimeout(() => nodes.copyMarkdownButton.textContent = "Copy Markdown", 1200);
});

nodes.downloadMarkdownButton.addEventListener("click", () => {
  const { filename, markdown } = updateBuilder();
  const blob = new Blob([markdown], { type: "text/markdown" });
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
    nodes.resultCount.textContent = "Catalog unavailable";
    nodes.recipeGrid.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  });
