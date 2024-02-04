import {useHead} from "@unhead/vue";
import config from "@/config.js";
import iconUrl from '/static/icon.png?url';

const data = reactive({
    route: null,
    
    title: null,
    keywords: null,
    description: null,
    image: null,
    url: null,
});

export function initRouter(router) {
    data.route = router.currentRoute.value;
    router.afterEach((to) => {
        data.route = to;
    });
    useHead({
        title: computed(() => {
            return data.title;
        }),
        meta: computed(() => {
            return [
                {
                    name: 'description',
                    content: data.description,
                },
                {
                    name: 'keywords',
                    content: data.keywords,
                },
                {
                    name: 'og:title',
                    content: data.title,
                },
                {
                    name: 'og:description',
                    content: data.description,
                },
                {
                    name: 'og:image',
                    content: data.image,
                },
                {
                    name: 'og:url',
                    content: data.url
                },
            ];
        }),
    });
    useMeta(computed(() => {
        return {
            title: config.title,
            keywords: '兽人控,兽人小说,兽人漫画,兽人同人,兽人文学',
            description: '兽人控小说站是一个专为兽人控打造的聚合在线阅读平台。在这里，你可以找到各种平台各种兽人相关的小说，从兽人与人类的爱恨情仇，到兽人之间的种族斗争，从兽人的历史文化，到兽人的奇幻冒险，应有尽有。你可以随时随地享受阅读的乐趣，无需下载或安装任何软件。还可以自由切换翻译，选择你喜欢的阅读模式。',
            image: iconUrl,
            ...data.route?.meta,
        };
    }));
}

export function useMeta( params) {
    watchEffect(() => {
        data.title = params.value.title;
        data.keywords = params.value.keywords;
        data.description = params.value.description;
        data.image = params.value.image ? params.value.image : iconUrl;
        data.url = params.value.url ? params.value.url : `${config.base}${data.route?.path || ''}`;
    });
}