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

## 🔐 邀请制账号与云端收藏（内测）

账号功能采用 **Supabase Auth + PostgreSQL**，现有 Cloudflare Pages / Functions 图片 API 保持不变。未登录访客仍可浏览图片；注册必须提交一次性邀请码。登录后可以在图片预览中收藏，收藏记录与账号绑定，并可跨设备查看。

### 1. 创建 Supabase 项目并应用数据库迁移

1. 创建一个 Supabase 项目。
2. 打开项目的 **SQL Editor**，执行仓库文件 `supabase/migrations/202610200001_invite_accounts_and_favorites.sql` 的完整内容。
3. 在 **Authentication → URL Configuration** 中设置 Site URL，并把实际访问地址加入 Redirect URLs，例如：
   - `https://waifu-gallery-bce.pages.dev/`
   - `https://bzaxu.top/Waifu-Gallery/`
4. 在 **Authentication → Providers → Email** 中启用邮箱登录和邮件验证。邀请邮件与密码重置邮件需要可用的邮件投递配置；公开内测前应配置自己的 SMTP，并测试投递、链接有效期及垃圾邮件情况。
5. 在 **Authentication → Sign In / Providers**（具体名称可能随 Dashboard 版本变化）中关闭普通用户直接注册的开关，防止访客绕过邀请码直接调用 Supabase 的公开注册接口。账号创建只走本项目的服务端邀请码端点；管理员邀请接口是否可在该设置下使用，应在测试项目中先验证。
6. 为站长账号在 Supabase Dashboard 的 **Authentication → Users** 中手动创建一个用户，并确保邮箱已验证。复制该用户的 UUID，后面用于站长权限校验。不要通过公开注册流程创建站长账号。

### 2. 配置前端公开参数

编辑 `assets/js/auth-config.js`：

- `SUPABASE_URL`：Supabase 项目 URL。
- `SUPABASE_ANON_KEY`：项目的 publishable/anon key。该值会发送到浏览器，属于公开客户端配置。
- `SITE_OWNER_USER_ID`：上一步创建的站长用户 UUID。

**不要**把 `service_role`、`sb_secret_`、数据库密码或其他管理密钥放入前端文件、Git 提交、截图或公开聊天。

### 3. 配置 Cloudflare Pages Functions 环境变量

进入 Cloudflare Dashboard → **Workers & Pages → waifu-gallery → Settings → Variables and Secrets**，为生产环境配置：

| 变量名 | 内容 | 是否敏感 |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase 项目 URL | 否 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务端 service-role/secret key | **是，必须作为 Secret** |
| `SITE_OWNER_USER_ID` | 站长用户 UUID | 否 |
| `SITE_BASE_URL` | 规范的画廊地址，末尾带斜杠 | 否 |

`SITE_BASE_URL` 应选择一个作为邀请邮件的规范落点，例如 `https://bzaxu.top/Waifu-Gallery/`。这个地址必须同时加入 Supabase Redirect URLs。设置变量后重新部署 Pages 项目，使 Functions 获得新配置。

### 4. 邀请码与注册流程

1. 部署并完成配置后，用站长账号登录画廊。
2. 在“账号 / 收藏”面板中生成邀请码。每次最多生成 20 个；明文只在生成成功时显示一次，请立即复制保存。
3. 将邀请码单独发给内测参与者。用户填写邮箱和邀请码后，服务端会预留邀请码并通过 Supabase 发送邀请邮件；成功发送后邀请码即被标记为已使用。
4. 用户打开邀请邮件链接并设置密码，之后使用邮箱和密码登录。
5. 站长可以查看最近 100 个邀请码的状态，并撤销未使用的邀请码。已使用的邀请码不能撤销。

邀请码数据库只保存 SHA-256 哈希，不保存明文。服务端通过 Cloudflare Functions 和 Supabase 管理密钥验证邀请码；浏览器无法直接读取或修改邀请码表。若邮件发送失败，系统会尝试释放预留的邀请码；若请求在邮件发送后中断，请站长核对邀请码状态后再决定是否重新发码。

### 5. 收藏和数据安全

- 收藏只保存图片 URL、来源标识、标题和时间，不会把第三方图片复制到 Supabase。
- `favorites` 表启用 RLS，并按 `auth.uid() = user_id` 限制读取、添加和删除；客户端提交的用户 ID 不会覆盖数据库策略。
- 收藏列表每次分页读取最多 50 条。
- 第三方图片 URL 可能过期或失效；失效记录仍可能显示在收藏列表中，需要用户自行取消收藏。
- 当前旧版本没有确认存在可迁移的本地收藏数据，因此本次实现不自动导入 localStorage 收藏。

### 6. 上线前检查清单

- [ ] Supabase 数据库迁移执行成功。
- [ ] Cloudflare Functions 的服务端密钥只配置在 Secret 中，未提交到 Git。
- [ ] `SITE_OWNER_USER_ID` 在前端配置与 Cloudflare 环境变量中完全一致。
- [ ] Supabase Site URL / Redirect URLs 覆盖实际访问域名及路径。
- [ ] 邮箱邀请、设置密码、登录、找回密码邮件均完成实际测试。
- [ ] 普通账号无法读取其他账号的收藏，也无法访问站长邀请码管理 API。
- [ ] 用一个邀请码成功注册后，再次使用该码会被拒绝。
- [ ] 未使用邀请码可以撤销；已使用邀请码不能撤销。
- [ ] Cloudflare Pages 生产部署完成后，分别在 `pages.dev` 和自定义域名上测试图片 API 与账号 API。

**状态提示：** 代码仓库中的实现和 SQL 迁移本身不会自动创建 Supabase 项目、设置 SMTP 或配置 Cloudflare Secrets。完成上述步骤并通过实际测试前，不应将账号系统视为已上线。

---

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
