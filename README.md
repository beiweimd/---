# ciga

一个用 `uni-app` 复现的烟草环境监测示例项目，对接 OneNET 设备数据，提供页面展示、状态轮询和阈值下发能力。

## 功能

- 3 秒轮询一次设备数据
- 展示温度、湿度、CO2、含水量、风速
- 展示 LED、蜂鸣器、加湿、除湿、加热模块状态
- 支持温度、湿度、CO2、含水量上下限阈值下发
- 支持 H5 调试和 `app-plus` 构建

## 目录

- `src/pages/index/index.vue`: 主界面
- `src/composables/useDeviceController.ts`: 设备轮询和下发逻辑
- `src/manifest.json`: uni-app 应用配置

## 本地运行

```powershell
npm install
npm run dev:h5
```

## 构建

```powershell
npm run build:h5
npm run build:app-plus
```

## 说明

- Android 打包证书和本地产物未纳入仓库。
- 当前接口配置写在 `src/composables/useDeviceController.ts` 中。
