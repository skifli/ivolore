function formatUnixTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export async function displayGallery() {
  const URL_PARAMS = new URLSearchParams(window.location.search);
  let hashElement = decodeURIComponent(window.location.hash.substring(1));

  let activeCategory = URL_PARAMS.get("category") || "";
  let showEdited = URL_PARAMS.get("type") === "edited";

  const galleryContainer = document.querySelector("#gallery");
  if (!galleryContainer) return;

  const response = await fetch("../assets/data/gallery.json");
  const rawItems = await response.json();

  let allCategories = new Set();
  let items = rawItems.map((item) => {
    let originalLink = item.originalLink || item.link;
    let pubDateFormatted = formatUnixTimestamp(item.pubDate);
    item.categories.forEach((cat) => allCategories.add(cat));

    return {
      title: item.title,
      link: item.link,
      originalLink: originalLink,
      description: item.description,
      pubDate: pubDateFormatted,
      categories: item.categories,
    };
  });

  // Setup the tag chips
  const buttonsContainer = document.getElementById("gallery-categories");
  if (buttonsContainer) {
    let fragment = document.createDocumentFragment();
    allCategories.forEach((category) => {
      let button = document.createElement("button");
      button.type = "button";
      button.className = `tag-chip category-btn ${category === activeCategory ? "active" : ""}`;
      button.dataset.category = category;
      button.innerHTML = `<i class='bx bx-hash'></i><span>${category}</span>`;

      button.addEventListener("click", () => {
        // Toggle behaviour
        if (activeCategory === category) {
          activeCategory = "";
        } else {
          activeCategory = category;
        }
        updateUrlState();
        filterGalleryItems();
      });

      fragment.appendChild(button);
    });
    buttonsContainer.appendChild(fragment);
  }

  // Setup the elements of the lightbox
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("modal-img");
  const modalTitle = document.getElementById("modal-title");
  const modalDesc = document.getElementById("modal-desc");
  const modalToggleBtn = document.getElementById("modal-toggle-edited");
  const modalFullResBtn = document.getElementById("modal-fullres-link");
  const modalClose = document.querySelector(".modal-close");

  let currentModalItem = null;
  let modalShowEdited = showEdited;

  function openModal(item) {
    currentModalItem = item;
    modalShowEdited = showEdited;
    updateModalImage();
    modalTitle.textContent = item.title;
    modalDesc.innerHTML = `${item.pubDate} — ${item.description}`;
    modal.classList.add("active");
  }

  function updateModalImage() {
    if (!currentModalItem) return;
    const src = modalShowEdited
      ? currentModalItem.link
      : currentModalItem.originalLink;
    const fullPath = `../assets/img/${src}`;
    modalImg.src = `${fullPath}.webp`;
    modalToggleBtn.textContent = modalShowEdited
      ? "Switch to Original Image"
      : "Switch to Edited Image";
    if (modalFullResBtn) {
      modalFullResBtn.href = fullPath;
    }
  }

  if (modalClose) {
    modalClose.onclick = () => modal.classList.remove("active");
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.remove("active");
    };
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") modal.classList.remove("active");
    });
  }

  if (modalToggleBtn) {
    modalToggleBtn.onclick = () => {
      modalShowEdited = !modalShowEdited;
      updateModalImage();
    };
  }

  // Render all the gallery items straight away
  let fragment = document.createDocumentFragment();
  const cardElements = [];

  items.forEach((image) => {
    let imageElement = document.createElement("div");
    let coverImage = document.createElement("img");

    imageElement.id = image.title;
    imageElement.classList.add("gallery-item");
    imageElement.dataset.categories = JSON.stringify(image.categories);

    coverImage.alt = image.description;
    coverImage.dataset.editedSrc = `../assets/img/${image.link}.webp`;
    coverImage.dataset.originalSrc = `../assets/img/${image.originalLink}.webp`;
    coverImage.src = showEdited
      ? coverImage.dataset.editedSrc
      : coverImage.dataset.originalSrc;
    coverImage.loading = "lazy";

    coverImage.onclick = () => openModal(image);

    let imageDescription = document.createElement("div");
    imageDescription.classList.add("gallery-item-description");

    imageDescription.innerHTML = `
      <h3 class="card-title-heading">${showEdited ? `${image.title}&nbsp;<i class="bx bx-edit"></i>` : image.title}</h3>
      <span class="date">${image.pubDate}</span>
      <p class="description">${image.description}</p>
    `;

    imageElement.appendChild(coverImage);
    imageElement.appendChild(imageDescription);
    fragment.appendChild(imageElement);

    cardElements.push({
      element: imageElement,
      data: image,
      img: coverImage,
      heading: imageDescription.querySelector(".card-title-heading"),
    });
  });

  galleryContainer.appendChild(fragment);

  // He's a smooth operator [wink]
  function filterGalleryItems() {
    cardElements.forEach(({ element, data }) => {
      const matchesCategory =
        !activeCategory || data.categories.includes(activeCategory);

      if (matchesCategory) {
        element.style.display = "";
        requestAnimationFrame(() => {
          element.classList.remove("filtered-out");
        });
      } else {
        element.classList.add("filtered-out");
        setTimeout(() => {
          if (element.classList.contains("filtered-out")) {
            element.style.display = "none";
          }
        }, 250);
      }
    });

    // Update the active visual state on category tag buttons
    document.querySelectorAll(".category-btn").forEach((btn) => {
      if (btn.dataset.category === activeCategory) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  // Update for all images the exposure
  function applyExposureMode() {
    cardElements.forEach(({ data, img, heading }) => {
      img.src = showEdited ? img.dataset.editedSrc : img.dataset.originalSrc;
      heading.innerHTML = showEdited
        ? `${data.title}&nbsp;<i class="bx bx-edit"></i>`
        : data.title;
    });

    const toggleImageTypeText = document.getElementById(
      "toggle-image-type-text",
    );
    if (toggleImageTypeText) {
      toggleImageTypeText.textContent = showEdited
        ? "Show Original Images"
        : "Show Edited Images";
    }
  }

  // URL state sync without big bang [wink] on page reload
  function updateUrlState() {
    const newParams = new URLSearchParams();
    if (activeCategory) newParams.set("category", activeCategory);
    if (showEdited) newParams.set("type", "edited");

    const newUrl = `${window.location.pathname}${newParams.toString() ? `?${newParams.toString()}` : ""}${window.location.hash}`;
    window.history.pushState({}, "", newUrl);
  }

  // Switch exposure mode button
  const toggleImageTypeBtn = document.getElementById("toggle-image-type-link");
  if (toggleImageTypeBtn) {
    toggleImageTypeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showEdited = !showEdited;
      applyExposureMode();
      updateUrlState();
    });
  }

  // Initial render & scroll into view if target hash exists
  filterGalleryItems();
  applyExposureMode();

  if (hashElement) {
    const targetEl = document.getElementById(hashElement);
    if (targetEl) {
      targetEl.classList.add("highlight");
      setTimeout(() => {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }
}
