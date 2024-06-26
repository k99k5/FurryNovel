import {createApp} from './main.js';
import {renderToString} from 'vue/server-renderer';
import {renderSSRHead} from '@unhead/ssr'
import devalue from "@nuxt/devalue";
import {parse} from 'cookie';

import {useServerSideRenderStore} from "@/stores/ssr.js";

import template from './../dist/client/index.html?raw';
import manifest from './../dist/client/.vite/ssr-manifest.json?raw';
import {
    initCloudflareEnv as _initCloudflareEnv,
    useCloudflareEnv as _useCloudflareEnv
} from "@/utils/cloudflare-env.js";
import {getFallbackLocale, supportedLocales, useI18n} from "@/i18n/index.js";
import parser from 'accept-language-parser';

export async function render(url, manifest = {}, request = {cookies: {}}) {
    const {app, router, head, pinia} = await createApp();
    const ssrStore = useServerSideRenderStore(pinia);
    // noinspection ES6MissingAwait
    router.push(url);
    await router.isReady();
    const {locale} = useI18n(router);
    const ctx = {
        ...request,
        pinia,
    };
    const html = await renderToString(app, ctx);
    const preloadLinks = renderPreloadLinks(ctx.modules, manifest);
    const {headTags} = await renderSSRHead(head);
    return {html, preloadLinks, headTags, state: devalue(ssrStore.$state), locale: locale()};
}

function renderPreloadLinks(modules, manifest) {
    let links = '';
    const seen = new Set();
    modules.forEach((id) => {
        const files = manifest[id] ?? null;
        if (files) {
            files.forEach((file) => {
                if (!seen.has(file)) {
                    seen.add(file);
                    const filename = new URL(file, 'http://localhost').pathname;
                    if (manifest[filename] ?? null) {
                        for (const depFile of manifest[filename]) {
                            links += renderPreloadLink(depFile);
                            seen.add(depFile);
                        }
                    }
                    links += renderPreloadLink(file);
                }
            });
        }
    })
    return links;
}

function renderPreloadLink(file) {
    if (file.endsWith('.js')) {
        return `<link rel="modulepreload" crossorigin href="${file}">`;
    } else if (file.endsWith('.css')) {
        return `<link rel="stylesheet" href="${file}">`;
    } else if (file.endsWith('.woff')) {
        return ` <link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`;
    } else if (file.endsWith('.woff2')) {
        return ` <link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`;
    } else if (file.endsWith('.gif')) {
        return ` <link rel="preload" href="${file}" as="image" type="image/gif">`;
    } else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
        return ` <link rel="preload" href="${file}" as="image" type="image/jpeg">`;
    } else if (file.endsWith('.png')) {
        return ` <link rel="preload" href="${file}" as="image" type="image/png">`;
    } else {
        return '';
    }
}

/**
 * @param request{Request}
 * @param env{Env}
 * @returns {Promise<*>}
 */
export async function handleRequest(request, env = null) {
    try {
        const url = new URL(request.url);
        let locales = Object.keys(supportedLocales).filter((locale) => {
            return url.pathname.startsWith(`/${locale}`);
        });
        if (locales.length === 0) {
            let languages = request.headers.has('Accept-Language') ? request.headers.get('Accept-Language') : null;
            locales = parser.parse(languages).map((locale) => locale.code).filter(code => {
                return supportedLocales.hasOwnProperty(code);
            });
            if (locales.length === 0) {
                locales.push(getFallbackLocale());
            }
            return new Response(null, {
                status: 307,
                headers: {
                    'Location': `/${locales[0]}${url.pathname}${url.search}`,
                }
            });
        }
        const renderRes = await render(`${url.pathname}${url.search}`, manifest, {
            cookies: parse(request.headers.get('cookie') || ''),
            env: env,
            headers: request.headers,
        });
        return new Response(
            template
                .replace(`lang="zh"`, `lang="${renderRes.locale}"`)
                .replace(`<!--app-html-->`, renderRes.html)
                .replace(`<!--preload-links-->`, renderRes.preloadLinks)
                .replace(`<!--head-tags-->`, renderRes.headTags)
                .replace(`null;//'<!--ssr-state-->'`, renderRes.state),
            {
                status: renderRes.html.indexOf('404 -') === -1 ? 200 : 404,
                headers: {
                    'Content-Type': 'text/html',
                }
            }
        );
    } catch (e) {
        if (request.url.indexOf('debug') !== -1) {
            return new Response(e.stack, {status: 500});
        }
        return new Response(
            template,
            {
                status: 200,
                headers: {
                    'Content-Type': 'text/html',
                }
            }
        );
    }
}

export const initCloudflareEnv = _initCloudflareEnv;
export const useCloudflareEnv = _useCloudflareEnv;
