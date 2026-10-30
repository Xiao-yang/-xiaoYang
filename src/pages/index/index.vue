<template>
	<view class="page">
		<!-- 顶部：品牌 + 搜索入口（吸顶） -->
		<view class="header" :style="{ paddingTop: headerPaddingTop + 'px' }">
			<view class="brand">
				<image class="brand__logo" src="/static/logo.png" mode="aspectFit" />
				<view class="brand__text">
					<text class="brand__name">小羊快取</text>
					<text class="brand__slogan">现做现取，美味不用等</text>
				</view>
			</view>

			<view class="search" @click="goSearch">
				<up-icon name="search" size="18" color="#8a8f86" />
				<text class="search__placeholder">搜索摊位 / 商品</text>
			</view>
		</view>

		<!-- 筛选栏 + 摊位列表（首页默认只展示 10 公里内，筛选栏吸顶） -->
		<xy-shop-list ref="shopListRef" :default-max-distance="10000" :sticky-top="stickyTop" />
	</view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onReachBottom } from '@dcloudio/uni-app'

/** 列表组件实例，用于触发上拉加载 */
const shopListRef = ref<{ loadMore: () => void } | null>(null)

/** 首页使用自定义导航栏（无原生标题），需要自行预留状态栏高度 */
const systemInfo = uni.getSystemInfoSync()
const statusBarHeight = systemInfo.statusBarHeight || 0
/** 1rpx 对应的 px，用于与样式中的 rpx 高度对齐 */
const rpxRatio = systemInfo.windowWidth / 750
/** 顶部品牌区高度：状态栏 + 24rpx 上内边距 + logo + 搜索框等，合计 240rpx */
const HEADER_RPX_HEIGHT = 240
const headerPaddingTop = statusBarHeight + 24 * rpxRatio
const stickyTop = statusBarHeight + HEADER_RPX_HEIGHT * rpxRatio

const goSearch = () => {
	uni.navigateTo({ url: '/pages-customer/search/search' })
}

onReachBottom(() => {
	shopListRef.value?.loadMore()
})
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding-bottom: 24rpx;
	background-color: #f5f5f5;
	box-sizing: border-box;
}

.header {
	position: sticky;
	top: 0;
	z-index: 20;
	padding: 0 24rpx 20rpx;
	background-color: #b8d98e;
	border-radius: 0 0 24rpx 24rpx;
}

.brand {
	display: flex;
	align-items: center;
}

.brand__logo {
	width: 96rpx;
	height: 96rpx;
	border-radius: 20rpx;
}

.brand__text {
	display: flex;
	flex-direction: column;
	margin-left: 20rpx;
}

.brand__name {
	font-size: 40rpx;
	font-weight: bold;
	color: #2f3d1f;
	letter-spacing: 2rpx;
}

.brand__slogan {
	margin-top: 6rpx;
	font-size: 22rpx;
	color: #55663a;
}

.search {
	display: flex;
	align-items: center;
	margin-top: 24rpx;
	padding: 0 24rpx;
	height: 76rpx;
	background-color: #ffffff;
	border-radius: 38rpx;
}

.search__placeholder {
	margin-left: 12rpx;
	font-size: 26rpx;
	color: #999999;
}
</style>
