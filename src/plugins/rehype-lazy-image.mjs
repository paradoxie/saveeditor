import { visit } from 'unist-util-visit';

/**
 * Rehype plugin to add loading="lazy" to all img tags
 */
export function rehypeLazyLoadImages() {
    return (tree) => {
        visit(tree, 'element', (node) => {
            if (node.tagName === 'img') {
                node.properties = node.properties || {};
                node.properties.loading = 'lazy';
                node.properties.decoding = 'async'; // Good practice for off-screen images
            }
        });
    };
}
