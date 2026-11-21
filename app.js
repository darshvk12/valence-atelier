/**
 * VALENCE ATELIER — Interactive Engine & Motion Physics
 * Features: Lenis Smooth Scroll, Magnetic Cursor, Word-by-Word Scroll Scrubbing,
 * Interactive Material Canvas, World Clocks, Stacking Cards.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  /* ==========================================================================
     1. LENIS SMOOTH SCROLLING
     ========================================================================== */
  let lenis;
  try {
    if (typeof Lenis !== 'undefined') {
      lenis = new Lenis({
        duration: 1.25,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 2.0,
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

      lenis.on('scroll', () => {
        updateHeaderTheme();
        updateHeroScrollScale();
        updateStackingEffects();
        updateScrub();
        animateMetrics();
      });
    }
  } catch (err) {
    console.warn('Lenis smooth scroll initialization skipped:', err);
  }

  /* ==========================================================================
     2. CUSTOM MAGNETIC CURSOR
     ========================================================================== */
  const cursor = document.getElementById('cursor');
  let mouseX = -100, mouseY = -100;
  let cursorX = -100, cursorY = -100;

  if (cursor && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    const renderCursor = () => {
      // Linear interpolation (lerp) for smooth trailing
      cursorX += (mouseX - cursorX) * 0.2;
      cursorY += (mouseY - cursorY) * 0.2;
      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
      requestAnimationFrame(renderCursor);
    };
    requestAnimationFrame(renderCursor);

    // Hover detection for buttons and links
    const interactiveTargets = document.querySelectorAll('a, button, .interactive-target, .material-btn, .pill-checkbox');
    interactiveTargets.forEach((target) => {
      target.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      target.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    // Hover detection for project cards (switch to VIEW badge)
    const projectCards = document.querySelectorAll('.stack-card, .preview-card, .monograph-card');
    projectCards.forEach((card) => {
      card.addEventListener('mouseenter', () => document.body.classList.add('cursor-project'));
      card.addEventListener('mouseleave', () => document.body.classList.remove('cursor-project'));
    });
  }

  /* ==========================================================================
     3. HEADER SCROLL DETECTION & DYNAMIC ADAPTIVE THEME
     ========================================================================== */
  const header = document.getElementById('siteHeader');
  const lightSectionSelectors = ['#monoliths', '#disciplines', '#endorsements', '#protocol'];

  function updateHeaderTheme() {
    if (!header) return;

    // Detect if header is over a light-background section
    const headerMidY = 40;
    let isOverLightSection = false;

    for (const sel of lightSectionSelectors) {
      const sec = document.querySelector(sel);
      if (sec) {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= headerMidY && rect.bottom >= headerMidY) {
          isOverLightSection = true;
          break;
        }
      }
    }

    if (isOverLightSection) {
      header.classList.add('theme-light');
    } else {
      header.classList.remove('theme-light');
    }

    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', updateHeaderTheme, { passive: true });
  window.addEventListener('resize', updateHeaderTheme, { passive: true });
  updateHeaderTheme();

  // Smooth scroll to anchor links using Lenis
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        // Close drawers if open
        closeAllDrawers();
        if (lenis) {
          lenis.scrollTo(targetEl, { offset: -60 });
        } else {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  /* ==========================================================================
     3B. HERO STICKY SCALE-DOWN & COLLAGE PROGRESS DYNAMICS
     ========================================================================== */
  const heroSection = document.getElementById('hero');
  const heroScaleWrapper = document.getElementById('heroScaleWrapper');
  const heroProgressFill = document.getElementById('heroProgressFill');

  function updateHeroScrollScale() {
    if (!heroSection || !heroScaleWrapper) return;
    const rect = heroSection.getBoundingClientRect();
    const scrollDist = heroSection.offsetHeight - window.innerHeight;
    if (scrollDist <= 0) return;

    // Progress from 0.0 (top of hero) to 1.0 (end of sticky hero range)
    const progress = Math.min(1, Math.max(0, -rect.top / scrollDist));

    // Responsive scaling: desktop scales down to 0.72, mobile scales down to 0.78
    const isMobile = window.innerWidth < 860;
    const minScale = isMobile ? 0.78 : 0.72;
    const currentScale = 1.0 - (progress * (1.0 - minScale));

    heroScaleWrapper.style.transform = `scale(${currentScale.toFixed(4)})`;

    if (heroProgressFill) {
      heroProgressFill.style.transform = `scaleX(${progress.toFixed(4)})`;
    }
  }

  window.addEventListener('scroll', updateHeroScrollScale, { passive: true });
  window.addEventListener('resize', updateHeroScrollScale, { passive: true });
  updateHeroScrollScale();

  /* ==========================================================================
     4. STICKY STACKING CARDS DEPTH DYNAMICS
     ========================================================================== */
  const stackCards = document.querySelectorAll('.stack-card');
  function updateStackingEffects() {
    if (window.innerWidth < 768) {
      stackCards.forEach((card) => {
        card.style.transform = '';
        card.style.filter = '';
      });
      return;
    }
    const stickyThreshold = window.innerWidth >= 1024 ? 125 : 90;
    stackCards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      // If card has pinned near top (sticky range)
      if (rect.top <= stickyThreshold && index < stackCards.length - 1) {
        const nextCard = stackCards[index + 1];
        const nextRect = nextCard.getBoundingClientRect();
        
        // As next card scrolls up and stacks over, smoothly scale down & darken current card
        const overlap = Math.max(0, window.innerHeight - nextRect.top);
        const progress = Math.min(1, Math.max(0, overlap / (window.innerHeight * 0.75)));
        
        const scale = 1 - progress * 0.05; // 1.0 -> 0.95
        const brightness = 1 - progress * 0.15; // 1.0 -> 0.85
        card.style.transform = `scale(${scale})`;
        card.style.filter = `brightness(${brightness})`;
      } else {
        card.style.transform = 'scale(1)';
        card.style.filter = 'brightness(1)';
      }
    });
  }

  window.addEventListener('scroll', updateStackingEffects, { passive: true });

  /* ==========================================================================
     5. SCROLL-SCRUBBED PHILOSOPHY THEATRE
     ========================================================================== */
  const philosophySection = document.getElementById('philosophy');
  const scrubWords = document.querySelectorAll('.scrub-word');
  const scrubBarFill = document.getElementById('scrubBarFill');
  const scrubPct = document.getElementById('scrubPct');

  function updateScrub() {
    if (!philosophySection) return;
    const rect = philosophySection.getBoundingClientRect();
    const sectionHeight = philosophySection.offsetHeight - window.innerHeight;
    const scrollInside = -rect.top;

    if (scrollInside >= 0 && scrollInside <= sectionHeight) {
      const progress = scrollInside / sectionHeight;
      const totalWords = scrubWords.length;
      const activeWordCount = Math.floor(progress * totalWords);

      scrubWords.forEach((word, idx) => {
        if (idx <= activeWordCount) {
          word.classList.add('active');
        } else {
          word.classList.remove('active');
        }
      });

      if (scrubBarFill) {
        const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
        scrubBarFill.style.width = `${pct}%`;
        if (scrubPct) scrubPct.textContent = `${pct}%`;
      }
    } else if (scrollInside > sectionHeight) {
      scrubWords.forEach(w => w.classList.add('active'));
      if (scrubBarFill) scrubBarFill.style.width = '100%';
      if (scrubPct) scrubPct.textContent = '100%';
    } else {
      scrubWords.forEach(w => w.classList.remove('active'));
      if (scrubBarFill) scrubBarFill.style.width = '0%';
      if (scrubPct) scrubPct.textContent = '0%';
    }
  }

  window.addEventListener('scroll', updateScrub, { passive: true });
  updateScrub();

  /* ==========================================================================
     6. METRIC COUNTERS ANIMATION ON SCROLL
     ========================================================================== */
  const metricCards = document.querySelectorAll('.telemetry-card');
  let metricsAnimated = false;

  function animateMetrics() {
    if (metricsAnimated) return;
    const telemetrySec = document.getElementById('telemetry');
    if (!telemetrySec) return;
    const rect = telemetrySec.getBoundingClientRect();

    if (rect.top <= window.innerHeight * 0.75) {
      metricsAnimated = true;
      document.querySelectorAll('.card-metric-num').forEach((numEl) => {
        const target = parseFloat(numEl.getAttribute('data-target'));
        const duration = 1800;
        const startTime = performance.now();

        const countStep = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          // Ease out cubic
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          
          if (target === 0) {
            numEl.textContent = '0.00';
          } else {
            const current = Math.floor(easeProgress * target);
            numEl.textContent = current.toLocaleString();
          }

          if (progress < 1) {
            requestAnimationFrame(countStep);
          } else {
            if (target === 0) {
              numEl.textContent = '0.00';
            } else {
              numEl.textContent = target.toLocaleString();
            }
          }
        };
        requestAnimationFrame(countStep);
      });
    }
  }

  window.addEventListener('scroll', animateMetrics, { passive: true });

  /* ==========================================================================
     7. MATERIALITY STUDIO (INTERACTIVE CANVAS & SHADER TACTILITY LAB)
     ========================================================================== */
  const canvas = document.getElementById('materialCanvas');
  const hudLightVector = document.getElementById('hudLightVector');
  const hudRoughness = document.getElementById('hudRoughness');
  const hudThermalLag = document.getElementById('hudThermalLag');
  const lightAngleSlider = document.getElementById('lightAngleSlider');
  const sliderAngleVal = document.getElementById('sliderAngleVal');
  const labMacroBtn = document.getElementById('labMacroBtn');
  const labThermalBtn = document.getElementById('labThermalBtn');
  const materialBtns = document.querySelectorAll('.material-btn');

  // Dossier elements
  const dossierTitle = document.getElementById('dossierTitle');
  const dossierDesc = document.getElementById('dossierDesc');
  const dossierDensity = document.getElementById('dossierDensity');
  const dossierStrength = document.getElementById('dossierStrength');
  const dossierAcoustic = document.getElementById('dossierAcoustic');

  const materialsData = {
    basalt: {
      title: 'Deccan Columnar Black Basalt',
      desc: 'Quarried from the ancient volcanic flood basalts of Maharashtra’s Deccan Traps. Columnar hexagonal joints cut with high-pressure waterjets, providing extraordinary thermal lag and total electromagnetic shielding against coastal humidity and salt-fog.',
      density: '2,980 kg/m³',
      strength: '165 MPa (Extreme Basalt)',
      acoustic: '0.24 αw (Specular Purity)',
      roughness: '0.68 Ra',
      thermalLag: '72.4 Hours',
      baseColor: [18, 20, 24],
      accentGlint: [140, 150, 165],
      textureType: 'basalt'
    },
    makrana: {
      title: 'Makrana Metamorphic Quartzite',
      desc: 'High-calcite metamorphic crystalline stone from Nagaur, Rajasthan. Translucent mineral quartz veins fracture incident daylight, delivering 99.4% resistance to solar ultraviolet thermal radiation and extreme surface hardness.',
      density: '2,840 kg/m³',
      strength: '120 MPa (Compressive)',
      acoustic: '0.18 αw (Specular Reflector)',
      roughness: '0.42 Ra',
      thermalLag: '58.2 Hours',
      baseColor: [238, 235, 228],
      accentGlint: [255, 255, 255],
      textureType: 'quartz'
    },
    titanium: {
      title: 'Darkened Aerospace Titanium',
      desc: 'Grade 5 (Ti-6Al-4V) titanium alloy, formulated at Bengaluru aerospace metallurgy labs. Surface-brushed with ceramic stone beads and passivated to produce an immutable charcoal oxide shield impervious to Arabian Sea salt-spray.',
      density: '4,506 kg/m³',
      strength: '950 MPa (Yield)',
      acoustic: '0.05 αw (Reflective)',
      roughness: '0.34 Ra',
      thermalLag: '14.8 Hours',
      baseColor: [36, 38, 44],
      accentGlint: [225, 232, 245],
      textureType: 'brushed'
    },
    teak: {
      title: 'Carbonized Malabar Teak (Yakisugi Heartwood)',
      desc: 'Old-growth Kerala Malabar teak torched to a depth of 3.5mm with open flame. The natural silica-rich crystalline carbon surface repels monsoonal dampness, wood-boring insects, and mold without synthetic varnishes.',
      density: '780 kg/m³',
      strength: '65 MPa (Flexural)',
      acoustic: '0.48 αw (Acoustic Warmth)',
      roughness: '0.88 Ra',
      thermalLag: '42.0 Hours',
      baseColor: [26, 20, 16],
      accentGlint: [185, 130, 85],
      textureType: 'wood'
    },
    concrete: {
      title: 'Bush-Hammered Alpine Concrete',
      desc: 'Formulated with locally quarried crushed quartz from the Swiss Alps. Struck repeatedly with pneumatic bush-hammers to fracture the surface cement cream, revealing the deep mineral grains and dampening high-frequency sound waves.',
      density: '2,550 kg/m³',
      strength: '75 MPa (C60/75)',
      acoustic: '0.38 αw (Low Flutter)',
      roughness: '0.82 Ra',
      thermalLag: '64.5 Hours',
      baseColor: [50, 52, 58],
      accentGlint: [195, 200, 212],
      textureType: 'stone'
    }
  };

  let activeMaterialKey = 'basalt';
  let isMacroMode = false;
  let isThermalMode = false;
  let lightX = 0.5, lightY = 0.5;
  let targetLightX = 0.5, targetLightY = 0.5;

  if (canvas) {
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Mouse movement
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      targetLightX = (e.clientX - rect.left) / rect.width;
      targetLightY = (e.clientY - rect.top) / rect.height;
    });

    canvas.addEventListener('mouseleave', () => {
      targetLightX = 0.5;
      targetLightY = 0.5;
    });

    // Touch support
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        targetLightX = (e.touches[0].clientX - rect.left) / rect.width;
        targetLightY = (e.touches[0].clientY - rect.top) / rect.height;
      }
    }, { passive: true });

    // Slider Angle Control
    if (lightAngleSlider) {
      lightAngleSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const radians = (val / 100) * Math.PI * 2;
        targetLightX = 0.5 + Math.cos(radians) * 0.45;
        targetLightY = 0.5 + Math.sin(radians) * 0.45;
        if (sliderAngleVal) {
          sliderAngleVal.textContent = `${Math.round((val / 100) * 360)}° Azimuth`;
        }
      });
    }

    // Macro & Thermal Mode Toggles
    if (labMacroBtn) {
      labMacroBtn.addEventListener('click', () => {
        isMacroMode = !isMacroMode;
        labMacroBtn.classList.toggle('active', isMacroMode);
      });
    }

    if (labThermalBtn) {
      labThermalBtn.addEventListener('click', () => {
        isThermalMode = !isThermalMode;
        labThermalBtn.classList.toggle('active', isThermalMode);
      });
    }

    // Render loop: 3D Mineral Block & Procedural Surface Specular Lighting
    const renderMaterial = () => {
      lightX += (targetLightX - lightX) * 0.12;
      lightY += (targetLightY - lightY) * 0.12;

      const angleDeg = Math.round(Math.atan2(lightY - 0.5, lightX - 0.5) * (180 / Math.PI) + 180);
      if (hudLightVector) {
        hudLightVector.textContent = `${angleDeg}° (Grazing)`;
      }

      const w = canvas.width;
      const h = canvas.height;
      const mat = materialsData[activeMaterialKey];

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Save context for macro zoom
      ctx.save();
      if (isMacroMode) {
        ctx.translate(w / 2, h / 2);
        ctx.scale(1.8, 1.8);
        ctx.translate(-w / 2, -h / 2);
      }

      // Draw 3D Architectural Mineral Slab Geometry
      const slabMarginX = w * 0.12;
      const slabMarginY = h * 0.14;
      const slabW = w - slabMarginX * 2;
      const slabH = h - slabMarginY * 2;
      const slabRadius = 24;

      // Drop shadow under mineral slab
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 20;

      // Slab Face
      ctx.beginPath();
      ctx.roundRect(slabMarginX, slabMarginY, slabW, slabH, slabRadius);

      if (isThermalMode) {
        // Infrared false-color gradient
        const thermGrad = ctx.createRadialGradient(
          slabMarginX + lightX * slabW,
          slabMarginY + lightY * slabH,
          10,
          w / 2,
          h / 2,
          slabW * 0.6
        );
        thermGrad.addColorStop(0, '#F59E0B'); // Hot center
        thermGrad.addColorStop(0.35, '#EC4899'); // Magenta mid
        thermGrad.addColorStop(0.7, '#6366F1'); // Indigo cool
        thermGrad.addColorStop(1, '#0F172A'); // Deep obsidian
        ctx.fillStyle = thermGrad;
      } else {
        // Base mineral color
        ctx.fillStyle = `rgb(${mat.baseColor[0]}, ${mat.baseColor[1]}, ${mat.baseColor[2]})`;
      }
      ctx.fill();
      ctx.restore();

      // Specular Light Highlight across Slab
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(slabMarginX, slabMarginY, slabW, slabH, slabRadius);
      ctx.clip();

      const specX = slabMarginX + lightX * slabW;
      const specY = slabMarginY + lightY * slabH;
      const specRadius = Math.max(slabW, slabH) * (isThermalMode ? 0.8 : 0.65);

      const lightGrad = ctx.createRadialGradient(specX, specY, 15, specX, specY, specRadius);
      if (isThermalMode) {
        lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        lightGrad.addColorStop(0, `rgba(${mat.accentGlint[0]}, ${mat.accentGlint[1]}, ${mat.accentGlint[2]}, 0.5)`);
        lightGrad.addColorStop(0.3, `rgba(${mat.accentGlint[0]}, ${mat.accentGlint[1]}, ${mat.accentGlint[2]}, 0.18)`);
        lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
      }
      ctx.fillStyle = lightGrad;
      ctx.fillRect(slabMarginX, slabMarginY, slabW, slabH);

      // Procedural Mineral Textures
      if (!isThermalMode) {
        if (mat.textureType === 'basalt' || mat.textureType === 'stone') {
          // Volcanic vesicle pores & mineral flecks
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          for (let i = 0; i < (isMacroMode ? 500 : 350); i++) {
            const px = slabMarginX + (Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1) * slabW;
            const py = slabMarginY + (Math.abs(Math.cos(i * 78.233) * 43758.5453) % 1) * slabH;
            const size = (i % 5 === 0) ? 3 : 1.5;
            ctx.fillRect(px, py, size, size);
          }
        } else if (mat.textureType === 'quartz') {
          // Translucent calcite crystal veins
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = isMacroMode ? 3.5 : 2;
          ctx.beginPath();
          ctx.moveTo(slabMarginX + slabW * 0.15, slabMarginY);
          ctx.bezierCurveTo(
            slabMarginX + slabW * 0.4, slabMarginY + slabH * 0.35,
            slabMarginX + slabW * 0.3, slabMarginY + slabH * 0.65,
            slabMarginX + slabW * 0.85, slabMarginY + slabH
          );
          ctx.stroke();
        } else if (mat.textureType === 'brushed') {
          // Aerospace linear anisotropic brush grain
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
          ctx.lineWidth = 1;
          for (let y = slabMarginY; y < slabMarginY + slabH; y += (isMacroMode ? 6 : 4)) {
            ctx.beginPath();
            ctx.moveTo(slabMarginX, y);
            ctx.lineTo(slabMarginX + slabW, y + Math.sin(y) * 2);
            ctx.stroke();
          }
        } else if (mat.textureType === 'wood') {
          // Charred Yakisugi timber grain rings
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.lineWidth = isMacroMode ? 4 : 2.5;
          for (let x = slabMarginX; x < slabMarginX + slabW; x += (isMacroMode ? 28 : 18)) {
            ctx.beginPath();
            ctx.moveTo(x + Math.sin(x) * 12, slabMarginY);
            ctx.lineTo(x + Math.cos(x) * 16, slabMarginY + slabH);
            ctx.stroke();
          }
        }
      }

      // Slab Beveled Edge Border
      ctx.strokeStyle = isThermalMode ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(slabMarginX, slabMarginY, slabW, slabH, slabRadius);
      ctx.stroke();

      ctx.restore(); // Clip
      ctx.restore(); // Macro

      requestAnimationFrame(renderMaterial);
    };
    requestAnimationFrame(renderMaterial);

    // Switch material selection
    materialBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        materialBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        activeMaterialKey = btn.getAttribute('data-mat');
        const mat = materialsData[activeMaterialKey];

        // Update HUD
        if (hudRoughness) hudRoughness.textContent = mat.roughness;
        if (hudThermalLag) hudThermalLag.textContent = mat.thermalLag;

        // Update Dossier with smooth transition
        if (dossierTitle) dossierTitle.textContent = mat.title;
        if (dossierDesc) dossierDesc.textContent = mat.desc;
        if (dossierDensity) dossierDensity.textContent = mat.density;
        if (dossierStrength) dossierStrength.textContent = mat.strength;
        if (dossierAcoustic) dossierAcoustic.textContent = mat.acoustic;
      });
    });
  }

  /* ==========================================================================
     8. SYNCHRONIZED REAL-TIME WORLD CLOCKS
     ========================================================================== */
  const formatCityTime = (timeZone) => {
    try {
      const now = new Date();
      return new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);
    } catch (e) {
      return '--:--:--';
    }
  };

  const updateClocks = () => {
    const elMumbai = document.querySelector('#clockMumbai .clock-time');
    const elZurich = document.querySelector('#clockZurich .clock-time');
    const elKyoto = document.querySelector('#clockKyoto .clock-time');
    const elNY = document.querySelector('#clockNY .clock-time');

    if (elMumbai) elMumbai.textContent = formatCityTime('Asia/Kolkata');
    if (elZurich) elZurich.textContent = formatCityTime('Europe/Zurich');
    if (elKyoto) elKyoto.textContent = formatCityTime('Asia/Tokyo');
    if (elNY) elNY.textContent = formatCityTime('America/New_York');
  };

  setInterval(updateClocks, 1000);
  updateClocks();

  /* ==========================================================================
     10. NAVIGATION DRAWER & COMMISSION SLIDE-OVER MODALS
     ========================================================================== */
  const drawerOverlay = document.getElementById('drawerOverlay');
  const navDrawer = document.getElementById('navDrawer');
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');

  const commissionDrawer = document.getElementById('commissionDrawer');
  const commissionCloseBtn = document.getElementById('commissionCloseBtn');
  const openCommissionBtns = document.querySelectorAll('.open-commission-btn');

  const openDrawer = (drawerEl) => {
    closeAllDrawers();
    if (drawerOverlay) drawerOverlay.classList.add('active');
    if (drawerEl) drawerEl.classList.add('active');
    document.body.classList.add('drawer-open');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
  };

  const closeAllDrawers = () => {
    if (drawerOverlay) drawerOverlay.classList.remove('active');
    if (navDrawer) navDrawer.classList.remove('active');
    if (commissionDrawer) commissionDrawer.classList.remove('active');
    const bpModal = document.getElementById('blueprintModal');
    if (bpModal) bpModal.classList.remove('active');
    document.body.classList.remove('drawer-open');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
  };

  // Nav Drawer
  if (menuToggleBtn) {
    menuToggleBtn.addEventListener('click', () => {
      openDrawer(navDrawer);
    });
  }

  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeAllDrawers);
  }

  // Commission Drawer
  openCommissionBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openDrawer(commissionDrawer);
    });
  });

  if (commissionCloseBtn) {
    commissionCloseBtn.addEventListener('click', closeAllDrawers);
  }

  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', closeAllDrawers);
    drawerOverlay.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  // Allow natural finger/wheel scrolling inside drawers without bubbling to page
  [navDrawer, commissionDrawer].forEach((drawer) => {
    if (!drawer) return;
    drawer.addEventListener('wheel', (e) => {
      e.stopPropagation();
    }, { passive: true });
    drawer.addEventListener('touchmove', (e) => {
      e.stopPropagation();
    }, { passive: true });
  });

  // Handle Commission Form Submission
  const commissionForm = document.getElementById('commissionForm');
  const formSuccess = document.getElementById('formSuccessMessage');
  if (commissionForm) {
    commissionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = commissionForm.querySelector('button[type="submit"]');
      submitBtn.innerHTML = '<span>Transmitting Dossier...</span>';
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.style.display = 'none';
        if (formSuccess) formSuccess.classList.add('active');
      }, 1000);
    });
  }

  // Quick Inquiry Form in Footer
  const quickForm = document.getElementById('quickInquiryForm');
  const quickFeedback = document.getElementById('quickFeedback');
  if (quickForm) {
    quickForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (quickFeedback) quickFeedback.classList.add('active');
      quickForm.querySelector('input').value = '';
    });
  }

  /* ==========================================================================
     11. MONOLITHS CATEGORY FILTERING
     ========================================================================== */
  const filterPills = document.querySelectorAll('#monolithFilters .filter-pill');

  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');

      const category = pill.getAttribute('data-category');
      stackCards.forEach((card) => {
        const cardCat = card.getAttribute('data-category');
        if (category === 'all' || cardCat === category) {
          card.classList.remove('card-filtered-out');
        } else {
          card.classList.add('card-filtered-out');
        }
      });

      // Recalculate stacking physics after filter change
      if (typeof updateStackingEffects === 'function') {
        updateStackingEffects();
      }
    });
  });

  /* ==========================================================================
     12. ARCHITECTURAL BLUEPRINT LIGHTBOX MODAL
     ========================================================================== */
  const blueprintModal = document.getElementById('blueprintModal');
  const blueprintOverlay = document.getElementById('blueprintOverlay');
  const blueprintCloseBtn = document.getElementById('blueprintCloseBtn');
  const openBlueprintBtns = document.querySelectorAll('.open-blueprint-btn');
  const bpTitle = document.getElementById('bpTitle');
  const bpSubTag = document.getElementById('bpSubTag');

  const blueprintData = {
    konkan: {
      title: 'Konkan Basalt Monolith — Structural Cross-Section',
      tag: '(CAD Schematic Elevation · Sub-Bedrock Basalt Strata)'
    },
    ghats: {
      title: 'Western Ghats Stepwell Vault — Hydrostatic Section',
      tag: '(CAD Geothermal Plan · 11.4m Bedrock Excavation)'
    },
    valser: {
      title: 'Valser Fels Alpine Monolith — Avalanche Load Diagram',
      tag: '(Swiss Alpine Structural CAD · 1,940m Elevation)'
    },
    kanso: {
      title: 'Kanso Subterranean Vault — Astrolabe Joinery Section',
      tag: '(Kyoto Nuki Mortise & Tenon Assembly CAD · Zero Metal)'
    },
    thar: {
      title: 'Thar Desert Rammed Earth Citadel — Wind-Catcher Jali',
      tag: '(Rajasthan Bioclimatic Jali Convection CAD · Caliche Clay)'
    },
    hudson: {
      title: 'Hudson Highlands Obsidian Belvedere — Cantilever Tensile CAD',
      tag: '(Americas Liaison · 14.2m Vitrified Glass Overlook)'
    }
  };

  const closeBlueprintModal = () => {
    if (blueprintModal) blueprintModal.classList.remove('active');
    document.body.classList.remove('drawer-open');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
  };

  openBlueprintBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bpKey = btn.getAttribute('data-blueprint') || 'konkan';
      const info = blueprintData[bpKey] || blueprintData.konkan;
      if (bpTitle) bpTitle.textContent = info.title;
      if (bpSubTag) bpSubTag.textContent = info.tag;
      if (blueprintModal) blueprintModal.classList.add('active');
      document.body.classList.add('drawer-open');
      document.body.style.overflow = 'hidden';
      if (lenis) lenis.stop();
    });
  });

  if (blueprintCloseBtn) blueprintCloseBtn.addEventListener('click', closeBlueprintModal);
  if (blueprintOverlay) blueprintOverlay.addEventListener('click', closeBlueprintModal);

  /* ==========================================================================
     13. PATRON ENDORSEMENTS LUXURY ARCHIVE CONTROLS & PILLS
     ========================================================================== */
  const endorseTrack = document.getElementById('endorsementsTrack');
  const endorsePrevBtn = document.getElementById('endorsePrevBtn');
  const endorseNextBtn = document.getElementById('endorseNextBtn');
  const endorseCounterPill = document.getElementById('endorseCounterPill');
  const endorseFilterPills = document.querySelectorAll('#endorsePillsBar .endorse-filter-pill');
  const endorseCards = document.querySelectorAll('.endorsement-card');

  const updateEndorseCounter = (index) => {
    if (endorseCounterPill) {
      endorseCounterPill.textContent = `ARCHIVE 0${index + 1} / 05`;
    }
    endorseFilterPills.forEach((p, idx) => {
      p.classList.toggle('active', idx === index);
    });
    endorseCards.forEach((c, idx) => {
      c.classList.toggle('active', idx === index);
    });
  };

  endorseFilterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const idx = parseInt(pill.getAttribute('data-index'), 10) || 0;
      if (endorseCards[idx] && endorseTrack) {
        const cardOffset = endorseCards[idx].offsetLeft - endorseTrack.offsetLeft;
        endorseTrack.scrollTo({ left: cardOffset, behavior: 'smooth' });
        updateEndorseCounter(idx);
      }
    });
  });

  if (endorseTrack && endorsePrevBtn && endorseNextBtn) {
    endorsePrevBtn.addEventListener('click', () => {
      endorseTrack.scrollBy({ left: -460, behavior: 'smooth' });
    });
    endorseNextBtn.addEventListener('click', () => {
      endorseTrack.scrollBy({ left: 460, behavior: 'smooth' });
    });

    // Detect scroll position to update counter & pill highlight
    endorseTrack.addEventListener('scroll', () => {
      const scrollLeft = endorseTrack.scrollLeft;
      let closestIdx = 0;
      let minDiff = Infinity;
      endorseCards.forEach((c, idx) => {
        const diff = Math.abs(c.offsetLeft - endorseTrack.offsetLeft - scrollLeft);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      if (endorseCounterPill) {
        endorseCounterPill.textContent = `ARCHIVE 0${closestIdx + 1} / 05`;
      }
      endorseFilterPills.forEach((p, idx) => {
        p.classList.toggle('active', idx === closestIdx);
      });
    }, { passive: true });
  }

  /* ==========================================================================
     13B. THE FIVE-CENTURY COMMISSION PROTOCOL (INTERACTIVE STAGE COCKPIT)
     ========================================================================== */
  const protocolTabs = document.querySelectorAll('.protocol-step-tab');
  const protocolCards = document.querySelectorAll('.protocol-card');
  const cockpitStageBadge = document.getElementById('cockpitStageBadge');
  const cockpitTimeBadge = document.getElementById('cockpitTimeBadge');
  const cockpitHeading = document.getElementById('cockpitHeading');
  const cockpitDesc = document.getElementById('cockpitDesc');
  const cockpitChecklist = document.getElementById('cockpitChecklist');
  const cockpitTags = document.getElementById('cockpitTags');
  const cockpitSvg = document.getElementById('cockpitSvg');

  const protocolStageData = [
    {
      badge: 'STAGE 01 · FOUNDATIONAL COMMENCEMENT',
      time: 'MONTH 1–3',
      heading: 'Geological Core Drilling & Solar Heliotropy',
      desc: 'We extract 40-meter bedrock core samples to measure shear strength, groundwater hydrology, and seismic fault resonance. Simultaneous year-round solar trajectory modeling determines aperture angles.',
      checks: [
        '40-Meter Deccan Basalt Borehole Core Extraction',
        'IS-1893 Seismic Zone IV/V Bedrock Resonance Analysis',
        '365-Day Solar Azimuth & Heliotropic Sun-Path Simulation',
        'Subterranean Hydrostatic Water Table Logging'
      ],
      tags: ['IS-1893 Seismic Audit', 'Bedrock Core Log', 'Sub-Bedrock Basalt Stratum'],
      svg: `
        <line x1="40" y1="50" x2="560" y2="50" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3 3"/>
        <line x1="40" y1="150" x2="560" y2="150" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3 3"/>
        <line x1="40" y1="250" x2="560" y2="250" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3 3"/>
        <line x1="40" y1="350" x2="560" y2="350" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3 3"/>
        <path d="M 40 220 Q 200 200 360 230 T 560 210" stroke="#10B981" stroke-width="2"/>
        <text x="50" y="210" fill="#10B981" font-family="monospace" font-size="10">DATUM 0.00m (BEDROCK BASALT)</text>
        <rect x="250" y="90" width="100" height="230" stroke="#FFFFFF" stroke-width="2" fill="rgba(255,255,255,0.04)"/>
        <line x1="300" y1="40" x2="300" y2="370" stroke="#38BDF8" stroke-width="1.5" stroke-dasharray="4 2"/>
        <text x="310" y="70" fill="#38BDF8" font-family="monospace" font-size="10">BOREHOLE AXIS -40.0M</text>
        <circle cx="300" cy="220" r="5" fill="#F59E0B"/>
        <circle cx="250" cy="320" r="4" fill="#10B981"/>
        <circle cx="350" cy="320" r="4" fill="#10B981"/>
        <text x="365" y="324" fill="#10B981" font-family="monospace" font-size="9">SHEAR PIN Ah=0.36</text>
      `
    },
    {
      badge: 'STAGE 02 · COMPUTATIONAL PHYSICS',
      time: 'MONTH 4–7',
      heading: 'Thermal Fluid Dynamics & Microclimate Modeling',
      desc: 'The structure is digitally subjected to 500-year simulated weather cycles: tropical monsoonal deluges, 48°C coastal heatwaves, and seismic shockwaves. Thermal lag is tuned to hold interior temperatures at 20°C naturally.',
      checks: [
        '500-Year Monsoonal Storm Cycle Computational Fluid Dynamics',
        '48°C Ambient Heatwave Natural Convection Verification',
        'Passive Isothermal Inertia: Constant 20°C Delta Achieved',
        'Subterranean Jali Aerodynamic Cross-Ventilation Audit'
      ],
      tags: ['CFD Microclimate Model', 'FEA Stress Analysis', '72.4h Thermal Lag Buffer'],
      svg: `
        <line x1="40" y1="50" x2="560" y2="50" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3 3"/>
        <line x1="40" y1="200" x2="560" y2="200" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3 3"/>
        <line x1="40" y1="350" x2="560" y2="350" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3 3"/>
        <rect x="180" y="100" width="240" height="180" stroke="#38BDF8" stroke-width="2" fill="rgba(56, 189, 248, 0.05)"/>
        <path d="M 80 140 C 140 120, 160 220, 240 190 S 360 160, 480 180" stroke="#EC4899" stroke-width="2.5" fill="none"/>
        <path d="M 100 240 C 180 260, 220 160, 300 220 S 420 250, 520 210" stroke="#38BDF8" stroke-width="2.5" fill="none"/>
        <text x="195" y="130" fill="#38BDF8" font-family="monospace" font-size="11">ISOTHERMAL CORE: 20.0°C</text>
        <text x="80" y="115" fill="#EC4899" font-family="monospace" font-size="10">EXTERIOR AIR: 48.2°C</text>
        <circle cx="300" cy="190" r="8" fill="#10B981"/>
        <text x="320" y="194" fill="#10B981" font-family="monospace" font-size="10">CFD CONVECTION VECT: 0.42 m/s</text>
      `
    },
    {
      badge: 'STAGE 03 · IMMUTABLE QUARRYING',
      time: 'MONTH 8–18',
      heading: 'Cyclopean Quarrying & Hand-Dressed Masonry',
      desc: 'Direct extraction of multi-tonne basalt blocks from designated Deccan quarry veins. Master stonemasons dress every block with pneumatic waterjets and hand chisels to achieve friction-fit gravity joinery.',
      checks: [
        'Direct Quarry Extraction from Deccan Columnar Basalt Veins',
        '±0.45mm CNC Hydro-Cut Robotic & Pneumatic Dressing',
        'Zero Synthetic Adhesives: Pure Gravity Friction-Fit Joinery',
        'Seismic Mortise & Tenon Bedrock Lock Engagement'
      ],
      tags: ['Zero Synthetic Adhesives', 'Sub-Millimeter Tolerances', 'Cyclopean Mass'],
      svg: `
        <line x1="40" y1="50" x2="560" y2="50" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3 3"/>
        <line x1="40" y1="200" x2="560" y2="200" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3 3"/>
        <polygon points="160,260 220,120 380,120 440,260" stroke="#FFFFFF" stroke-width="2.5" fill="rgba(255,255,255,0.04)"/>
        <rect x="230" y="140" width="140" height="100" stroke="#10B981" stroke-width="2" fill="rgba(16, 185, 129, 0.08)"/>
        <line x1="160" y1="260" x2="440" y2="260" stroke="#F59E0B" stroke-width="3"/>
        <text x="210" y="280" fill="#F59E0B" font-family="monospace" font-size="10">FRICTION-FIT GRAVITY BEDDING</text>
        <line x1="300" y1="80" x2="300" y2="135" stroke="#38BDF8" stroke-width="1.5"/>
        <text x="260" y="75" fill="#38BDF8" font-family="monospace" font-size="10">TOLERANCE ±0.45mm</text>
      `
    },
    {
      badge: 'STAGE 04 · GENERATIONAL COMMENCEMENT',
      time: 'MONTH 19+',
      heading: 'Generational Handover & Five-Century Deed',
      desc: 'Commissioning complete. The structure is inscribed with sovereign coordinates and sealed with a registered 500-year structural deed, accompanied by an archival titanium blueprint canister for your family office.',
      checks: [
        'Permanent Bedrock Coordinate Inscription & GPS Datum Stamp',
        '500-Year Structural Deed Registered with Sovereign Family Office',
        'Archival Grade 5 Titanium Blueprint Canister Handover',
        'Generational Maintenance & Acoustic Calibration Manual'
      ],
      tags: ['Titanium Blueprint Deed', '500-Year Generational Pact', 'Registered Trust'],
      svg: `
        <circle cx="300" cy="200" r="90" stroke="#10B981" stroke-width="2" fill="rgba(16, 185, 129, 0.05)"/>
        <circle cx="300" cy="200" r="70" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-dasharray="4 4"/>
        <line x1="300" y1="90" x2="300" y2="310" stroke="#38BDF8" stroke-width="1"/>
        <line x1="190" y1="200" x2="410" y2="200" stroke="#38BDF8" stroke-width="1"/>
        <text x="245" y="195" fill="#FFFFFF" font-family="monospace" font-size="11">VALENCE ATELIER</text>
        <text x="248" y="215" fill="#10B981" font-family="monospace" font-size="10">500-YEAR DEED</text>
        <text x="230" y="325" fill="#94A3B8" font-family="monospace" font-size="9">18.9220° N, 72.8346° E</text>
      `
    }
  ];

  const setProtocolStage = (stageIdx) => {
    protocolTabs.forEach((tab, idx) => {
      tab.classList.toggle('active', idx === stageIdx);
    });
    protocolCards.forEach((card, idx) => {
      card.classList.toggle('active', idx === stageIdx);
    });

    const data = protocolStageData[stageIdx];
    if (!data) return;

    if (cockpitStageBadge) cockpitStageBadge.textContent = data.badge;
    if (cockpitTimeBadge) cockpitTimeBadge.textContent = data.time;
    if (cockpitHeading) cockpitHeading.textContent = data.heading;
    if (cockpitDesc) cockpitDesc.textContent = data.desc;

    if (cockpitChecklist) {
      cockpitChecklist.innerHTML = data.checks.map(chk => `
        <div class="check-item active">
          <i data-lucide="check-circle" class="check-icon"></i>
          <span>${chk}</span>
        </div>
      `).join('');
      if (window.lucide) window.lucide.createIcons();
    }

    if (cockpitTags) {
      cockpitTags.innerHTML = data.tags.map(t => `
        <span class="proto-tag">${t}</span>
      `).join('');
    }

    if (cockpitSvg) {
      cockpitSvg.innerHTML = data.svg;
    }
  };

  protocolTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const stageIdx = parseInt(tab.getAttribute('data-stage'), 10) || 0;
      setProtocolStage(stageIdx);
    });
  });

  protocolCards.forEach((card) => {
    card.addEventListener('click', () => {
      const stageIdx = parseInt(card.getAttribute('data-stage'), 10) || 0;
      setProtocolStage(stageIdx);
      if (cockpitHeading) {
        cockpitHeading.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });

  /* ==========================================================================
     14. DYNAMIC NUMERIC COUNTER ANIMATIONS ON SCROLL
     ========================================================================== */
  const metricNums = document.querySelectorAll('.card-metric-num');
  let hasAnimatedCounters = false;

  const animateCounters = () => {
    if (hasAnimatedCounters) return;
    hasAnimatedCounters = true;

    metricNums.forEach((el) => {
      const target = parseFloat(el.getAttribute('data-target'));
      if (isNaN(target)) return;

      const duration = 1800;
      const startTime = performance.now();

      const updateCount = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const currentVal = Math.floor(easeProgress * target);

        if (target >= 1000) {
          el.textContent = currentVal.toLocaleString();
        } else if (target === 0) {
          el.textContent = '0.00';
        } else {
          el.textContent = currentVal.toString();
        }

        if (progress < 1) {
          requestAnimationFrame(updateCount);
        } else {
          if (target >= 1000) el.textContent = target.toLocaleString();
          else if (target === 0) el.textContent = '0.00';
          else el.textContent = target.toString();
        }
      };

      requestAnimationFrame(updateCount);
    });
  };

  const telemetrySection = document.getElementById('telemetry');
  if (telemetrySection && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounters();
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    counterObserver.observe(telemetrySection);
  }

  /* ==========================================================================
     15. 3D CARD TILT & TACTILE HOVER PHYSICS
     ========================================================================== */
  const interactiveCards = document.querySelectorAll('.discipline-card, .protocol-card, .endorsement-card, .monograph-card');
  interactiveCards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
});
