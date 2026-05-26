import { beginIngestFlow } from '../lib/ingest';

// Animated counter for stats
const initCounters = () => {
    const counters = document.querySelectorAll('.counter');
    const animationDuration = 1500; // ms

    const animateCounter = (counter: Element) => {
        const target = parseInt(counter.getAttribute('data-target') || '0');
        const suffix = counter.getAttribute('data-suffix') || '';
        const startTime = performance.now();

        const updateCounter = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / animationDuration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(target * easeOutQuart);

            counter.textContent = current.toString() + suffix;

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

    counters.forEach((counter) => {
        const suffix = counter.getAttribute('data-suffix') || '';
        counter.textContent = `0${suffix}`;
        observer.observe(counter);
    });
};

// Smart File Upload Detection
const initFileUpload = () => {
    const fileInput = document.getElementById('smart-file-input') as HTMLInputElement;
    const uploadZone = document.getElementById('smart-upload-zone') as HTMLDivElement;

    if (!fileInput || !uploadZone) return;

    const currentLang = (window as any).currentLang;

    const setBusyState = (busy: boolean) => {
        uploadZone.classList.toggle('pointer-events-none', busy);
        uploadZone.classList.toggle('opacity-75', busy);
    };

    const handleFile = async (file: File) => {
        try {
            setBusyState(true);
            const { url } = await beginIngestFlow(file, {
                locale: currentLang,
                source: 'home',
            });
            window.location.assign(url);
        } catch (error) {
            console.error(error);
            const i18n = (window as any).i18n;
            const message =
                i18n?.unknownFile || 'We could not open this file right now. Please try choosing an editor manually.';
            alert(message);
        } finally {
            setBusyState(false);
        }
    };

    // File input change handler
    fileInput.addEventListener('change', async (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
            await handleFile(target.files[0]);
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

    uploadZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadZone.classList.remove('border-primary-400', 'bg-white/10');
        const files = (e as DragEvent).dataTransfer?.files;
        if (files && files[0]) {
            await handleFile(files[0]);
        }
    });
};

// Initialize
initCounters();
initFileUpload();
