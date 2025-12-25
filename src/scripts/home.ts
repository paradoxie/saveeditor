// Animated counter for stats
const initCounters = () => {
    const counters = document.querySelectorAll('.counter');
    const animationDuration = 1500; // ms

    const animateCounter = (counter: Element) => {
        const target = parseInt(counter.getAttribute('data-target') || '0');
        const startTime = performance.now();

        const updateCounter = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / animationDuration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(target * easeOutQuart);

            counter.textContent = current.toString() + (target === 100 ? '%' : '+');

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };

        requestAnimationFrame(updateCounter);
    };

    // Intersection Observer for triggering animation when in view
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.5 }
    );

    counters.forEach((counter) => observer.observe(counter));
};

// Smart File Upload Detection
const initFileUpload = () => {
    const fileInput = document.getElementById('smart-file-input') as HTMLInputElement;
    const uploadZone = document.getElementById('smart-upload-zone') as HTMLDivElement;

    if (!fileInput || !uploadZone) return;

    // Get current language prefix, default to empty (English)
    // Note: window.currentLang is set in the page template
    const currentLang = (window as any).currentLang;
    const langPrefix = currentLang && currentLang !== 'en' ? `/${currentLang}` : '';

    // File extension to editor mapping with localized paths
    const extensionMap: Record<string, string> = {
        '.rpgsave': `${langPrefix}/editor/rpg-maker-mv`,
        '.rmmzsave': `${langPrefix}/editor/rpg-maker-mv`,
        '.rvdata2': `${langPrefix}/editor/rpg-maker-mv`,
        '.rvdata': `${langPrefix}/editor/rpg-maker-mv`,
        '.sav': `${langPrefix}/editor/unreal`,
        '.save': `${langPrefix}/editor/renpy`,
        '.xml': `${langPrefix}/editor/unity`,
        '.plist': `${langPrefix}/editor/unity`,
        '.ini': `${langPrefix}/editor/gamemaker`,
        '.json': `${langPrefix}/editor/gamemaker`,
        '.nson': `${langPrefix}/editor/naninovel`,
    };

    // Get file extension
    const getExtension = (filename: string): string => {
        const lastDot = filename.lastIndexOf('.');
        return lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';
    };

    // Handle file selection
    const handleFile = (file: File) => {
        const ext = getExtension(file.name);
        // Normalize extension to lowercase for lookup
        const editorPath = extensionMap[ext];

        if (editorPath) {
            // Store file in sessionStorage for the editor to pick up
            const reader = new FileReader();
            reader.onload = (e) => {
                const fileData = {
                    name: file.name,
                    content: e.target?.result,
                    type: file.type,
                };
                sessionStorage.setItem('pendingFile', JSON.stringify(fileData));
                window.location.href = editorPath;
            };
            reader.readAsDataURL(file);
        } else {
            // Unknown extension - go to generic editor or show message
            const i18n = (window as any).i18n;
            const message = i18n?.unknownFile || `File type "${ext}" is not recognized. Please choose an editor manually.`;
            // Simple string replacement if the localized string contains {ext}
            // Be safe with replace
            alert(message.replace('{ext}', ext));
        }
    };

    // File input change handler
    fileInput.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
            handleFile(target.files[0]);
        }
    });

    // Drag and drop handlers
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('border-primary-400', 'bg-white/10');
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('border-primary-400', 'bg-white/10');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('border-primary-400', 'bg-white/10');
        const files = (e as DragEvent).dataTransfer?.files;
        if (files && files[0]) {
            handleFile(files[0]);
        }
    });
};

// Initialize
initCounters();
initFileUpload();
