# OCR DNS 解析问题完整记录

## 错误信息

```
getaddrinfo ENOTFOUND ocr.cn-hangzhou.aliyuncs.com
POST https://ocr.cn-hangzhou.aliyuncs.com/ failed.
```

### 错误含义

| 单词 | 含义 |
|------|------|
| `getaddrinfo` | DNS 查询函数，用于将域名解析为 IP 地址 |
| `ENOTFOUND` | "Error: Not Found" - 找不到该主机/域名 |
| `ocr.cn-hangzhou.aliyuncs.com` | 阿里云 OCR 服务器域名（杭州地域） |
| `POST ... failed` | HTTP 请求失败 |

**整句意思：** DNS 无法解析阿里云 OCR 的域名，导致 POST 请求失败。

---

## 根本原因

**系统代理配置导致所有网络请求走代理，国内域名无法通过代理解析。**

你的 macOS 系统配置了全局代理：
- `ALL_PROXY=socks5://127.0.0.1:7890`（Clash/Shadowrocket 默认端口）

当开启代理后，所有 DNS 查询都会被转发到代理服务器，而代理服务器无法解析中国国内的阿里云域名。

---

## 每次解决的经过

### 第 1 次解决

**操作：** 修改 endpoint 格式

```typescript
// 之前（错误）
const endpoints = [
  'https://ocr-api.cn-shanghai.aliyuncs.com',  // ❌ 多了 -api 后缀
  'https://ocr-api.cn-hangzhou.aliyuncs.com',  // ❌ 多了 -api 后缀
];

// 之后（正确）
const endpoints = [
  'https://ocr.cn-shanghai.aliyuncs.com',
  'https://ocr.cn-hangzhou.aliyuncs.com',
];
```

**为什么又失效了：** 只是修正了 endpoint 格式，但代理还在运行，DNS 仍然无法解析。

---

### 第 2 次解决

**操作：** 去掉 https://前缀

```typescript
const endpoints = [
  'ocr.cn-shanghai.aliyuncs.com',  // 没有协议头
  'ocr.cn-hangzhou.aliyuncs.com',
];
```

**为什么又失效了：** PopCore SDK 要求 endpoint 必须有 `http://` 或 `https://` 前缀，报错：
```
"config.endpoint" must starts with 'https://' or 'http://'.
```

---

### 第 3 次解决

**操作：** 加回 https://前缀 + 清除环境变量

```bash
unset ALL_PROXY http_proxy HTTPS_PROXY https_proxy
npm run dev
```

**为什么又失效了：**
1. 环境变量在终端关闭后就恢复了
2. 更关键的是：**代理软件本身还在后台运行**，系统级代理设置没有关闭

---

### 第 4 次解决

**操作：** 重启电脑

**效果：** ✅ 临时解决（前提是不要打开代理软件）

**为什么可能再次失效：** 如果重启后打开了 Clash/Shadowrocket 等代理软件，问题会再次出现。

---

## 最终解决方案

### 方案 1：完全关闭代理软件（推荐）

1. **退出代理软件** - 在菜单栏找到 Clash/Shadowrocket/Surge 等图标，右键选择 Quit/Exit
2. **检查系统代理设置**：
   ```bash
   # 关闭所有网络服务的代理
   for service in $(networksetup -listnetworkservices | tail -n +2); do
     networksetup -setwebproxystate "$service" off
     networksetup -setsecurewebproxystate "$service" off
     networksetup -setsocksfirewallproxystate "$service" off
   done
   ```

### 方案 2：设置 NO_PROXY 白名单

在 `.env.local` 或启动脚本中添加：

```bash
export NO_PROXY="*.aliyuncs.com,localhost,127.0.0.1"
export NODE_OPTIONS="--no-warnings"
```

然后在代码中配置 PopCore 跳过代理：

```typescript
const client = new PopCore.RPCClient({
  accessKeyId,
  accessKeySecret,
  endpoint: endpoint,
  apiVersion: apiVersion,
  signAlgorithm: 'sha256',
  opts: {
    timeout: 30000,
    // 绕过代理
    skipRegionEndpointCheck: true,
  }
});
```

### 方案 3：使用其他地域的 endpoint

如果上海/杭州的域名始终无法解析，可以尝试其他地域：

```typescript
const endpoints = [
  'https://ocr.cn-beijing.aliyuncs.com',      // 北京
  'https://ocr.cn-shenzhen.aliyuncs.com',     // 深圳
  'https://ocr.cn-guangzhou.aliyuncs.com',    // 广州
];
```

---

## 如何判断问题是否解决

运行以下命令测试 DNS 解析：

```bash
node -e "
const dns = require('dns').promises;
dns.resolve('ocr.cn-hangzhou.aliyuncs.com')
  .then(ip => console.log('✅ DNS OK:', ip))
  .catch(e => console.log('❌ DNS FAILED:', e.message));
"
```

如果显示 `✅ DNS OK:` 后面有 IP 地址，说明问题已解决。

---

## 总结

| 次数 | 解决方法 | 为什么失效 |
|------|----------|------------|
| 1 | 修正 endpoint 格式 | 代理还在，DNS 无法解析 |
| 2 | 去掉 https:// | SDK 要求必须有协议头 |
| 3 | 加回 https:// + 清环境变量 | 环境变量临时，代理进程仍在 |
| 4 | 重启电脑 | 临时解决，开代理后会复发 |

**核心问题：** 系统级代理配置未关闭

**最终解决：** 彻底退出代理软件 + 关闭系统代理设置

---

## 后续预防

1. **开发时注意：** 调用国内服务（阿里云、腾讯云等）时不要开代理
2. **使用白名单模式：** 配置代理软件的「直连」模式，让 *.aliyuncs.com 走直连
3. **添加检测代码：** 在 OCR API 开头添加代理检测，提前发现问题

```typescript
// 在 callAliyunOCR 函数开头添加
const httpProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (httpProxy) {
  console.warn('⚠️ 检测到代理配置，可能导致国内服务无法访问');
  console.warn('请关闭代理或设置 NO_PROXY="*.aliyuncs.com"');
}
```
