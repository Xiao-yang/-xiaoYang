<template>
	<image
		v-if="src"
		class="xy-image"
		:style="{borderRadius: borderRadius}"
		:src="src"
		:mode="mode"
	/>
	<view v-else class="xy-image xy-image--empty" :style="emptyStyle">
		<up-icon name="info-circle-fill" size="28" color="#fff" />
	</view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
	defineProps<{
		/** 图片地址，为空时展示默认占位 */
		src?: string | null
		/** 图片裁剪模式，同 uni-app image 的 mode */
		mode?: 'aspectFit' | 'aspectFill' | 'widthFix' | 'heightFix' | 'top' | 'bottom' | 'center' | 'left' | 'right'
		/** 占位文案 */
		/** 占位背景色 */
		bgColor?: string,
		borderRadius?: string
	}>(),
	{
		src: '',
		mode: 'aspectFill',
		bgColor: '#f0f2eb',
		borderRadius: '10rpx'
	}
)

const emptyStyle = computed(() => ({
	backgroundColor: props.bgColor,
	borderRadius: props.borderRadius
}))
</script>

<style lang="scss" scoped>
.xy-image {
	width: 100%;
	height: 100%;
	display: block;

	&--empty {
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
	}

	&__text {
		font-size: 22rpx;
		color: #9aa093;
	}
}
</style>
