<template>
	<Main>
		<router-view v-slot="{ Component, route }">
			<keep-alive v-if="keep" :max="10" :exclude="['info']">
				<component :is="Component" :key="route.fullPath"/>
			</keep-alive>
			<component :is="Component" v-else/>
		</router-view>
	</Main>
</template>

<style>

</style>
<script setup>
import {initDeviceEvent} from "@/utils/device.js";
import {initMeta} from "@/utils/meta.js";
import {initCookieManager} from "@/utils/cookie.js";
import {initRouterEvent, onRouteChange} from "@/utils/router-event.js";
import {initThemeManager, onThemeChange} from "@/utils/theme.js";
import {initServiceWorker} from "@/pwa.js";
import eventbus from "@/utils/eventbus.js";
import {initThirdEvent} from "@/utils/third.js";

const keep = ref(true);
const router = useRouter();

initMeta(router);
initRouterEvent(router);
onBeforeMount(() => {
    initDeviceEvent();
    initCookieManager();
    initThemeManager();
    initServiceWorker();
    initThirdEvent();
});

onThemeChange(({theme}) => {
    if (!import.meta.env.SSR) {
        document.documentElement.classList = [theme]
    }
});

eventbus.on('onKeepAliveStatus', (status) => {
    keep.value = !!status;
});

router.afterEach((to, from) => {
    keep.value = true;
});
</script>
