<template>
	<view v-if="status !== 'idle'" class="xy-loading" @click="handleClick">
		<up-loading-icon v-if="status === 'loading'" mode="circle" size="16" color="#b8d98e" />
		<view v-if="status === 'noMore'" class="xy-loading__line" />
		<text class="xy-loading__text">{{ text }}</text>
		<view v-if="status === 'noMore'" class="xy-loading__line" />
	</view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * 上拉加载状态：loading 加载中 / more 上拉加载更多 / noMore 没有更多了 / idle 不展示
 */
type XyLoadingStatus = 'loading' | 'more' | 'noMore' | 'idle'

const props = withDefaults(
	defineProps<{
		status?: XyLoadingStatus
		loadingText?: string
		moreText?: string
		noMoreText?: string
	}>(),
	{
		status: 'more',
		loadingText: '加载中...',
		moreText: '上拉加载更多',
		noMoreText: '没有更多了'
	}
)

const emit = defineEmits<{
	(e: 'click'): void
}>()

const text = computed(() => {
	if (props.status === 'loading') return props.loadingText
	if (props.status === 'noMore') return props.noMoreText
	return props.moreText
})

/** 点击「上拉加载更多」时通知父组件加载下一页 */
const handleClick = () => {
	if (props.status === 'more') emit('click')
}
</script>

<style lang="scss" scoped>
.xy-loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 32rpx 0;

	&__text {
		font-size: 24rpx;
		color: #999999;
		margin-left: 12rpx;
	}

	&__line {
		width: 80rpx;
		height: 1rpx;
		background-color: #dddddd;
		margin: 0 24rpx;
	}
}
</style>
