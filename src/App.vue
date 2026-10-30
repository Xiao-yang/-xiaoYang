<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { useShopCartStore } from "@/store/shopCart";
onLaunch(() => {
  console.log("App Launch");
  // 小程序启动时清空所有店铺购物车（关闭小程序后重新打开需清空）
  useShopCartStore().clearAll();
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>
<style lang="scss">
/* uview-plus 基础样式，必须放在首行 */
@import 'uview-plus/index.scss';
</style>
