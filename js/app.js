import { template } from './template-config.js';
import { sections, normalizeName, validate } from './validation.js';
import { loadTemplate, render } from './renderer.js';
import { downloadCard } from './export.js';

const themeToggle = document.getElementById('theme-toggle');
const themePreference = matchMedia('(prefers-color-scheme: dark)');
const themeKey = 'ict-kalika-theme';
function savedTheme() {
  try { return localStorage.getItem(themeKey); } catch { return null; }
}
function applyTheme(theme, save = false) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  themeToggle.setAttribute('aria-pressed', String(next === 'dark'));
  themeToggle.setAttribute('aria-label', `Switch to ${next === 'dark' ? 'light' : 'dark'} mode`);
  themeToggle.querySelector('.theme-toggle-label').textContent = `${next === 'dark' ? 'Light' : 'Dark'} mode`;
  document.querySelector('meta[name="theme-color"]').content = next === 'dark' ? '#08141c' : '#0b2230';
  if (save) { try { localStorage.setItem(themeKey, next); } catch { /* Theme still works for this visit. */ } }
}
applyTheme(document.documentElement.dataset.theme);
themeToggle.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true));
themePreference.addEventListener('change', event => { if (!savedTheme()) applyTheme(event.matches ? 'dark' : 'light'); });
window.addEventListener('storage', event => { if (event.key === themeKey) applyTheme(savedTheme() || (themePreference.matches ? 'dark' : 'light')); });

const form = document.getElementById('card-form');
const canvas = document.getElementById('card-canvas');
const grid = document.getElementById('section-grid');
const photoInput = document.getElementById('photo');
const uploadShell = document.getElementById('upload-shell');
const uploadZone = document.getElementById('upload-zone');
const uploadPreview = document.getElementById('upload-preview');
const uploadedImage = document.getElementById('uploaded-image');
const photoFilename = document.getElementById('photo-filename');
const controls = document.getElementById('photo-controls');
const exportError = document.getElementById('export-error');
const fields = {
  classValue: document.getElementById('class'),
  name: document.getElementById('full-name'),
  phone: document.getElementById('phone')
};
const classSelect = document.getElementById('class-select');
const classTrigger = document.getElementById('class-trigger');
const classMenu = document.getElementById('class-options');
const classOptions = [...classMenu.querySelectorAll('[role="option"]')];
const errorNodes = {
  classValue: document.getElementById('class-error'),
  section: document.getElementById('section-error'),
  name: document.getElementById('name-error'),
  phone: document.getElementById('phone-error'),
  photo: document.getElementById('photo-error')
};

for (const letter of sections) {
  const label = document.createElement('label');
  label.className = 'section-option';
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'section';
  radio.value = letter;
  radio.required = true;
  const span = document.createElement('span');
  span.textContent = letter;
  label.append(radio, span);
  grid.append(label);
}

const state = { classValue: '', section: '', name: '', phone: '', photo: null, zoom: 1, photoX: 0, photoY: 0 };
let background;
let photoUrl;
let lastResult = { nameFits: true };
let touched = new Set();
let pointer = null;
let photoRequest = 0;

function updateClassDisplay() {
  const value = fields.classValue.value;
  document.getElementById('class-value').textContent = value ? `Class ${value}` : 'Choose a class';
  classOptions.forEach(option => option.setAttribute('aria-selected', String(option.dataset.class === value)));
}
function closeClassMenu(focusTrigger = false) {
  classMenu.hidden = true;
  classSelect.classList.remove('open');
  classTrigger.setAttribute('aria-expanded', 'false');
  if (focusTrigger) classTrigger.focus();
}
function openClassMenu(fromEnd = false) {
  classMenu.hidden = false;
  classSelect.classList.add('open');
  classTrigger.setAttribute('aria-expanded', 'true');
  const selected = classOptions.findIndex(option => option.dataset.class === fields.classValue.value);
  classOptions[selected >= 0 ? selected : (fromEnd ? classOptions.length - 1 : 0)].focus();
}
function chooseClass(value) {
  if (!['9', '10', '11', '12'].includes(value)) return;
  fields.classValue.value = value;
  updateClassDisplay();
  touched.add('classValue');
  closeClassMenu(true);
  clearExportError();
  draw();
}
classTrigger.addEventListener('click', () => classMenu.hidden ? openClassMenu() : closeClassMenu());
classTrigger.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    openClassMenu(event.key === 'ArrowUp');
  }
});
classOptions.forEach((option, index) => {
  option.addEventListener('click', () => chooseClass(option.dataset.class));
  option.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      classOptions[(index + (event.key === 'ArrowDown' ? 1 : -1) + classOptions.length) % classOptions.length].focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      classOptions[event.key === 'Home' ? 0 : classOptions.length - 1].focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      chooseClass(option.dataset.class);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeClassMenu(true);
    } else if (event.key === 'Tab') closeClassMenu();
  });
});
classSelect.addEventListener('focusout', event => { if (!classSelect.contains(event.relatedTarget)) closeClassMenu(); });
document.addEventListener('pointerdown', event => { if (!classSelect.contains(event.target)) closeClassMenu(); });

function syncState() {
  state.classValue = fields.classValue.value;
  state.section = form.querySelector('input[name="section"]:checked')?.value || '';
  state.name = fields.name.value;
  state.phone = fields.phone.value;
  state.zoom = Number(document.getElementById('zoom').value) / 100;
  state.photoX = Number(document.getElementById('photo-x').value) / 100;
  state.photoY = Number(document.getElementById('photo-y').value) / 100;
  document.getElementById('zoom-value').value = `${Math.round(state.zoom * 100)}%`;
}

function draw() {
  if (!background) return;
  syncState();
  lastResult = render(canvas, background, state);
  showErrors(false);
}

function showErrors(all) {
  const errors = validate(state, lastResult.nameFits);
  const readyCount = 5 - Object.keys(errors).length;
  document.getElementById('completion-count').textContent = `${readyCount} of 5 ready`;
  document.getElementById('progress-fill').style.width = `${readyCount * 20}%`;
  document.getElementById('preview-status').textContent = readyCount === 5 ? 'Ready to download' : 'Add your details to complete the card';
  for (const [key, node] of Object.entries(errorNodes)) {
    const show = all || touched.has(key);
    node.textContent = show ? (errors[key] || '') : '';
    const input = key === 'classValue' ? classTrigger : (fields[key] || (key === 'photo' ? photoInput : null));
    if (input) input.setAttribute('aria-invalid', show && !!errors[key] ? 'true' : 'false');
  }
  uploadZone.setAttribute('aria-invalid', String((all || touched.has('photo')) && !!errors.photo));
  grid.setAttribute('data-invalid', String((all || touched.has('section')) && !!errors.section));
  return errors;
}

function clearExportError() {
  exportError.hidden = true;
  exportError.textContent = '';
}

form.addEventListener('input', event => {
  if (event.target === fields.name) touched.add('name');
  if (event.target === fields.phone) touched.add('phone');
  if (event.target.matches('input[type="range"]')) touched.add('photo');
  clearExportError();
  draw();
});
form.addEventListener('change', event => {
  if (event.target.name === 'section') touched.add('section');
  clearExportError();
  draw();
});
fields.name.addEventListener('blur', () => {
  fields.name.value = normalizeName(fields.name.value);
  touched.add('name');
  draw();
});
fields.phone.addEventListener('blur', () => { touched.add('phone'); draw(); });

function clearPhoto() {
  photoRequest++;
  state.photo = null;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = null;
  photoInput.value = '';
  uploadedImage.removeAttribute('src');
  uploadPreview.hidden = true;
  uploadZone.hidden = false;
  controls.hidden = true;
  draw();
}

async function setPhotoFile(file, displayName = file?.name) {
  if (!file) return;
  touched.add('photo');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    clearPhoto();
    errorNodes.photo.textContent = 'Choose a JPG, PNG, or WebP photograph.';
    return;
  }
  const request = ++photoRequest;
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    if (request !== photoRequest) { URL.revokeObjectURL(url); return; }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = url;
    state.photo = image;
    uploadedImage.src = url;
    photoFilename.textContent = displayName || 'Pasted image';
    uploadZone.hidden = true;
    uploadPreview.hidden = false;
    document.getElementById('zoom').value = '100';
    document.getElementById('photo-x').value = '0';
    document.getElementById('photo-y').value = '0';
    controls.hidden = false;
    clearExportError();
    draw();
  } catch {
    URL.revokeObjectURL(url);
    if (request === photoRequest) {
      clearPhoto();
      errorNodes.photo.textContent = 'The selected image could not be opened.';
    }
  }
}

function openPhotoPicker() {
  photoInput.value = '';
  photoInput.click();
}
uploadZone.addEventListener('click', openPhotoPicker);
document.getElementById('replace-photo').addEventListener('click', openPhotoPicker);
document.getElementById('remove-photo').addEventListener('click', () => { touched.add('photo'); clearPhoto(); uploadZone.focus(); });
photoInput.addEventListener('change', () => setPhotoFile(photoInput.files?.[0]));
photoInput.addEventListener('click', () => { photoInput.value = ''; });

uploadShell.addEventListener('dragenter', event => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  uploadShell.classList.add('drag-active');
});
uploadShell.addEventListener('dragover', event => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  uploadShell.classList.add('drag-active');
});
uploadShell.addEventListener('dragleave', event => {
  if (!uploadShell.contains(event.relatedTarget)) uploadShell.classList.remove('drag-active');
});
uploadShell.addEventListener('drop', event => {
  event.preventDefault();
  uploadShell.classList.remove('drag-active');
  const file = event.dataTransfer?.files?.[0];
  if (file) setPhotoFile(file);
});

document.addEventListener('paste', event => {
  const item = [...(event.clipboardData?.items || [])].find(entry => entry.kind === 'file' && entry.type.startsWith('image/'));
  if (!item) return;
  event.preventDefault();
  const file = item.getAsFile();
  if (file) setPhotoFile(file, file.name || 'Pasted image');
});

function pointerInPhoto(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * template.width / rect.width;
  const y = (event.clientY - rect.top) * template.height / rect.height;
  const b = template.photo.bounds;
  return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
}
canvas.addEventListener('pointerdown', event => {
  if (!state.photo || !pointerInPhoto(event)) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: state.photoX, startY: state.photoY };
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const rect = canvas.getBoundingClientRect();
  const dx = (event.clientX - pointer.x) * template.width / rect.width;
  const dy = (event.clientY - pointer.y) * template.height / rect.height;
  // Range values are normalized offsets; sliders remain an accessible alternative.
  document.getElementById('photo-x').value = String(Math.max(-100, Math.min(100, Math.round((pointer.startX + dx / 200) * 100))));
  document.getElementById('photo-y').value = String(Math.max(-100, Math.min(100, Math.round((pointer.startY + dy / 200) * 100))));
  draw();
});
function endPointer(event) {
  if (pointer?.id !== event.pointerId) return;
  pointer = null;
  canvas.classList.remove('dragging');
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

document.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => {
  if (!background) return;
  syncState();
  lastResult = render(canvas, background, state);
  const errors = showErrors(true);
  if (Object.keys(errors).length) {
    exportError.textContent = 'Complete the highlighted fields before downloading.';
    exportError.hidden = false;
    const first = Object.keys(errors)[0];
    (first === 'classValue' ? classTrigger : (fields[first] || (first === 'section' ? grid.querySelector('input') : uploadZone)))?.focus();
    return;
  }
  clearExportError();
  downloadCard(canvas, button.dataset.format, normalizeName(state.name));
}));

document.getElementById('reset-button').addEventListener('click', () => {
  form.reset();
  fields.classValue.value = '';
  state.classValue = '';
  updateClassDisplay();
  closeClassMenu();
  clearPhoto();
  document.getElementById('zoom').value = '100';
  document.getElementById('photo-x').value = '0';
  document.getElementById('photo-y').value = '0';
  touched = new Set();
  for (const node of Object.values(errorNodes)) node.textContent = '';
  clearExportError();
  draw();
  classTrigger.focus();
});

try {
  background = await loadTemplate();
  draw();
} catch (error) {
  exportError.textContent = `The card template could not be loaded: ${error.message}`;
  exportError.hidden = false;
  document.querySelectorAll('[data-format]').forEach(button => { button.disabled = true; });
}
