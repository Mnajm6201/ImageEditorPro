const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const uploadZone = document.getElementById('uploadZone');
const canvasContainer = document.getElementById('canvasContainer');
const floatingControls = document.getElementById('floatingControls');
const fileInput = document.getElementById('fileInput');

// App state - keeping track of image data and edit history
let originalImageData = null;
let currentImage = null;
let editHistory = [];
let historyIndex = -1;

// Control elements for sliders
const controls = {
    brightness: document.getElementById('brightness'),
    contrast: document.getElementById('contrast'),
    saturation: document.getElementById('saturation'),
    hue: document.getElementById('hue')
};

setupEventListeners();

// Wire up all the event listeners for drag/drop, sliders, and buttons
function setupEventListeners() {
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    
    Object.keys(controls).forEach(key => {
        controls[key].addEventListener('input', (e) => {
            updateImage();
            updateValueDisplay(e);
            updateSliderBackground(e.target);
        });
        controls[key].addEventListener('change', () => {
            saveToHistory();
        });
    });
    
    document.getElementById('resetBtn').addEventListener('click', resetImage);
    document.getElementById('undoBtn').addEventListener('click', undoLastChange);
    document.getElementById('saveBtn').addEventListener('click', saveImage);
    document.getElementById('newImageBtn').addEventListener('click', loadNewImage);
    
    updateAllValueDisplays();
    updateAllSliderBackgrounds();
}

// Handle drag and drop file upload
function handleDragOver(e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        loadImageFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        loadImageFile(file);
    }
}

// Load and process the selected image file
function loadImageFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            setupCanvas(img);
            saveToHistory();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Set up canvas with the loaded image and switch UI views
function setupCanvas(img) {
    uploadZone.classList.add('hidden');
    canvasContainer.classList.remove('hidden');
    floatingControls.classList.remove('hidden');
    
    canvas.width = img.width;
    canvas.height = img.height;
    
    ctx.drawImage(img, 0, 0);
    
    originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    currentImage = img;
    
    resetControls();
}

// Apply all the current slider values to the original image
function updateImage() {
    if (!originalImageData) return;
    
    const imageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
    );
    
    applyBrightness(imageData, parseInt(controls.brightness.value));
    applyContrast(imageData, parseInt(controls.contrast.value));
    applySaturation(imageData, parseInt(controls.saturation.value));
    applyHue(imageData, parseInt(controls.hue.value));
    
    ctx.putImageData(imageData, 0, 0);
}

// Individual filter functions - these modify pixel data directly
function applyBrightness(imageData, value) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] + value));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + value));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + value));
    }
}

function applyContrast(imageData, value) {
    const data = imageData.data;
    const factor = (259 * (value + 255)) / (255 * (259 - value));
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
    }
}

function applySaturation(imageData, value) {
    const data = imageData.data;
    const factor = (value + 100) / 100;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        data[i] = Math.max(0, Math.min(255, gray + factor * (r - gray)));
        data[i + 1] = Math.max(0, Math.min(255, gray + factor * (g - gray)));
        data[i + 2] = Math.max(0, Math.min(255, gray + factor * (b - gray)));
    }
}

function applyHue(imageData, value) {
    if (value === 0) return;
    
    const data = imageData.data;
    const hueShift = value * Math.PI / 180;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        
        const [h, s, v] = rgbToHsv(r, g, b);
        const newH = (h + hueShift + 2 * Math.PI) % (2 * Math.PI);
        const [newR, newG, newB] = hsvToRgb(newH, s, v);
        
        data[i] = Math.round(newR * 255);
        data[i + 1] = Math.round(newG * 255);
        data[i + 2] = Math.round(newB * 255);
    }
}

// Color space conversion
function rgbToHsv(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let h = 0;
    if (diff !== 0) {
        if (max === r) h = ((g - b) / diff) % 6;
        else if (max === g) h = (b - r) / diff + 2;
        else h = (r - g) / diff + 4;
    }
    h *= Math.PI / 3;
    
    const s = max === 0 ? 0 : diff / max;
    const v = max;
    
    return [h, s, v];
}

function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h * 3 / Math.PI) % 2) - 1));
    const m = v - c;
    
    let r, g, b;
    const sector = Math.floor(h * 3 / Math.PI);
    
    switch (sector) {
        case 0: [r, g, b] = [c, x, 0]; break;
        case 1: [r, g, b] = [x, c, 0]; break;
        case 2: [r, g, b] = [0, c, x]; break;
        case 3: [r, g, b] = [0, x, c]; break;
        case 4: [r, g, b] = [x, 0, c]; break;
        default: [r, g, b] = [c, 0, x]; break;
    }
    
    return [r + m, g + m, b + m];
}

// History management for undo functionality
function saveToHistory() {
    const state = {
        brightness: parseInt(controls.brightness.value),
        contrast: parseInt(controls.contrast.value),
        saturation: parseInt(controls.saturation.value),
        hue: parseInt(controls.hue.value)
    };
    
    editHistory = editHistory.slice(0, historyIndex + 1);
    editHistory.push(state);
    historyIndex = editHistory.length - 1;
}

function undoLastChange() {
    if (historyIndex > 0) {
        historyIndex--;
        const state = editHistory[historyIndex];
        
        // Apply the state values to controls
        controls.brightness.value = state.brightness;
        controls.contrast.value = state.contrast;
        controls.saturation.value = state.saturation;
        controls.hue.value = state.hue;
        
        // Update UI and image
        updateAllValueDisplays();
        updateAllSliderBackgrounds();
        updateImage();
    }
}

function applyState(state) {
    controls.brightness.value = state.brightness;
    controls.contrast.value = state.contrast;
    controls.saturation.value = state.saturation;
    controls.hue.value = state.hue;
    
    updateAllValueDisplays();
    updateAllSliderTracks();
    updateImage();
}

// Reset functions
function resetImage() {
    resetControls();
    updateImage();
    saveToHistory();
}

function resetControls() {
    controls.brightness.value = 0;
    controls.contrast.value = 0;
    controls.saturation.value = 0;
    controls.hue.value = 0;
    updateAllValueDisplays();
    updateAllSliderBackgrounds();
}

// UI update functions for sliders and value displays
function updateValueDisplay(e) {
    const valueDisplay = document.getElementById(e.target.id + 'Value');
    valueDisplay.textContent = e.target.value;
}

function updateAllValueDisplays() {
    Object.keys(controls).forEach(key => {
        const valueDisplay = document.getElementById(key + 'Value');
        valueDisplay.textContent = controls[key].value;
    });
}

function updateSliderBackground(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const value = parseFloat(slider.value);
    
    const percentage = ((value - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, #60a5fa 0%, #60a5fa ${percentage}%, rgba(255, 255, 255, 0.1) ${percentage}%, rgba(255, 255, 255, 0.1) 100%)`;
}

function updateAllSliderBackgrounds() {
    Object.keys(controls).forEach(key => {
        updateSliderBackground(controls[key]);
    });
}

// Export the edited image
function saveImage() {
    if (!canvas) return;
    
    try {
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error saving image:', error);
        alert('Unable to save image. This might be due to browser security restrictions.');
    }
}

// Reset everything and go back to upload screen
function loadNewImage() {
    canvasContainer.classList.add('hidden');
    floatingControls.classList.add('hidden');
    uploadZone.classList.remove('hidden');
    
    originalImageData = null;
    currentImage = null;
    editHistory = [];
    historyIndex = -1;
    
    resetControls();
    fileInput.value = '';
}