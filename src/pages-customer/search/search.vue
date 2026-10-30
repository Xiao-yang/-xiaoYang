<template>
	<view class="page">
		<view class="search-bar">
			<up-search
				v-model="searchInput"
				placeholder="搜索摊位 / 商品"
				:show-action="true"
				action-text="搜索"
				bg-color="#ffffff"
				search-icon-color="#8bc34a"
				@search="handleSearch"
				@custom="handleSearch"
				@clear="handleClear"
			/>
		</view>

		<!-- 搜索历史：仅在无搜索词且有历史时展示 -->
		<view v-if="!searchKeyword && history.length" class="history">
			<view class="history__head">
				<text class="history__title">搜索历史</text>
				<view class="history__clear" @click="clearHistory">
					<up-icon name="trash" size="16" color="#999999" />
				</view>
			</view>
			<view class="history__tags">
				<view
					v-for="(item, index) in history"
					:key="index"
					class="history__tag"
					@click="searchByHistory(item)"
				>
					{{ item }}
				</view>
			</view>
		</view>

		<!-- 搜索结果：仅在用户搜索后展示，与搜索历史互斥 -->
		<xy-shop-list
			v-if="searchKeyword"
			ref="shopListRef"
			:default-max-distance="10000"
			:keyword="searchKeyword"
			:sticky-top="stickyTop"
		/>
	</view>
</template>

<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import { onReady, onReachBottom } from '@dcloudio/uni-app'

/** 搜索框输入值（实时绑定，不触发搜索） */
const searchInput = ref('')
/** 实际用于搜索的关键词，仅在用户点击搜索时更新 */
const searchKeyword = ref('')
/** 列表组件实例，用于触发上拉加载 */
const shopListRef = ref<{ loadMore: () => void } | null>(null)
/** 搜索框高度（px），筛选栏吸顶时需避开搜索框 */
const stickyTop = ref(0)
const instance = getCurrentInstance()

/** 搜索历史本地存储 key */
const HISTORY_KEY = 'searchHistory'
const MAX_HISTORY = 10

/** 读取搜索历史 */
const loadHistory = (): string[] => {
	try {
		const data = uni.getStorageSync(HISTORY_KEY)
		return Array.isArray(data) ? data : []
	} catch (e) {
		return []
	}
}
const history = ref<string[]>(loadHistory())

/** 保存搜索历史：去重 + 最新前置 + 最多 10 条 */
const saveHistory = (keyword: string) => {
	const kw = keyword.trim()
	if (!kw) return
	const next = [kw, ...history.value.filter((h) => h !== kw)].slice(0, MAX_HISTORY)
	history.value = next
	uni.setStorageSync(HISTORY_KEY, next)
}

/** 清空搜索历史 */
const clearHistory = () => {
	history.value = []
	uni.removeStorageSync(HISTORY_KEY)
}

onReady(() => {
	uni.createSelectorQuery()
		.in(instance?.proxy)
		.select('.search-bar')
		.boundingClientRect((rect) => {
			if (rect && !Array.isArray(rect) && rect.height) {
				stickyTop.value = rect.height
			}
		})
		.exec()
})

/** 点击搜索 / 回车搜索：更新关键词触发列表加载，并记录历史 */
const handleSearch = () => {
	const kw = searchInput.value.trim()
	searchKeyword.value = kw
	if (kw) saveHistory(kw)
	uni.hideKeyboard()
}

/** 点击历史标签直接搜索 */
const searchByHistory = (kw: string) => {
	searchInput.value = kw
	handleSearch()
}

/** 清空输入：同时清空搜索结果 */
const handleClear = () => {
	searchInput.value = ''
	searchKeyword.value = ''
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
	background-color: #b8d98e;
}

.history {
	margin: 0 14rpx 16rpx;
	padding: 24rpx;
	border-radius: 16rpx;
}

.history__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.history__title {
	font-size: 28rpx;
	font-weight: bold;
	color: #333333;
}

.history__clear {
	padding: 8rpx;
}

.history__tags {
	display: flex;
	flex-wrap: wrap;
	margin-top: 20rpx;
}

.history__tag {
	margin-right: 16rpx;
	margin-bottom: 16rpx;
	padding: 12rpx 24rpx;
	font-size: 24rpx;
	color: #666666;
	background-color: #fff;
	border-radius: 24rpx;
}
</style>
