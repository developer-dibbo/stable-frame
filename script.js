/**
 * Stable Frame - Interactive Photo Framing Studio
 * Core JavaScript Engine
 * Developer: Dibbo
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const zoomSlider = document.getElementById('zoom-slider');
  const opacitySlider = document.getElementById('opacity-slider');
  const zoomValueText = document.getElementById('zoom-value');
  const opacityValueText = document.getElementById('opacity-value');
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const exportBtn = document.getElementById('export-btn');
  const canvas = document.getElementById('editor-canvas');
  const placeholderView = document.getElementById('placeholder-view');
  const canvasWrapper = document.getElementById('canvas-wrapper');
  const canvasHud = document.getElementById('canvas-hud');
  const hudZoom = document.getElementById('hud-zoom');
  const hudResetBtn = document.getElementById('hud-reset-btn');
  const secondaryUploadBtn = document.getElementById('secondary-upload-btn');
  const frameOptions = document.querySelectorAll('.frame-option');

  // Canvas context
  const ctx = canvas.getContext('2d');

  // Internal canvas drawing resolution (high-res square)
  const CANVAS_RESOLUTION = 1200;
  canvas.width = CANVAS_RESOLUTION;
  canvas.height = CANVAS_RESOLUTION;

  // Application State
  let uploadedImage = null;
  let imageFileName = 'stable-frame-artwork';
  let currentFrame = 'none';
  let opacity = 100; // 0 - 100
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  
  // Transform State (relative to viewport center)
  let transform = {
    x: 0,
    y: 0,
    scale: 1.0
  };

  // Border sizes configuration for each frame style
  const frameBorders = {
    none: { top: 0, bottom: 0, left: 0, right: 0 },
    classic: { top: 96, bottom: 96, left: 96, right: 96 },
    obsidian: { top: 96, bottom: 96, left: 96, right: 96 },
    gold: { top: 96, bottom: 96, left: 96, right: 96 },
    minimalist: { top: 120, bottom: 120, left: 120, right: 120 },
    brand: { top: 96, bottom: 96, left: 96, right: 96 },
    polaroid: { top: 80, bottom: 200, left: 80, right: 80 }
  };

  // Get current frame border sizes
  function getBorders() {
    return frameBorders[currentFrame] || frameBorders.none;
  }

  // Calculate viewport boundaries and dimensions
  function getViewport() {
    const borders = getBorders();
    const w = CANVAS_RESOLUTION - (borders.left + borders.right);
    const h = CANVAS_RESOLUTION - (borders.top + borders.bottom);
    const cx = borders.left + w / 2;
    const cy = borders.top + h / 2;
    return { w, h, cx, cy, borders };
  }

  // --- Initializing App Controls ---
  
  // File Upload Handlers
  dropZone.addEventListener('click', () => fileInput.click());
  secondaryUploadBtn.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Handle selected image file
  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }

    // Save filename without extension for download
    imageFileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        uploadedImage = img;
        
        // UI Updates: Reveal canvas, hide placeholder
        placeholderView.style.opacity = '0';
        setTimeout(() => {
          placeholderView.classList.add('hidden');
          canvas.style.display = 'block';
          canvasHud.classList.remove('hidden');
        }, 300);

        // Enable export control buttons
        exportBtn.removeAttribute('disabled');

        // Reset and center image position
        resetImage();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Reset image position and fit it inside the active frame viewport
  function resetImage() {
    if (!uploadedImage) return;

    const { w, h } = getViewport();
    
    // Fit image inside frame viewport
    const scaleX = w / uploadedImage.width;
    const scaleY = h / uploadedImage.height;
    const fitScale = Math.min(scaleX, scaleY);
    
    transform.scale = fitScale;
    transform.x = 0;
    transform.y = 0;

    // Sync sliders
    updateControlsUI();
    render();
  }

  // Update slider UI elements
  function updateControlsUI() {
    zoomSlider.value = transform.scale.toFixed(2);
    zoomValueText.textContent = `${transform.scale.toFixed(2)}x`;
    hudZoom.textContent = `${transform.scale.toFixed(2)}x`;
    
    opacitySlider.value = opacity;
    opacityValueText.textContent = `${opacity}%`;
  }

  // --- Controls Interaction ---

  // Zoom slider change
  zoomSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    transform.scale = val;
    zoomValueText.textContent = `${val.toFixed(2)}x`;
    hudZoom.textContent = `${val.toFixed(2)}x`;
    render();
  });

  // Opacity slider change
  opacitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    opacity = val;
    opacityValueText.textContent = `${val}%`;
    render();
  });

  // Zoom Button Handlers
  zoomOutBtn.addEventListener('click', () => {
    let current = parseFloat(zoomSlider.value);
    let target = Math.max(0.1, current - 0.1);
    transform.scale = target;
    updateControlsUI();
    render();
  });

  zoomInBtn.addEventListener('click', () => {
    let current = parseFloat(zoomSlider.value);
    let target = Math.min(5.0, current + 0.1);
    transform.scale = target;
    updateControlsUI();
    render();
  });

  // HUD Reset Button
  hudResetBtn.addEventListener('click', resetImage);

  // Frame Selection
  frameOptions.forEach(btn => {
    btn.addEventListener('click', () => {
      frameOptions.forEach(opt => opt.classList.remove('active'));
      btn.classList.add('active');
      
      const frameType = btn.getAttribute('data-frame');
      
      // Store current scale/offset relative to old viewport
      const oldViewport = getViewport();
      
      currentFrame = frameType;
      
      // Adapt image position to new viewport constraints
      if (uploadedImage) {
        const newViewport = getViewport();
        // Adjust scale proportionally to match the scale difference between viewports
        const widthProportion = newViewport.w / oldViewport.w;
        const heightProportion = newViewport.h / oldViewport.h;
        const viewportRatioChange = Math.min(widthProportion, heightProportion);
        
        transform.scale = Math.max(0.1, Math.min(5.0, transform.scale * viewportRatioChange));
        
        // Also translate scaled offset slightly to center
        transform.x *= widthProportion;
        transform.y *= heightProportion;

        updateControlsUI();
        render();
      }
    });
  });

  // --- Canvas Interaction Event Listeners ---

  // Double click resets position
  canvas.addEventListener('dblclick', resetImage);

  // Mouse / Touch position mapping helper
  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * (CANVAS_RESOLUTION / rect.width),
      y: (clientY - rect.top) * (CANVAS_RESOLUTION / rect.height)
    };
  }

  // Pointer Down (Drag Start)
  function handlePointerDown(e) {
    if (!uploadedImage) return;
    isDragging = true;
    
    const coords = getCanvasCoords(e);
    // Drag offsets relative to current image translation
    dragStart.x = coords.x - transform.x;
    dragStart.y = coords.y - transform.y;
    
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }

  // Pointer Move (Dragging)
  function handlePointerMove(e) {
    if (!isDragging || !uploadedImage) return;
    
    const coords = getCanvasCoords(e);
    transform.x = coords.x - dragStart.x;
    transform.y = coords.y - dragStart.y;
    
    render();
    e.preventDefault();
  }

  // Pointer Up (Drag End)
  function handlePointerUp() {
    isDragging = false;
    canvas.style.cursor = 'grab';
  }

  // Attach mouse listeners
  canvas.addEventListener('mousedown', handlePointerDown);
  window.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);

  // Attach touch listeners (Mobile)
  canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
  canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
  canvas.addEventListener('touchend', handlePointerUp);

  // Scroll to Zoom (relative to cursor coordinates)
  canvas.addEventListener('wheel', (e) => {
    if (!uploadedImage) return;
    e.preventDefault();

    // Map screen coordinate scroll position to canvas coordinate
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (CANVAS_RESOLUTION / rect.width);
    const mouseY = (e.clientY - rect.top) * (CANVAS_RESOLUTION / rect.height);

    // Get current viewport configuration
    const { cx, cy } = getViewport();

    // Determine target coordinate relative to image center
    const imgX = (mouseX - cx - transform.x) / transform.scale;
    const imgY = (mouseY - cy - transform.y) / transform.scale;

    // Calculate zoom factor
    const zoomIntensity = 0.05;
    const factor = e.deltaY < 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);
    
    let newScale = transform.scale * factor;
    // Limit zoom level
    newScale = Math.max(0.1, Math.min(newScale, 5.0));

    // Shift image position offset to keep cursor point locked
    transform.x = mouseX - cx - imgX * newScale;
    transform.y = mouseY - cy - imgY * newScale;
    transform.scale = newScale;

    updateControlsUI();
    render();
  }, { passive: false });


  // --- Canvas Rendering Loops ---

  function render() {
    if (!uploadedImage) return;

    // 1. Clear Canvas
    ctx.clearRect(0, 0, CANVAS_RESOLUTION, CANVAS_RESOLUTION);

    // 2. Draw Backplate (visible behind image if cropped/transparent)
    drawBackplate();

    // 3. Draw Uploaded Photo under the frame clipping path
    ctx.save();
    
    // Create clipping mask to restrict image within frame border
    const { cx, cy, w, h, borders } = getViewport();
    ctx.beginPath();
    ctx.rect(borders.left, borders.top, w, h);
    ctx.clip();

    // Draw the image transformed
    ctx.translate(cx + transform.x, cy + transform.y);
    ctx.scale(transform.scale, transform.scale);
    ctx.globalAlpha = opacity / 100;
    
    // Draw centered on transform origin
    ctx.drawImage(uploadedImage, -uploadedImage.width / 2, -uploadedImage.height / 2);
    
    ctx.restore();

    // 4. Draw Overlay Frame borders
    drawFrameBorders();
  }

  // Draw mounting backplate color under the photo
  function drawBackplate() {
    ctx.save();
    let backplateColor = '#ffffff'; // Default clean white
    
    switch (currentFrame) {
      case 'obsidian':
        backplateColor = '#0b0f0e';
        break;
      case 'classic':
        backplateColor = '#fcfbf7';
        break;
      case 'gold':
        backplateColor = '#181c1b';
        break;
      case 'brand':
        backplateColor = '#091413';
        break;
      case 'polaroid':
        backplateColor = '#0c0c0c'; // Film backing black
        break;
      case 'minimalist':
        backplateColor = '#f2f2f2';
        break;
      default:
        backplateColor = 'transparent';
    }

    if (backplateColor !== 'transparent') {
      ctx.fillStyle = backplateColor;
      ctx.fillRect(0, 0, CANVAS_RESOLUTION, CANVAS_RESOLUTION);
    }
    ctx.restore();
  }

  // Draw the customized frame borders on top of the image
  function drawFrameBorders() {
    if (currentFrame === 'none') return;

    ctx.save();
    const W = CANVAS_RESOLUTION;
    const H = CANVAS_RESOLUTION;
    const border = getBorders();

    switch (currentFrame) {
      case 'classic': // Classic Walnut
        drawWoodFrame(W, H, border.left);
        break;
      case 'obsidian': // Modern Obsidian
        drawObsidianFrame(W, H, border.left);
        break;
      case 'gold': // Elegant Gold
        drawGoldFrame(W, H, border.left);
        break;
      case 'minimalist': // Minimalist Gallery
        drawMinimalistFrame(W, H, border.left);
        break;
      case 'brand': // Stable Teal (Brand Frame)
        drawBrandFrame(W, H, border.left);
        break;
      case 'polaroid': // Retro Polaroid Frame
        drawPolaroidFrame(W, H, border);
        break;
    }

    ctx.restore();
  }

  // Helper to draw trapezoidal border segments (for miter-joint corner look)
  function drawMiteredBorders(W, H, B, fillCallback) {
    // Top border trapezoid
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W - B, B);
    ctx.lineTo(B, B);
    ctx.closePath();
    fillCallback('top');

    // Right border trapezoid
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W, H);
    ctx.lineTo(W - B, H - B);
    ctx.lineTo(W - B, B);
    ctx.closePath();
    fillCallback('right');

    // Bottom border trapezoid
    ctx.beginPath();
    ctx.moveTo(W, H);
    ctx.lineTo(0, H);
    ctx.lineTo(B, H - B);
    ctx.lineTo(W - B, H - B);
    ctx.closePath();
    fillCallback('bottom');

    // Left border trapezoid
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, 0);
    ctx.lineTo(B, B);
    ctx.lineTo(B, H - B);
    ctx.closePath();
    fillCallback('left');
  }

  // 1. Classic Walnut Frame
  function drawWoodFrame(W, H, B) {
    // Fill the 4 sides with beveled grain gradients
    drawMiteredBorders(W, H, B, (side) => {
      let grad;
      if (side === 'top') {
        grad = ctx.createLinearGradient(0, 0, 0, B);
      } else if (side === 'right') {
        grad = ctx.createLinearGradient(W, 0, W - B, 0);
      } else if (side === 'bottom') {
        grad = ctx.createLinearGradient(0, H, 0, H - B);
      } else if (side === 'left') {
        grad = ctx.createLinearGradient(0, 0, B, 0);
      }
      
      // Warm dark wood tones
      grad.addColorStop(0, '#3e2213');
      grad.addColorStop(0.3, '#5c3a21');
      grad.addColorStop(0.7, '#482a17');
      grad.addColorStop(1, '#2c170b');
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // Draw wood grain texture overlay lines
    ctx.strokeStyle = 'rgba(40, 20, 10, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 15; i < B - 15; i += 10) {
      ctx.strokeRect(i, i, W - 2*i, H - 2*i);
    }

    // Outer framing shadow line
    ctx.strokeStyle = '#1d0f07';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

    // Inner gold fillet lining (gives premium look)
    const filletSize = 8;
    const filletPos = B - filletSize;
    
    drawMiteredBorders(W, H, B, (side) => {
      // Create small trapezoid paths for fillet corners
      ctx.beginPath();
      if (side === 'top') {
        ctx.moveTo(filletPos, filletPos);
        ctx.lineTo(W - filletPos, filletPos);
        ctx.lineTo(W - B, B);
        ctx.lineTo(B, B);
      } else if (side === 'right') {
        ctx.moveTo(W - filletPos, filletPos);
        ctx.lineTo(W - filletPos, H - filletPos);
        ctx.lineTo(W - B, H - B);
        ctx.lineTo(W - B, B);
      } else if (side === 'bottom') {
        ctx.moveTo(W - filletPos, H - filletPos);
        ctx.lineTo(filletPos, H - filletPos);
        ctx.lineTo(B, H - B);
        ctx.lineTo(W - B, H - B);
      } else if (side === 'left') {
        ctx.moveTo(filletPos, H - filletPos);
        ctx.lineTo(filletPos, filletPos);
        ctx.lineTo(B, B);
        ctx.lineTo(B, H - B);
      }
      ctx.closePath();
      
      let goldGrad;
      if (side === 'top' || side === 'left') {
        goldGrad = ctx.createLinearGradient(filletPos, filletPos, B, B);
      } else {
        goldGrad = ctx.createLinearGradient(W - filletPos, H - filletPos, W - B, H - B);
      }
      goldGrad.addColorStop(0, '#ffd700');
      goldGrad.addColorStop(0.5, '#b8860b');
      goldGrad.addColorStop(1, '#996515');
      ctx.fillStyle = goldGrad;
      ctx.fill();
    });

    // Fillet inner shadow line
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(B - 0.75, B - 0.75, W - 2*B + 1.5, H - 2*B + 1.5);
  }

  // 2. Modern Obsidian Frame
  function drawObsidianFrame(W, H, B) {
    // Charcoal slate gradient borders
    drawMiteredBorders(W, H, B, (side) => {
      let grad;
      if (side === 'top') {
        grad = ctx.createLinearGradient(0, 0, 0, B);
      } else if (side === 'right') {
        grad = ctx.createLinearGradient(W, 0, W - B, 0);
      } else if (side === 'bottom') {
        grad = ctx.createLinearGradient(0, H, 0, H - B);
      } else if (side === 'left') {
        grad = ctx.createLinearGradient(0, 0, B, 0);
      }
      
      grad.addColorStop(0, '#101312');
      grad.addColorStop(0.4, '#1b2220');
      grad.addColorStop(0.8, '#141817');
      grad.addColorStop(1, '#080a0a');
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // Draw brand accent lines running in the middle of frame body
    ctx.strokeStyle = 'rgba(64, 138, 113, 0.45)'; // Brand teal overlay
    ctx.lineWidth = 4;
    ctx.strokeRect(B/2, B/2, W - B, H - B);
    
    // Shiny bevel highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(4, 4, W - 8, H - 8);

    // Inner shadow border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeRect(B - 2, B - 2, W - 2*B + 4, H - 2*B + 4);
  }

  // 3. Elegant Gold Frame
  function drawGoldFrame(W, H, B) {
    // Premium multi-tone gold leaf gradients
    drawMiteredBorders(W, H, B, (side) => {
      let grad;
      if (side === 'top') {
        grad = ctx.createLinearGradient(0, 0, 0, B);
      } else if (side === 'right') {
        grad = ctx.createLinearGradient(W, 0, W - B, 0);
      } else if (side === 'bottom') {
        grad = ctx.createLinearGradient(0, H, 0, H - B);
      } else if (side === 'left') {
        grad = ctx.createLinearGradient(0, 0, B, 0);
      }
      
      grad.addColorStop(0, '#8c6213');
      grad.addColorStop(0.2, '#d4af37');
      grad.addColorStop(0.4, '#fcf0ad');
      grad.addColorStop(0.6, '#d4af37');
      grad.addColorStop(0.8, '#aa7c11');
      grad.addColorStop(1, '#5e4107');
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // Ornate nested relief lines
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, W - 32, H - 32);

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(B - 20, B - 20, W - 2*B + 40, H - 2*B + 40);

    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(B - 1, B - 1, W - 2*B + 2, H - 2*B + 2);
  }

  // 4. Minimalist Gallery Matting Frame
  function drawMinimalistFrame(W, H, B) {
    // Draw only the borders manually to preserve the photo underneath
    ctx.fillStyle = '#fafafb';
    ctx.fillRect(0, 0, W, B); // Top
    ctx.fillRect(W - B, B, B, H - 2*B); // Right
    ctx.fillRect(0, H - B, W, B); // Bottom
    ctx.fillRect(0, B, B, H - 2*B); // Left

    // Subtle mat board miter joint lines (extremely faint)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(B,B);
    ctx.moveTo(W,0); ctx.lineTo(W-B,B);
    ctx.moveTo(W,H); ctx.lineTo(W-B,H-B);
    ctx.moveTo(0,H); ctx.lineTo(B,H-B);
    ctx.stroke();

    // Mat bevel inner shadow stroke
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 2;
    ctx.strokeRect(B - 1, B - 1, W - 2*B + 2, H - 2*B + 2);

    // Fine gallery double-mat inline border (Sage green brand tone)
    ctx.strokeStyle = '#5e7d73';
    ctx.lineWidth = 1.5;
    const inlineOffset = 24;
    ctx.strokeRect(B - inlineOffset, B - inlineOffset, W - 2*B + 2*inlineOffset, H - 2*B + 2*inlineOffset);
  }

  // 5. Stable Teal (Brand Special)
  function drawBrandFrame(W, H, B) {
    // Base color using brand forest green
    drawMiteredBorders(W, H, B, (side) => {
      let grad;
      if (side === 'top') {
        grad = ctx.createLinearGradient(0, 0, 0, B);
      } else if (side === 'right') {
        grad = ctx.createLinearGradient(W, 0, W - B, 0);
      } else if (side === 'bottom') {
        grad = ctx.createLinearGradient(0, H, 0, H - B);
      } else if (side === 'left') {
        grad = ctx.createLinearGradient(0, 0, B, 0);
      }
      
      grad.addColorStop(0, '#091413'); // Brand dark
      grad.addColorStop(0.5, '#285A48'); // Brand forest
      grad.addColorStop(1, '#1b3f32');
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // Inset mint stripe line
    ctx.strokeStyle = '#B0E4CC'; // Brand mint
    ctx.lineWidth = 2.5;
    ctx.strokeRect(B - 20, B - 20, W - 2*B + 40, H - 2*B + 40);

    // Inner bevel shadow
    ctx.strokeStyle = '#091413';
    ctx.lineWidth = 3;
    ctx.strokeRect(B - 1, B - 1, W - 2*B + 2, H - 2*B + 2);

    // Corner decorative triangles in brand Teal (#408A71)
    ctx.fillStyle = '#408A71';
    const cornerSize = 40;
    
    // Top-Left Corner
    ctx.beginPath();
    ctx.moveTo(B - 20, B - 20);
    ctx.lineTo(B - 20 + cornerSize, B - 20);
    ctx.lineTo(B - 20, B - 20 + cornerSize);
    ctx.closePath();
    ctx.fill();

    // Top-Right Corner
    ctx.beginPath();
    ctx.moveTo(W - B + 20, B - 20);
    ctx.lineTo(W - B + 20 - cornerSize, B - 20);
    ctx.lineTo(W - B + 20, B - 20 + cornerSize);
    ctx.closePath();
    ctx.fill();

    // Bottom-Left Corner
    ctx.beginPath();
    ctx.moveTo(B - 20, H - B + 20);
    ctx.lineTo(B - 20 + cornerSize, H - B + 20);
    ctx.lineTo(B - 20, H - B + 20 - cornerSize);
    ctx.closePath();
    ctx.fill();

    // Bottom-Right Corner
    ctx.beginPath();
    ctx.moveTo(W - B + 20, H - B + 20);
    ctx.lineTo(W - B + 20 - cornerSize, H - B + 20);
    ctx.lineTo(W - B + 20, H - B + 20 - cornerSize);
    ctx.closePath();
    ctx.fill();

    // Subtle Brand Name bottom watermark stamp
    ctx.fillStyle = 'rgba(176, 228, 204, 0.45)'; // Brand mint translucent
    ctx.font = 'bold 20px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '5px';
    ctx.fillText('STABLE FRAME', W / 2, H - 35);
  }

  // 6. Retro Polaroid Frame
  function drawPolaroidFrame(W, H, border) {
    const L = border.left;
    const R = border.right;
    const T = border.top;
    const B = border.bottom;

    // Draw only the borders manually to preserve the photo underneath
    ctx.fillStyle = '#faf8f2';
    ctx.fillRect(0, 0, W, T); // Top border
    ctx.fillRect(W - R, T, R, H - T - B); // Right border
    ctx.fillRect(0, H - B, W, B); // Bottom border
    ctx.fillRect(0, T, L, H - T - B); // Left border

    // Draw paper board texture card outlines
    ctx.strokeStyle = '#e6e4dc';
    ctx.lineWidth = 1;
    ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

    // Soft dark inner shadow around photo opening
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(L - 1, T - 1, W - L - R + 2, H - T - B + 2);

    // Elegant handwritten caption on bottom space
    ctx.fillStyle = '#2c3e35';
    ctx.font = 'italic 34px "Playfair Display", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Stable Frame Studio • 2026', W / 2, H - 90);
  }


  // --- Export Functionality ---

  exportBtn.addEventListener('click', () => {
    if (!uploadedImage) return;

    // Get active format selection
    const activeFormatRadio = document.querySelector('input[name="export-format"]:checked');
    const format = activeFormatRadio ? activeFormatRadio.value : 'png';
    
    // Set appropriate MIME types and file extensions
    let mimeType = 'image/png';
    let fileExtension = 'png';
    let quality = undefined;

    if (format === 'jpeg') {
      mimeType = 'image/jpeg';
      fileExtension = 'jpg';
      quality = 0.95; // High quality JPEG
    } else if (format === 'webp') {
      mimeType = 'image/webp';
      fileExtension = 'webp';
      quality = 0.95; // High quality WebP
    }

    try {
      // Get the image data URL
      const dataURL = canvas.toDataURL(mimeType, quality);

      // Create download link element
      const downloadLink = document.createElement('a');
      downloadLink.download = `${imageFileName}-framed.${fileExtension}`;
      downloadLink.href = dataURL;
      
      // Append, trigger, and remove
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Export failed:', err);
      alert('An error occurred while generating your framed image. Please try again.');
    }
  });

});
