<template>
	<view class="page">
		<view class="search-bar">
			<up-search
				v-model="keyword"
				placeholder="搜索摊位 / 商品"
				:show-action="true"
				action-text="取消"
				:focus="true"
				bg-color="#f5f5f5"
				search-icon-color="#8bc34a"
				@search="handleSearch"
				@clear="handleSearch"
				@custom="goBack"
			/>
		</view>

		<xy-shop-list ref="shopListRef" :default-max-distance="10000" :keyword="keyword" :sticky-top="stickyTop" />
	</view>
</template>

<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import { onReady, onReachBottom } from '@dcloudio/uni-app'

const keyword = ref('')
/** 列表组件实例，用于触发上拉加载 */
const shopListRef = ref<{ loadMore: () => void } | null>(null)
/** 搜索框高度（px），筛选栏吸顶时需避开搜索框，避免被覆盖 */
const stickyTop = ref(0)
const instance = getCurrentInstance()

onReady(() => {
	uni.createSelectorQuery()
		.in(instance?.proxy)
		.select('.search-bar')
		.boundingClientRect((rect) => {
			if (rect) stickyTop.value = rect.height || 0
		})
		.exec()
})

const handleSearch = () => {
	// 列表组件已监听 keyword 变化，这里主动收起键盘即可
	uni.hideKeyboard()
}

const goBack = () => {
	uni.navigateBack()
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

.search-bar {
	position: sticky;
	top: 0;
	z-index: 20;
	padding: 20rpx 24rpx;
	background-color: #ffffff;
}
</style>
