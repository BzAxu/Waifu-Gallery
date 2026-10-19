# Waifu Gallery

一个二次元图片聚合画廊，汇集多个公开图片源，让你轻松浏览、预览和下载喜欢的动漫插画喵～ 🌸

## 🌐 在线体验

**体验地址：** https://waifu-gallery-bce.pages.dev/

如果图片暂时加载失败，可以在画廊设置中切换图片源，或稍后重试。图片源和网络环境可能影响加载情况。

## ✨ 功能

- 🖼️ **多图片源聚合**：从多个公开图片源获取二次元图片。
- 🔍 **图片预览**：点击图片即可查看大图，也可以打开原图。
- ⬇️ **图片下载**：支持下载喜欢的图片。
- 🔄 **刷新与继续浏览**：随时刷新图片，或加载更多内容。
- 🧩 **瀑布流布局**：支持调整缩略图列数，图片加载成功后再进入画廊，避免失败图片卡片占位。
- ⏳ **加载占位与补位**：加载期间显示占位卡片；图片加载失败后会尝试补足目标数量，慢速图片不会因固定的单图超时被提前丢弃。
- 🎞️ **平滑布局动画**：图片插入时，占位卡片通过位移动画过渡到新位置。
- 📡 **图片源状态检测与切换**：查看图片源连接状态，必要时切换备用源。
- 📱 **适配手机与电脑**：在不同尺寸的屏幕上浏览图片。

## 🚀 自主部署

本项目使用静态 HTML、CSS、JavaScript 和 Cloudflare Pages Functions，无需构建步骤。推荐通过 GitHub 连接 Cloudflare Pages 部署，这样后续推送代码后也能自动更新。

### 方式一：部署到 Cloudflare Pages（推荐）

#### 1. Fork 仓库

打开 [Waifu Gallery GitHub 仓库](https://github.com/BzAxu/Waifu-Gallery)，点击右上角 **Fork**，将项目复制到自己的 GitHub 账号。

#### 2. 创建 Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages**，选择创建应用，再选择 **Pages**。
3. 选择 **连接到 Git（Connect to Git）**，授权并选择你 Fork 的 `Waifu-Gallery` 仓库。
4. 在构建设置中填写：

   | 设置项 | 填写内容 |
   | --- | --- |
   | Production branch（生产分支） | `main` |
   | Framework preset（框架预设） | `None` / `无` |
   | Build command（构建命令） | 留空 |
   | Build output directory（构建输出目录） | `/`（项目根目录） |

5. 点击 **Save and Deploy（保存并部署）**，等待首次部署完成。

> **重要：** 请使用支持 Pages Functions 的 Git 集成部署方式。项目中的 `functions/api/gallery.js` 是后端接口，不能只上传 HTML、CSS、JavaScript 文件，否则画廊的图片聚合、状态检测和下载代理接口将无法正常工作。

#### 3. 打开网站

部署成功后，Cloudflare 会分配一个类似 `https://你的项目名.pages.dev` 的网址。打开该网址即可体验。

#### 4. 更新网站

之后只需向自己 Fork 的仓库 `main` 分支推送更改，Cloudflare Pages 就会自动重新部署。修改前端通常只需编辑 `index.html`、`assets/css/styles.css` 或 `assets/js/gallery.js`；接口逻辑位于 `functions/api/gallery.js`。

### 方式二：使用自己的域名（可选）

如果已经拥有域名，可以在 Cloudflare Pages 项目的 **Custom domains（自定义域）** 中添加域名，并按照页面提示完成 DNS 配置。使用 Cloudflare 自动分配的 `pages.dev` 域名则不需要购买域名。

## 🧰 项目结构

```text
.
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── gallery.js
├── functions/
│   └── api/
│       └── gallery.js
└── README.md
```

- `index.html`：页面结构。
- `assets/css/styles.css`：页面样式。
- `assets/js/gallery.js`：画廊交互逻辑。
- `functions/api/gallery.js`：服务端图片源请求、状态检测和下载接口，对应 `/api/gallery`。

## 🌐 图片来源与注意事项

本站展示的图片来自第三方公开图片服务。图片能否加载、更新速度和可用性取决于对应服务；第三方接口可能变更、限流或暂时不可用。自主部署并不意味着这些图片服务由你控制。

- 本项目不要求配置付费 API 密钥，也没有额外的前端构建步骤。
- Cloudflare Pages 的服务使用情况仍受 Cloudflare 当前套餐、平台政策和使用限制约束。
- 网络较慢时，单张图片会继续等待加载；如果图片源 API 长时间无响应，请求仍可能在 30 秒后超时。
- 图片失败后会有限次请求补位；如果第三方服务持续不可用，最终显示数量仍可能少于目标数量。
- 为避免主动降清晰度，部分来源只使用其原图地址字段；若来源没有可用原图链接，该图片可能被跳过。
- 如果图片加载失败，可以尝试刷新或切换图片源，并检查第三方服务状态。

## 📌 版权说明

- 本项目主要用于聚合与浏览二次元图片，不代表图片的原创作者或版权方。
- 图片版权及相关权利归原作者或相应权利人所有。如需转载或二次使用，请先确认对应图片的授权与使用条件。

---

喜欢这个小画廊的话，欢迎点个 ⭐ Star 喵！
