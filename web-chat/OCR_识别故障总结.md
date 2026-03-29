# OCR 识别故障总结

## 背景

当前项目使用阿里云 OCR 服务，后端入口为 `app/api/ocr/recognize/route.ts`。
最近几次调试过程中遇到多次不同报错，最终定位到代码和阿里云服务开通/计费两个层面问题。

## 1. 第一次报错：`Specified api is not found`

### 现象

报错信息：

- `OCR识别失败：阿里云API调用失败: Specified api is not found, please check your url and method.`
- 请求 URL：`https://ocr.cn-shanghai.aliyuncs.com/`

### 为什么会这样

这个错误说明请求已经到达阿里云 OCR 服务端，但当前请求的接口动作、路径或调用方式与服务端不匹配。
当时判断逻辑是：

- 不是网络问题，因为服务端已返回明确错误
- 不是密钥问题，因为返回的是 API 找不到，而不是签名错误
- 最可能是“请求 action/路径写错”或“手动签名漏掉了某些规则”

### 处理与结果

- 将手动签名请求改成官方 `@alicloud/pop-core` SDK
- 取消手写 URL 和签名，使用 SDK 自动构造请求
- 重新确认 endpoint 及 apiVersion

这一步解决了“请求方式不标准”的问题，但还没有彻底进入成功调用阶段。

## 2. 第二次报错：`config.endpoint must starts with 'https://' or 'http://'`

### 现象

报错信息：

- `OCR识别失败："config.endpoint" must starts with 'https://' or 'http://'`

### 为什么会这样

这个错误直接说明 SDK 配置错误：

- `@alicloud/pop-core` 的 `endpoint` 必须带协议头

### 处理与结果

- 将 endpoint 从 `ocr.cn-shanghai.aliyuncs.com` 改为 `https://ocr.cn-shanghai.aliyuncs.com`

这一轮修复后，客户端已能正确初始化 SDK，并开始向阿里云发送有效请求。

## 3. 后续仍然报错：`Specified api is not found`

### 现象

依然出现：

- `OCR识别失败：Specified api is not found, please check your url and method., URL: https://ocr.cn-shanghai.aliyuncs.com/`

### 为什么会这样

此时说明请求格式已进一步正确，但仍然没有命中服务端的具体 OCR API。
可能原因包括：

- 使用了错误的 action 名称（例如 `RecognizeGeneralText` / `RecognizeGeneral` 不一定适用于当前服务）
- OCR API 的版本、RPC/ROA 调用方式与预期不一致

### 处理与结果

- 进一步改成 `RPCClient.request(...)` 方式调用
- 直接尝试 `RecognizeCharacter` / `RecognizeCharacterAdvanced`
- 增强失败日志，记录后端返回的 `code` 和 `message`

这一步目的是让请求真正到达服务，并获取更明确的错误类型。

## 4. 出现文件保存错误：`ENOENT`

### 现象

报错信息：

- `OCR识别失败：ENOENT: no such file or directory, open '/tmp/ocr_xxx.png'`

### 为什么会这样

这个错误说明后端文件保存环节有问题：

- 没有正确创建临时目录
- 或 `writeFile` 没有正确执行

### 处理与结果

- 修复 `saveUploadedFile` 函数
- 使用 `fs.promises.mkdir(..., { recursive: true })`
- 确保 `writeFile` 完成后再继续调用 OCR

这一步解决了文件 IO 的问题，使得图片上传与保存可以正常进行。

## 5. 最终结果：`Specified api is not purchased`

### 现象

报错信息：

- `OCR识别失败：Specified api is not purchased, open the link to purchase api: https://help.aliyun.com/document_detail/465341.html, URL: https://ocr.cn-shanghai.aliyuncs.com/`

### 为什么会这样

这个错误说明：

- 请求已经成功到达阿里云 OCR 服务端
- 当前账号已开通服务但没有可用资源或没有购买对应 API
- 不是代码调用逻辑问题，而是阿里云账户/计费层面问题

### 这个原因解决了吗

到现在为止，代码问题已经基本排查完了。当前的错误不再是“请求格式错”或“接口调用方式不对”，而是“服务资源不足/没有购买”。

## 当前这个情况

当前状态是：

- 后端代码已改为使用官方 SDK
- endpoint 已加上 `https://`
- OCR 请求已经能正确发送到 `ocr.cn-shanghai.aliyuncs.com`
- 最终返回的是 `InvalidApi.NotPurchase`

也就是说，当前问题已经从“代码错误”转化为“阿里云账户资源/计费问题”。

## 建议下一步

1. 进入阿里云 OCR 控制台
2. 检查当前服务是否真的有可用调用额度
3. 购买或补充 OCR 资源包
4. 确认当前账号是否已经开通并绑定了计费方式
5. 如果是特定 OCR 功能（例如高精度 OCR、票据识别等），确认是否需要单独购买

## 结论

- 第一次报错：因请求方式错误/action 不对，改为 SDK 调用后解决了
- 第二次报错：因 endpoint 配置缺少协议头，添加 `https://` 后解决
- 中间问题：因为文件保存逻辑有 bug，已修复
- 最终报错：因为阿里云账户资源不足或未购买对应 OCR API

当前最关键的不是继续改代码，而是先确认阿里云 OCR 服务的可用额度和资源包。
