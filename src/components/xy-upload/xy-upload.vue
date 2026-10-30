<template>
	<view class="xy-upload">
		<up-upload
			:fileList="fileList"
			:maxCount="maxCount"
			:maxSize="maxSize"
			:disabled="disabled"
			:deletable="deletable"
			:uploadIcon="uploadIcon"
			:uploadText="uploadText"
			:width="width"
			:height="height"
			@afterRead="handleAfterRead"
			@delete="handleDelete"
		/>
		<view v-if="tip" class="xy-upload__tip">{{ tip }}</view>
	</view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { BASE_URL } from '@/utils/request'
import { useUserStore } from '@/store/user'

/** u-upload 内部的文件项结构 */
interface UploadFileItem {
	url?: string
	thumb?: string
	status?: 'uploading' | 'success' | 'failed'
	message?: string
	progress?: number
	[key: string]: any
}

const props = withDefaults(
	defineProps<{
		/** 已上传图片地址列表，支持 v-model */
		modelValue?: string[]
		/** 最大上传数量 */
		maxCount?: number | string
		/** 单张图片大小上限，单位 byte，默认 5M */
		maxSize?: number
		/** 是否禁用 */
		disabled?: boolean
		/** 是否允许删除 */
		deletable?: boolean
		/** 上传区域的图标名 */
		uploadIcon?: string
		/** 上传区域的提示文字 */
		uploadText?: string
		/** 每张图片的宽高（rpx） */
		width?: number | string
		height?: number | string
		/** 上传接口地址；为空时不上传，只返回本地临时路径 */
		action?: string
		/** 上传接口的文件字段名 */
		name?: string
		/** 上传接口附加的 header */
		header?: Record<string, string>
		/** 底部提示文字 */
		tip?: string
	}>(),
	{
		modelValue: () => [],
		maxCount: 1,
		maxSize: 10 * 1024 * 1024,
		disabled: false,
		deletable: true,
		uploadIcon: 'camera-fill',
		uploadText: '',
		width: '150rpx',
		height: '150rpx',
		action: '/upload/images',
		name: 'files',
		header: () => ({}),
		tip: ''
	}
)

const emit = defineEmits<{
	(e: 'update:modelValue', urls: string[]): void
	(e: 'change', urls: string[]): void
}>()

const userStore = useUserStore()

/** 内部文件列表，交给 u-upload 展示 */
const fileList = ref<UploadFileItem[]>(
	props.modelValue.map((url) => ({ url, status: 'success' as const }))
)

/** 父组件异步回填（如编辑页加载详情）时，同步到内部列表 */
watch(
	() => props.modelValue,
	(urls) => {
		const current = fileList.value
			.map((item) => item.url)
			.filter((url): url is string => !!url)
		const next = urls || []
		const same =
			current.length === next.length && current.every((url, index) => url === next[index])
		if (same) return
		fileList.value = next.map((url) => ({ url, status: 'success' as const }))
	},
	{ deep: true }
)

/** 把上传成功的图片地址同步给父组件 */
const syncModel = () => {
	const urls = fileList.value
		.filter((item) => item.status !== 'uploading' && item.status !== 'failed')
		.map((item) => item.url as string)
		.filter(Boolean)
	emit('update:modelValue', urls)
	emit('change', urls)
}

/** 上传单张图片，返回服务端图片地址 */
const uploadImage = (filePath: string) => {
	return new Promise<string>((resolve, reject) => {
		uni.uploadFile({
			url: /^https?:\/\//.test(props.action) ? props.action : BASE_URL + props.action,
			filePath,
			name: props.name,
			header: {
				...(userStore.token ? { Authorization: `Bearer ${userStore.token}` } : {}),
				...props.header
			},
			success: (res) => {
				try {
					const result = JSON.parse(res.data)
					if (result.code === 0) {
						resolve(result.data?.urls?.[0] || result.data)
					} else {
						reject(new Error(result.message || '图片上传失败'))
					}
				} catch (err) {
					reject(new Error('图片上传失败'))
				}
			},
			fail: () => reject(new Error('图片上传失败'))
		})
	})
}

/** 选择图片后：加入列表，配置了 action 时再上传 */
const handleAfterRead = async (event: { file: UploadFileItem | UploadFileItem[] }) => {
	const files = Array.isArray(event.file) ? event.file : [event.file]
	for (const file of files) {
		const index = fileList.value.push({ ...file, status: props.action ? 'uploading' : 'success' }) - 1
		if (!props.action) continue
		try {
			const url = await uploadImage(file.url as string)
			fileList.value[index] = { ...file, url, status: 'success' }
		} catch (err) {
			fileList.value[index] = { ...file, status: 'failed', message: (err as Error).message }
			uni.showToast({ title: (err as Error).message, icon: 'none' })
		}
	}
	syncModel()
}

/** 删除图片 */
const handleDelete = (event: { index: number }) => {
	fileList.value.splice(event.index, 1)
	syncModel()
}
</script>

<style lang="scss" scoped>
.xy-upload__tip {
	font-size: 24rpx;
	color: #999999;
	margin-top: 12rpx;
}
</style>
