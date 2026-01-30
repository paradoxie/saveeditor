---
name: i18n-workflow
description: Standard operating procedure for adding new languages or updating translations in the Save Editor project.
---

# i18n Workflow

This skill guides you through the process of adding a new language (`<lang_code>`) to the Save Editor Online project.

## ⚡ Quick Start (Automation)

Use the bundled script to scaffold the necessary files and directories.

```bash
# Usage: node .agent/skills/i18n-workflow/scripts/scaffold_language.js <code: string> <name: string>
node .agent/skills/i18n-workflow/scripts/scaffold_language.js es Español
```

This script will:
1.  Create `src/pages/<lang_code>/` and copy `index.astro`.
2.  Update `getStaticPaths` in `games.astro` and `formats.astro`.
3.  Attempt to update `src/i18n/ui.ts` (check manually).

---

## 🛠️ Manual Configuration & Verification

### 1. Configure Translations (`src/i18n/ui.ts`)

1.  **Register Language**: Ensure `languages` object configured at the top of the file includes your new code.
    ```typescript
    export const languages = {
        // ...
        es: 'Español',
    };
    ```
2.  **Add Translation Keys**: Add a new block to `ui` object.
    *   **Tip**: Copy the `en` block and replacing values.
    *   *Warning*: Ensure no keys are missing, otherwise TypeScript may complain or specific UI elements will blank out.

### 2. Verify Dynamic Routes

Check `src/pages/[lang]/games.astro` and `src/pages/[lang]/formats.astro`. Ensure `getStaticPaths` includes your new language:

```typescript
export function getStaticPaths() {
  return [
    // ...
    { params: { lang: 'es' } },
  ];
}
```

### 3. Update Infrastructure (CRITICAL)

**Do not skip these steps. They are essential for SEO and Routing.**

1.  **Astro Config (`astro.config.mjs`)**:
    *   Add the new language code to the `i18n.locales` array.

2.  **Base Layout (`src/layouts/BaseLayout.astro`)**:
    *   Update the `locales` array in the `<head>` section for Hreflang tags.
    *   Update the `basePath` REGEX to strip the new language prefix correctly.
    ```javascript
    const locales = ['en', 'ja', 'ko', 'pt', 'zh-cn', 'es']; // Add here
    const basePath = Astro.url.pathname.replace(/^\/(ja|ko|pt|zh-cn|es)/, ''); // Update Regex
    ```

3.  **Robots.txt (`public/robots.txt`)**:
    *   Add an `Allow: /<lang_code>/` directive if your robots.txt whitelists specific language paths.

### 4. Deep Content Alignment Audit (MANDATORY)

**You must check these common "hardcoding" pitfalls to ensure full localization.**

1.  **Check `games.astro` & `formats.astro`**:
    *   Look for hardcoded `keywords` props in `<BaseLayout>`. They MUST be replaced with `t('gamesPage.seoKeywords')`.
    *   Look for hardcoded lists (e.g., "How to find save files"). Ensure they use `t()` keys.

2.  **Check Date Formatting**:
    *   In `HomeTemplate.astro` (or blog layouts), ensure `toLocaleDateString` uses the dynamic `lang` variable, NOT a hardcoded 'en-US' callback.
    *   *Bad*: `lang === 'zh-cn' ? 'zh-CN' : 'en-US'`
    *   *Good*: `lang`

3.  **Check Navigation Links**:
    *   Audit `Header.astro` and `Footer.astro`.
    *   Ensure links like `/games` or `/about` are not hardcoded. They must be dynamic: `/${lang === 'en' ? '' : lang + '/'}games`.

### 5. Localize Static Pages

1.  **Edit `src/pages/<lang_code>/*.astro`**:
    *   **Home**: Translate `index.astro` (Hero, Benefits, How-to).
    *   **Legal**: Ensure `privacy.astro`, `terms.astro`, `cookie-policy.astro` exist and are translated.
    *   **Info**: Ensure `about.astro`, `contact.astro`, `faq.astro` exist and are translated.
    *   **Blog**: Ensure `blog/index.astro` exists and handles fallbacks.

### 6. Localize Blog Content (Content Collections)

1.  **Create Directory**: Create `src/content/blog/<lang_code>/`.
2.  **Copy Posts**: Copy all English markdown files from `src/content/blog/` to your new folder.
3.  **Translate Frontmatter**: Update `title` and `description` in the markdown frontmatter.
4.  **Translate Content**: Translate the body of the articles.
    *   **CRITICAL**: Maintain full content fidelity. DO NOT summarize, condense, or skip sections. Translate every paragraph, code block explanation, and FAQ item. The localized version must be a 1:1 reflection of the English original.
    *   *Note*: The blog index `src/pages/<lang_code>/blog/index.astro` is configured to show English posts as a fallback if no localized posts exist. Once you create files in `src/content/blog/<lang_code>/`, they will take precedence.

### 7. Final Verification

1.  Start dev server: `npm run dev`
2.  **Check Home**: `http://localhost:4321/<lang_code>/`
3.  **Check Dynamic Lists**: `http://localhost:4321/<lang_code>/games` (Ensure meta keywords are localized).
4.  **Check Blog**: `http://localhost:4321/<lang_code>/blog` (Should show localized posts or English fallback).
5.  **Check Source Code**: Verify `<link rel="alternate" hreflang="...">` tags include the new language.

## Rationale
This workflow ensures consistent routing, SEO structure, and deep content localization. Missing the Infrastructure or Deep Audit steps will result in orphaned pages, poor SEO rankings for localized content, and broken navigation for non-English users.
