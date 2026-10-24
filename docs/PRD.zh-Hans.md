# 仙建世界客户端 PRD

| 项目 | 内容 |
| --- | --- |
| 产品名称 | 仙建世界客户端（Xianjian Client） |
| 内部代号 | XJMC Launcher |
| 技术底座 | [SJMCL](https://github.com/UNIkeEN/SJMCL)（GPLv3 + 附加条款）二次开发 |
| 当前版本 | `0.1.0` |
| 目标平台 | Windows 10/11、macOS 10.15+、Linux（webkit2gtk 4.1+） |
| 文档状态 | 草案；S0 / S1 已实现，S1.5 规划中 |

---

## 1. 背景与问题

仙建世界（西安建筑科技大学 MC 社）目前以 **PCL2 + 群文件分发包 + 图文手册** 的方式引导新玩家。手册描述的实际路径是：

1. 在群文件下载 Java 安装包并手动安装；
2. 下载客户端 ZIP 并解压，得到 `.minecraft` 与 PCL2；
3. 到皮肤站注册（需要管理员发放邀请码，并实名登记）；
4. 在 PCL2 中依次点击：版本设置 → 设置 → 滑到底 → 登录方式改为「第三方登录: Authlib Injector」→ 填写认证服务器与注册链接；
5. 输入皮肤站账号密码启动游戏；
6. 进入多人游戏，双击服务器条目；
7. 在登录服完成注册/登录、右键 NPC 传送到生存服；
8. 等待管理员添加白名单；进入二区必须先在一区传送，否则可能丢失背包。

### 1.1 断点分析

| # | 环节 | 失败方式 | 能否由启动器解决 |
| --- | --- | --- | --- |
| 1 | 安装 Java | 版本/位数装错 | ✅ 可自动化 |
| 2 | 分发包与杀软 | PCL2 被误删、解压层级错误 | ✅ 安装包 + 签名 |
| 3 | 皮肤站注册 | 邀请码与实名审核需人工 | ❌ 需后台 |
| 4 | 认证服务器配置 | 6 步点击 + 手抄 URL，易错 | ✅ 可预置 |
| 5 | 账号登录 | 密码错误被误判为启动器故障 | ✅ 可引导 |
| 6 | 进服 | 防火墙、刷新过频被屏蔽 | ⚠️ 部分 |
| 7 | 白名单 | 人工审批 | ❌ 需后台 |
| 8 | 二区传送规则 | 不看文档直接 `/server` 导致丢背包 | ❌ 服务端，启动器可提示 |
| 9 | 整合包获取与更新 | 群文件 903 MB 的 PCL 包：版本漂移、重复文件、混入他人存档 | ✅ S1.5 启动包 |

结论：**本期只解决 1、2、4、5、6 中可由客户端承担的部分**，3、7、8 依赖社团后台与服务端插件，另行立项；第 9 项由 S1.5「启动包分发」承担。

### 1.2 现有启动包的实测

把 v8.0.0 的分发包按目录拆开，可以得到 S1.5 的直接依据：

| 内容 | 体积 | 性质 |
| --- | --- | --- |
| `.minecraft/assets` | 468 MB | 公共缓存，任何启动器都能拉取 |
| `.minecraft/libraries` | 90 MB | 公共缓存，同上 |
| 版本目录 `mods/`（22 个 jar） | 106 MB | **社团内容**，必须分发 |
| `config/`（65 个文件） | 404 KB | **社团内容**（预设） |
| `resourcepacks/` + `shaderpacks/` | 6.5 MB | **社团内容** |
| `saves/` + `screenshots/` | 93 MB | 打包者个人数据，不应分发 |
| 客户端 jar ×2 | 78 MB | 同一文件（sha1 相同）重复两份 |
| 合计 | **903 MB** | 其中社团内容约 **113 MB** |

除体积外还有三个结构性问题：

1. **平台绑定**：`PCL2.exe` 只跑 Windows；认证方式、实例记录、Java 路径分别锁在 `PCL/Setup.ini`、`.minecraft/PCL.ini` 和启动脚本里，换启动器即失效；
2. **无出厂校验**：22 个 mod 里存在一对 sha1 完全相同的 sodium（`[钠] sodium-fabric-0.9.2+mc26.2.jar` 与 `sodium-fabric-0.9.2+mc26.2.jar`），重复 mod id 会导致 Fabric 启动失败；
3. **不可增量**：任何 mod 或配置变更都要整包重下 903 MB，玩家本地存档与键位也难以保全。

其中应当继承的约定：MC **26.2** + Fabric **0.19.5**、authlib-injector 指向 `https://skin.xauatcraft.com/api/yggdrasil`、预置服务器 `play.xauatcraft.com` / `minigame.xauatcraft.com`、中文语言与键位预设、`XAUATcraft资源包 v4.0` 以及 Solas / Photon 光影。

## 2. 产品目标

### 2.1 定位

面向本校及友校玩家的、开箱即可进入「仙建世界」的 Minecraft 启动器：下载安装后无需查阅手册即可完成「注册 → 登录 → 进服」。

### 2.2 量化目标

| 指标 | 现状 | 目标 |
| --- | --- | --- |
| 新玩家从拿到安装包到进入主城 | 20~40 分钟（含等待人工） | ≤ 8 分钟（人工环节除外） |
| 因配置错误导致的求助 | 占群内提问多数 | 下降 70% |
| 因客户端文件被误删/解压错误导致的求助 | 常见 | 归零 |
| 整包体积 | 903 MB（PCL 包） | ≤ 120 MB（mrpack） |
| 包安装耗时（100 Mbps） | 与整包同量级 | ≤ 3 分钟 |

### 2.3 非目标（本期明确不做）

- 不自研启动内核，不重写下载/启动/实例管理逻辑；
- 不做 CurseForge / Modrinth 的商店化改造；
- 不做多社团 SaaS 化，不做面向其他社团的包市场；
- 不删除上游功能（扩展系统、MCP、发现页保持原样）。

## 3. 方案选型

选择 **基于 SJMCL 二开**，而非自研，理由：

1. SJMCL 已具备实例管理、加载器安装、整合包导入、authlib-injector、JRE 自动下载等全部底层能力；
2. 其扩展系统允许后续以「扩展包 + 配置」的形式叠加社团功能，不必持续改动内核；
3. 自研达到同等完成度需 3~6 个月，而社团的实际诉求集中在「开箱即用」，不在启动内核。

约束：**只加不删、差异最小化、保留 rebase 能力**。删除上游代码会持续放大与上游的合并冲突。

启动包也不再自研格式：S1.5 复用上游已支持的 Modrinth `.mrpack` 导入链路（`src-tauri/src/instance/helpers/modpack/import.rs`），mod 文件带 sha1 校验与多源下载；CurseForge 格式逐文件依赖 `api.curseforge.com` 解析，MultiMC 格式导入时不产生下载任务，均不适合作为社团包主格式。

## 4. 本期范围（S0，已实现）

| 需求 | 实现方式 | 位置 |
| --- | --- | --- |
| 品牌与标识 | `productName`、`identifier`、窗口标题、版本号 | `src-tauri/tauri*.conf.json`、`package.json`、`Cargo.toml` |
| 预置认证服务器 | 在 `PRESET_AUTH_SERVERS` **追加**仙建世界皮肤站 | `src-tauri/src/account/helpers/authlib_injector/constants.rs` |
| 更新通道 | 改接社团更新服务（Downloader），移除上游更新源 | `src-tauri/src/launcher_config/helpers/updater.rs` |
| 默认下载源 | 全新安装默认走 BMCLAPI 镜像 | `src-tauri/src/launcher_config/models.rs` |
| 合规 | 统计上报版本号前缀 `XJ-`、README 与关于页归属声明 | `utils/sys_info.rs`、`README.md`、`src/locales/*` |
| 多语言 | 7 种语言的品牌文案替换 | `src/locales/*.json` |

### 4.1 品牌

- 显示名：**仙建世界客户端**；英文/拉丁语言环境：`Xianjian Client`。
- identifier：`com.xauatcraft.launcher`（决定用户数据目录，发布后不可再改）。
- 版本号独立于上游，从 `0.1.0` 起算。

### 4.2 预置认证服务器

在保留上游 3 个预置项的前提下追加：

```
https://skin.xauatcraft.com/api/yggdrasil
```

依据 `LICENSE.EXTRA` 第 3 条，「仅增加预置认证服务器」的改动可继续使用原名分发；但由于本期还包含品牌与其它改动，仍按第 1、2 条履行改名与声明义务。

> 说明：若后续要让皮肤站支持 Yggdrasil Connect 的 OAuth 登录（而非账号密码），需在皮肤站注册 client_id 并登记到 `CLIENT_IDS`。本期不做。

### 4.3 更新通道

更新检查与下载全部走 iOS Club 的 Downloader 服务。构建期通过环境变量注入：

| 变量 | 含义 |
| --- | --- |
| `XJMC_UPDATE_BASE` | 服务地址，仙建世界当前取值为 `https://appapi.xauat.site`，不带结尾斜杠 |
| `XJMC_UPDATE_APP_ID` | 该客户端在服务中对应的应用 ID，当前取值为 `38d6c760-6462-441f-b32f-626533899c19` |

两者任一为空时，**启动器不进行更新检查**（不会回落到上游地址）。

接口：`GET {XJMC_UPDATE_BASE}/api/app/{XJMC_UPDATE_APP_ID}/latest`

```json
{
  "appId": "…",
  "appName": "仙建世界客户端",
  "releaseId": "0.1.1",
  "releaseDate": "2026-11-01T10:00:00Z",
  "context": "更新说明（Markdown）",
  "softs": [
    { "id": "…", "name": "Windows 安装版", "softUrl": "https://…/files/…/SJMCL_0.1.1_windows_x86_64_setup.exe" },
    { "id": "…", "name": "macOS", "softUrl": "https://…/files/…/SJMCL_0.1.1_macos_aarch64.app.tar.gz" }
  ]
}
```

选择规则：按 `softUrl` 中的平台/架构关键字打分，**必须命中当前操作系统**才会被选中，否则视为无可用更新。

安装包命名约定（与现有 CI 产物一致，供匹配使用）：

```
SJMCL_<version>_<os>_<arch>_setup.exe     # Windows NSIS 安装版
SJMCL_<version>_<os>_<arch>_portable.exe  # Windows 便携版
SJMCL_<version>_<os>_<arch>.app.tar.gz    # macOS（内部为 仙建世界客户端.app）
SJMCL_<version>_<os>_<arch>_portable      # Linux 便携版
SJMCL_<version>_<os>_<arch>.deb / .rpm    # Linux 安装包
```

各平台安装行为：

- Windows 安装版：运行安装器（`/UPDATE /P`），便携版：脚本替换 exe 后重启；
- macOS：等待进程退出后解包替换 `.app`，重开；
- Linux：赋予可执行权限后交给 `xdg-open` 打开（本期不做原地替换）。

### 4.4 合规清单

| 条款 | 要求 | 状态 |
| --- | --- | --- |
| 附加条款 1 | 使用与 SJMCL 不同的名称 | ✅ 已完成 |
| 附加条款 2 | README / 关于页显著声明基于 SJMCL 并给出源仓库地址 | ✅ 已完成 |
| 附加条款 3/统计 | 修改版需向统计服务上报带 ≥2 字母前缀的版本号 | ✅ `XJ-` |
| 预置接口限制 | 只允许追加，不得删改原有预置项 | ✅ 保留 3 项 |
| GPLv3 | 分发版本的完整源码必须公开 | ⏳ 需建立公开仓库 |

## 5. 后续迭代

### S1 开箱闭环（已完成）

- **首启引导**：同意用户协议后弹出「入服清单」弹窗，四项均可直接操作——安装 Java、注册皮肤站、添加账号、创建/导入实例；已完成的项显示状态徽标。可从「帮助」页随时重新打开。
  - Java 一步目前跳转到设置页的 Java 管理（复用已有的 Mojang JRE 下载弹窗），尚未做到在同一条弹窗内一键安装。
- **预置服务器**：实例首次被发现时写入 `servers.dat`（`play.xauatcraft.com` /「仙建世界」）。
  仅在文件不存在时写入，玩家自行编辑或清空服务器列表后不会被重新塞回。
- **关于页**：新增「仙建世界」分组（官网 / 皮肤站 / 玩家 QQ 群）；源代码入口改为本仓库，上游 SJMCL 移入致谢区，同时满足附加条款第 2 条。
- **帮助页**：新增「新手引导」入口，可重新打开入服清单。

### S1.5 启动包分发（规划，P0 1~2 人日 + P1 2~3 人日）

- **目标**：把「群文件 903 MB 的 PCL 包」换成一个约 113 MB 的 `.mrpack`，新玩家在启动器内一键得到与 v8.0.0 等价、可直接进服的实例。
- **格式决策**：Modrinth mrpack。mods 走 `files[]`（sha1 校验 + 主备源），config、资源包、光影走 `overrides/`；`libraries`、`assets`、客户端 jar、`saves`/`screenshots`/`logs` 以及任何账号信息**不进包**。
- **不入包的社团配置**：认证服务器与 `servers.dat` 继续由分叉预置（§4.2 与 S1），包内不携带凭据；可选的 `xjmc.pack.json` 只补充图标、推荐内存、JVM 参数与服务器列表，P2 起生效。
- **P0（零代码）**：建立独立的 `pack` 源仓库与 CI，从现有 PCL 包生成 `8.1.0`（去重后 21 个 mod），官网与群文件发链接，玩家走「导入整合包」。
- **P1（客户端）**：构建期注入 `XJMC_PACK_URL` / `XJMC_PACK_SHA256`，新增 `install_club_pack`（下载 → sha256 校验 → 解析版本元信息 → 复用 `create_instance`），首启引导第 4 项改为「安装仙建世界整合包」。
- **更新语义**：安装新版本 = 新建实例，旧实例与存档保留；文件级增量更新、完整性修复、Ed25519 签名留到 P2。
- **发版卫生**：CI 拒绝重复 sha1 / 重复模组 id、个人数据与 `..` 路径；首个包必须修正 v8.0.0 中重复的 sodium。
- 技术细节、流水线、清单示例与发版检查单见附录 C。

### S2 社群功能（依赖后台，约 4~5 人日）

- 邀请码申请与审核状态查询；
- 白名单申请与状态查询（只读 API，客户端不直连 RCON）；
- 服务器在线状态与在服人数展示（放在首页小组件）。

> 前置条件：Blessing Skin 侧提供邀请码/白名单接口。若后台尚未立项，S2 顺延。

### S3 发布工程（约 3~4 人日）

- 产物前缀改为 `XJMC_`，同步修改 `build.yml` / `release.yml` / `sign-macos.yml`；
- 停用上游专用发布流程（winget / AUR / snap / post-release-publish / nightly）；
- Windows 代码签名证书、macOS 公证；
- 自建更新资产上传脚本（对齐 Downloader 的 `POST /api/app/{id}`、`POST /api/release`、`POST /api/soft/upload`）；
- 图标、安装器侧边图、DMG 背景等品牌素材替换。

## 6. 技术设计要点

- **发布版本判定**：更新检查仅在 `build_type == Release` 且当前版本为合法 semver 时执行，本地开发构建不会弹更新。
- **失败静默**：更新接口不可用时只记录日志，不阻断启动。
- **镜像策略**：默认 `mirror`（BMCLAPI 优先），设置页仍可切回官方源或自动。
- **数据目录隔离**：`identifier` 变更使本客户端与官方 SJMCL 的配置、账号、实例互不干扰。
- **启动包**：复用 `create_instance(modpack_path, modpack_version)` 与 mrpack 解析，不新增包格式；导入整合包时不会自动补 Fabric API，包必须自带 `fabric-api`。
- **Java**：MC 26.2 的 `javaVersion.majorVersion` 为 25（组件 `java-runtime-epsilon`）；仅创建实例时可自动下载，启动阶段不下载，一键安装需在创建前检查。
- **包体积**：只分发社团内容，`libraries` / `assets` / 客户端 jar 交给启动器按下载源拉取。
- **与上游同步**：每两周 rebase 一次；品牌差异集中在 `tauri*.conf.json`、`constants.rs`、`updater.rs`、`locales/*`、`README.md`、`docs/`。

## 7. 里程碑

| 阶段 | 内容 | 产出 |
| --- | --- | --- |
| S0 | 品牌、预置认证、更新通道、合规 | 可编译可发版的分叉骨架 |
| S1 | 首启引导、服务器预置 | 首个面向新生的可用版本 |
| S1.5 | 启动包分发：mrpack 流水线 + 一键安装 | 新玩家无需手动装 mods |
| S2 | 邀请码、白名单 | 减少人工审批 |
| S3 | 签名、发布流水线 | 正式对外分发 |

## 8. 验收标准

**S0**

1. `pnpm build` 通过，`tsc --noEmit` 无错误，7 个语言文件 key 完全一致；
2. 首次启动时账号页的认证服务器列表中可直接看到「仙建世界皮肤站」，无需手动添加；
3. 关于页同时展示「基于 SJMCL 开发」与上游仓库地址；
4. 未配置更新服务变量时，启动不报错、不弹更新；
5. 配置后，`0.1.0` → `0.1.1` 可完成检查、下载、安装、重启；
6. macOS 与 Linux 构建产物可正常启动。

**S1**

7. 全新机器上，从安装到进入主城不超过 8 分钟，且全程不需要手动改认证服务器设置。

**S1.5**

8. 8.1.0 包体积 ≤ 120 MB，包内无 `libraries/`、`assets/`、`saves/`、`screenshots/`、`logs/`；
9. 一键安装后 mods 与基准清单 sha1 一致（21 个，无重复）；从安装到进入主城 ≤ 8 分钟，其中包安装 ≤ 3 分钟（100 Mbps）；
10. 同一份包在 `mirror` 与 `official` 两种下载源下均可完成安装；
11. 断网、404、sha1 不匹配三类故障均给出可操作提示；
12. 8.0.0 → 8.1.0 安装新实例后，旧实例与存档不受影响。

## 9. 风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 上游频繁更新导致 rebase 冲突 | 维护成本上升 | 差异集中在少量文件、只加不删、双周同步 |
| 无代码签名 → 杀软误报 | 与 PCL2 相同的老问题 | 优先发安装包、申请证书、提交误报申诉 |
| 更新服务不可用 | 用户卡在旧版本 | 失败静默；保留「手动下载」入口 |
| identifier 变更 | 老用户配置丢失 | 发布前定死，本期已确定 |
| 用户协议仍指向上游 | 合规瑕疵 | S1 前补齐本次发行版协议 |
| 邀请码/白名单无接口 | 人工审批仍是瓶颈 | 客户端只做入口，后台单独立项 |
| MC 26.2 / Fabric 0.19.5 元数据在镜像站滞后 | 启动包导入直接失败 | 失败时自动切官方源；发版前双源各装一次 |
| 启动阶段不自动下载 Java | 玩家卡在「未找到 Java」 | 一键安装前检测并补 `java-runtime-epsilon`；指南前置 |
| 更新 = 新实例，存档未迁移 | 玩家投诉 | 发版说明与完成弹窗明确提示；P2 增量更新 |
| 第三方 mod 再分发许可 | 合规风险 | 优先官方直链；`mods.lock.json` 记录来源与许可 |
| 启动包无签名 | 包可被替换 | P2 Ed25519 签名 + 内置公钥，此前依赖 HTTPS 与群内校验值 |

## 10. 待决事项

1. 皮肤站是否提供邀请码/白名单接口，以及接口鉴权方式；
2. 图形资源（图标、启动图、安装器素材）的提供方与交付时间；
3. 启动包版本号是否延续 PCL 包（`8.0.0` → `8.1.0`），以及 `{PACK_CDN}` 的域名、归属、配额与回源策略；

## 附录 A：与上游的差异清单

| 文件 | 改动 |
| --- | --- |
| `src-tauri/tauri.conf.json`、`tauri.{macos,windows,linux}.conf.json` | 产品名、identifier、窗口标题、版本 |
| `src-tauri/src/account/helpers/authlib_injector/constants.rs` | 追加 1 个预置认证服务器 |
| `src-tauri/src/instance/constants.rs`、`helpers/server.rs`、`helpers/misc.rs` | 新实例预置 `servers.dat` |
| `src/components/modals/first-run-guide-modal.tsx`、`special/shared-modals-provider.tsx`、`modals/welcome-and-terms-modal.tsx` | 首启入服清单（替代上游通用导览） |
| `src/pages/settings/help.tsx`、`settings/about.tsx` | 新手引导入口、社团链接与上游致谢 |
| `src-tauri/src/launcher_config/helpers/updater.rs` | 更新源改为社团服务，重写检查与下载逻辑，新增 Linux 安装 |
| `src-tauri/src/launcher_config/commands.rs`、`models.rs` | `VersionMetaInfo.fileName` → `downloadUrl` |
| `src-tauri/src/utils/sys_info.rs` | 统计版本前缀 |
| `src-tauri/src/instance/commands.rs`、`helpers/modpack/import.rs` | S1.5 新增 `install_club_pack`，复用 mrpack 解析 |
| `src-tauri/src/launcher_config/models.rs`、`.env.template` | S1.5 新增 `XJMC_PACK_URL` / `XJMC_PACK_SHA256` |
| `src/components/modals/first-run-guide-modal.tsx`、`src/pages/instances/add-import.tsx` | S1.5 一键安装入口与包版本展示 |
| `src/locales/*.json` | S1.5 启动包文案（7 语言） |
| `src-tauri/build.rs`、`.env.template` | 转发并声明 `XJMC_*` 构建变量 |
| `src/models/config.ts`、`src/components/modals/notify-new-version-modal.tsx` | 同步字段；Linux 改为应用内下载 |
| `src/locales/*.json` | 品牌文案（7 语言） |
| `README.md` | 分叉声明与来源标注 |
| `.github/workflows/build.yml`、`sign-macos.yml` | macOS 包名、更新服务变量 |

## 附录 B：本地构建

```bash
pnpm install
cp .env.template .env        # 填入 XJMC_UPDATE_BASE / XJMC_UPDATE_APP_ID
pnpm tauri dev               # 开发调试
pnpm tauri build             # 打包（需 Rust 工具链）
```

## 附录 C：启动包分发技术方案

### C.1 可复用能力与缺口

| 能力 | 位置 | 对启动包的意义 |
| --- | --- | --- |
| 整合包解析（CurseForge / Modrinth / MultiMC） | `src-tauri/src/instance/helpers/modpack/import.rs:37-58` | 包格式无需自研，mrpack 已被支持 |
| mrpack 文件下载：`sha1` + 多 `downloads` 源 + 体积 | `src-tauri/src/instance/helpers/modpack/modrinth.rs:125-150` | 完整性校验与源回退 |
| `overrides/` 解压，含 zip-slip 防护 | `src-tauri/src/instance/helpers/modpack/import.rs:112-147` | config、资源包、光影按实例投放 |
| `create_instance(modpack_path, modpack_version)` | `src-tauri/src/instance/commands.rs:1035-1099`、`:1222-1228` | 一条命令建实例并写入包版本 |
| `Instance.modpack_version` | `src-tauri/src/instance/models/misc.rs:110` | 已有的更新判定锚点 |
| 实例目录隔离（mods / config / resourcepacks…） | `src-tauri/src/instance/models/misc.rs:17-30` | 包内容不会污染全局游戏目录 |
| 下载引擎的多源回退 | `src-tauri/crates/sjmcl-downloader/src/actor.rs:1599-1647` | `downloads[]` 主备源失败后自动轮换 |
| 整合包导出（Modrinth / MultiMC） | `src-tauri/src/instance/commands.rs:1612-1645`、`helpers/modpack/export.rs` | 可用「母版实例」反向产出 mrpack |
| 导入整合包时跳过 Fabric API 自动安装 | `src-tauri/src/instance/commands.rs:1188-1190` | 包必须自带 `fabric-api` |
| 预置认证服务器、预置 `servers.dat` | §4.2、S1 | 包内不必携带账号与服务器配置 |

| 缺口 | 说明 |
| --- | --- |
| 只能从**本地文件**导入 | `modpack_path: Option<String>`（`commands.rs:1043`），无 URL 导入与一键入口 |
| 导入强制联网重建基础文件 | 必读远端 version json、下 client jar、补 libraries/assets（`commands.rs:1103-1186`），无「本地优先/离线只校验」分支 |
| 只认 SJMCL 扁平化实例 | 不解析 `inheritsFrom`（`helpers/client_json.rs:376-463`），PCL/HMCL 的包装 json 目录直接拷入会缺 mainClass 与 libraries |
| 无「包身份」 | `Instance` 只有自由文本 `modpack_version`，没有 packId / 来源 URL / 校验和，无法做增量更新与回滚 |
| 实例设置不随包 | Java、内存、JVM 参数、自动进服都在 `GameConfig`（`launcher_config/models.rs:136-218`），导出侧只写 MultiMC 的 `min_memory` |
| 社团预置是编译期常量 | `PRESET_AUTH_SERVERS`、`PRESET_GAME_SERVERS` 写死在代码里（`account/helpers/authlib_injector/constants.rs:2`、`instance/constants.rs:6`），包内无法声明 |
| 无完整性修复 | 导入后文件被改动或丢失，只能重装实例 |
| 无包级信任模型 | 只有单文件 sha1；无整包哈希、无发布者签名 |
| 无一键编排 | 导入后前端跳 `/downloads`，玩家需自己回实例页点启动；实例还必须落在**已配置**游戏目录的 `versions/` 下（`commands.rs:1061`） |

### C.2 包格式与内容边界

```
xianjian-8.1.0.mrpack (zip)
├── modrinth.index.json          # 必需：mc/loader 版本 + 文件清单（path, sha1, downloads, size）
├── xjmc.pack.json               # 可选超集：图标、服务器、Java、JVM、更新策略、签名
├── overrides/
│   ├── config/                  # 预设配置（65 个文件）
│   ├── options.txt              # 脱敏后的画面/键位预设
│   ├── resourcepacks/           # XAUATcraft资源包 v4.0 等
│   └── shaderpacks/             # Solas / Photon
└── LICENSE-pack.md              # 包内第三方 mod 来源与许可清单
```

约定：

- `mods/*.jar` 走 `files[]` 而非 `overrides/`：体积大、稳定、需要哈希与多源回退；
- 配置类小文件走 `overrides/`：便于在 Git 中 review，发版频率高，不强求逐文件哈希；
- **不进包**：`libraries/`、`assets/`、`versions/*.jar`、`saves/`、`screenshots/`、`logs/`、`usercache.json`、`servers.dat`（由启动器预置）、任何账号凭据；
- `dependencies` 锁定 `minecraft: "26.2"` 与 `fabric-loader: "0.19.5"`，**不允许范围版本**，确保所有玩家同构。

`xjmc.pack.json`（P2 起生效，缺省时客户端按纯 mrpack 处理）字段草案：

```json
{
  "schemaVersion": 1,
  "id": "xianjian",
  "channel": "stable",
  "icon": "https://{PACK_CDN}/pack/icon.png",
  "java": { "min": 25 },
  "memoryMb": 4096,
  "jvmArgs": ["--enable-native-access=ALL-UNNAMED", "--sun-misc-unsafe-memory-access=allow"],
  "servers": [
    { "name": "仙建世界", "ip": "play.xauatcraft.com" },
    { "name": "仙建小游戏", "ip": "minigame.xauatcraft.com" }
  ],
  "minLauncherVersion": "0.2.0",
  "notes": "https://{PACK_CDN}/pack/8.1.0/notes.md",
  "signature": "ed25519:…"
}
```

其中 `servers` 仅作补充，默认行为仍是启动器预置（见 C.8）；`java.min` 用于安装前提示，实际选择仍由 `jre_selector` 按 MC 26.2 的 `javaVersion`（`java-runtime-epsilon` / major 25）决定。

> 附录 C 中的 `{PACK_CDN}` 是包文件的 CDN 域名占位符，尚未确定；它只用于放 mods、整包与 `latest.json`，与认证服务器、游戏服务器无关（见 §10 待决事项）。

### C.3 候选方案对比与取舍

| 方案 | 包体积 | 校验 | 增量 | 开发量 | 结论 |
| --- | --- | --- | --- | --- | --- |
| A. 冻结目录（现状 PCL 包） | 903 MB | 无 | 无 | 0 | 仅作旧包保留 |
| B. CurseForge zip | ≈113 MB | 无（overrides 不校验） | 无 | 0 | 不推荐：逐文件依赖 `api.curseforge.com` 解析，社团自有/汉化 mod 无 CF 项目 ID 时只能塞 overrides |
| C. **mrpack（Modrinth 规范）** | ≈113 MB | sha1 + 多源 | 只能整包换版本 | **0（上游已支持）** | **P0 采用** |
| D. mrpack + `xjmc.pack.json` 超集 | 同上 | 同上 | 文件级 diff | 5~8 人日 | **P2 采用** |
| E. MultiMC 格式 | ≈113 MB | 无 | 无 | 0 | 不采用：导入侧不返回下载任务（`multimc.rs:155-162`），mods 只能进 overrides |
| F. 扩展系统实现 | — | — | — | 大 | 不采用：扩展是前端沙箱 + 命令白名单（`src/contexts/extension/host.tsx:441-460`），无法写实例目录或提交下载任务 |

结论：包格式定为 **mrpack 兼容包**，P0 零代码即可分发；客户端只需补「一键安装 + 更新提示」，包内可选的 `xjmc.pack.json` 承载社团专属字段，同时对其他启动器保持合法 mrpack。

### C.4 构建流水线与托管

源仓库（可与启动器仓库分离）：

```
pack/
├── pack.json              # 包元信息：名称、版本、MC、loader、作者、changelog
├── mods.lock.json         # { file, url, sha1, size, license } —— 唯一事实来源
├── overrides/             # 直接对应包内 overrides/
└── tools/verify.mjs       # 卫生检查
```

CI（tag `v8.1.0`）流程：

1. `verify`：`mods.lock.json` 中的 sha1 逐个校验；**按 sha1/模组 id 去重**；禁止 `saves/`、`screenshots/`、`logs/`、`usercache.json`；禁止 `..` 路径；`overrides/` 中不得出现 jar；
2. `build`：生成 `modrinth.index.json` → 打 zip → 计算整包 sha256；
3. `publish`：上传对象存储与 GitHub Release（双源），更新 `latest.json`：

```json
{ "version": "8.1.0", "url": "https://{PACK_CDN}/pack/8.1.0.mrpack",
  "sha256": "…", "size": 118000000, "minLauncherVersion": "0.2.0",
  "notes": "…", "releasedAt": "2026-11-01T10:00:00Z" }
```

配套两个一次性脚本：

- `tools/from-pcl.py`：把现有 PCL 版本目录转成 `mods.lock.json` + `overrides/`（扫描 `mods/`、`config/`、`resourcepacks/`、`shaderpacks/`，计算 sha1；命中重复时**报错退出**，由人确认）；
- `tools/diff-pack.py`：对比两个包版本的 mod 列表，生成玩家可读的更新说明。

托管：

- 主源为对象存储（`{PACK_CDN}` 指包 CDN 域名，尚未确定，见 §10），需支持 Range 请求与长缓存；备源为 GitHub Release 直链，写入 mrpack 的 `downloads[1]`，由下载引擎在失败时自动轮换（`crates/sjmcl-downloader/src/actor.rs:1599-1647`）；
- 包内每个文件独立 URL 与 sha1（`modrinth.rs:125-150`），玩家重装/修复时只补缺失文件；
- 整包 sha256 记录在 `latest.json`，客户端下载后校验通过才导入。

> 打包的另一条路径：在客户端里维护一个「母版实例」，直接用「导出整合包」产出 mrpack（`commands.rs:1612`），适合小改；CI 路线适合规范化发版。

### C.5 客户端安装流程

**P0（0 代码）**

1. 官网/群文件提供 `.mrpack` 下载；
2. 启动器「实例 → 添加/导入 → 导入整合包」，选择文件（`src/components/modals/import-modpack-modal.tsx`，文件选择器接受 `zip/mrpack`）；
3. 弹窗先调 `retrieve_modpack_meta_info` 预览包信息，确认后由前端 `fetchGameVersionSpecific` 取 26.2 的官方 version json，再调 `create_instance(modpack_path, modpack_version)`；
4. 后续由下载任务组完成：client jar、缺失 libraries/assets、Fabric 0.19.5 安装、mods 校验下载、overrides 解压；创建时若开启 `auto_download_java`，会按 `javaVersion` 拉取 `java-runtime-epsilon`（major 25）；
5. 完成后前端跳转 `/downloads`，玩家回到实例页启动；认证服务器与 `servers.dat` 已由分叉预置，直接登录进服。

> 两个前置条件：包必须自带 `fabric-api`（导入整合包时不会自动补，`commands.rs:1188-1190`）；实例落点必须是已配置的游戏目录（`commands.rs:1061`）。

**P1（约 2~3 人日）**

- 构建期注入 `XJMC_PACK_URL`、`XJMC_PACK_SHA256`（与现有 `XJMC_UPDATE_*` 同一套 `.env` / `build.rs` 机制）；任一为空则隐藏入口；
- 新增命令 `install_club_pack`：下载整包到临时目录 → 校验 sha256 → 解析版本元信息（同 P0 第 3 步）→ 复用 `create_instance`（`modpack_path` + `modpack_version`）→ 返回实例摘要与任务组 ID；
- 入口三处：首启引导第 4 项改为「安装仙建世界整合包」、实例页空状态、帮助页；
- 「创建 + 等任务组完成 + 选中实例 + 启动」做一层前端编排（后端没有总编排，`launch-process-modal.tsx:152-240` 是四步命令序列），安装完成后直接给出「启动游戏」。

**P2（可选）**

- 读取 `xjmc.pack.json`：图标、推荐内存、JVM 参数、服务器补充、最低启动器版本；
- 更新检查：用 `latest.json` 与 `Instance.modpack_version` 比对，实例卡片显示「v8.0.0 → v8.1.0」；
- 文件级增量更新：按新包清单比对本地 sha1，只下差异文件，并处理「新版本删除的 mod」；`overrides` 支持 `write-if-missing` 策略，避免覆盖玩家改过的画面设置；
- 完整性修复：实例菜单 →「检查文件完整性」，缺失/损坏文件按清单重下；
- Ed25519 签名：公钥随客户端构建内置，校验 `xjmc.pack.json` 后再导入。

### C.6 更新与回滚

- P0/P1 的更新语义是「**安装新版本 = 新建实例**」，旧实例（含存档）原样保留，玩家自行迁移；发版说明中明确写出这一点，避免误以为原地升级；
- P2 才引入原地增量更新，并保留「上一个包版本」的回滚点（仅回滚包文件，不动存档）；
- 包版本与客户端版本**解耦**：包用 `8.x`，客户端用 `0.x`；`minLauncherVersion` 用于阻止旧客户端安装新包。

### C.7 隐私与卫生

| 检查项 | 规则 |
| --- | --- |
| 个人数据 | 包内禁止 `saves/`、`screenshots/`、`logs/`、`usercache.json`、`realms_persistence.json` |
| 账号信息 | 禁止 `launcher_profiles.json`、`authlib-injector.log`、任何 token |
| 重复文件 | 相同 sha1 或相同模组 id 视为错误，CI 失败 |
| 路径安全 | 清单与 zip 内路径不得包含 `..`、绝对路径；解压侧已用 `mangled_name` 防护（`import.rs:112-147`） |
| 配置脱敏 | `options.txt` 只保留画面/语言/键位，移除 `lastServer` 等本机痕迹 |
| 许可 | `mods.lock.json` 记录来源与许可；优先官方 CDN 直链，仅自研/汉化包走社团 CDN |

### C.8 登录与进服

沿用已有的预置能力，包内不做任何账号相关声明：

- 认证服务器 `https://skin.xauatcraft.com/api/yggdrasil` 已在预置列表中（§4.2）；
- 实例首次被发现时写入 `play.xauatcraft.com`（S1）；
- 若 `xjmc.pack.json` 声明了 `servers`，仅作为「补充」，且仍遵守「不覆盖玩家已有列表」的原则。

### C.9 失败诊断

| 失败场景 | 期望表现 |
| --- | --- |
| MC 26.2 或 Fabric 0.19.5 在镜像站不可用 | 提示切换下载源重试，并给出可复制的版本号，而非泛化「安装失败」 |
| 文件 404 / sha1 不匹配 | 指出具体文件路径与期望哈希，提供「重试」与备源切换 |
| Java 版本不足（< 25） | 引导至 Java 管理，说明包要求的最低版本 |
| 包版本高于客户端支持 | 提示先更新启动器（读取 `minLauncherVersion`） |
| 重复 mod / 清单损坏 | 在导入前拒绝并给出发版方可见的错误码 |

### C.10 PCL 包 → mrpack 映射

| PCL 包位置 | mrpack 中的位置 | 处理 |
| --- | --- | --- |
| `versions/<id>/mods/*.jar` | `files[]` | 计算 sha1，去重，写 downloads |
| `versions/<id>/config/**` | `overrides/config/**` | 直接搬 |
| `versions/<id>/options.txt` | `overrides/options.txt` | 脱敏后搬 |
| `versions/<id>/resourcepacks/*.zip` | `overrides/resourcepacks/` | 直接搬 |
| `versions/<id>/shaderpacks/*.zip` | `overrides/shaderpacks/` | 直接搬 |
| `versions/<id>/*.jar`、`libraries/`、`assets/` | 丢弃 | 由启动器按版本清单下载 |
| `servers.dat` | 丢弃 | 启动器预置（S1） |
| `PCL.ini`、`PCL/Setup.ini`、`launcher_profiles.json` | 丢弃 | 认证服务器已预置（§4.2） |
| `saves/`、`screenshots/`、`logs/`、`usercache.json` | 丢弃 | 个人数据 |

### C.11 `modrinth.index.json` 示例（节选）

```json
{
  "formatVersion": 1,
  "game": "minecraft",
  "versionId": "8.1.0",
  "name": "仙建世界",
  "summary": "西安建筑科技大学 MC 社整合包",
  "files": [
    {
      "path": "mods/sodium-fabric-0.9.2+mc26.2.jar",
      "hashes": { "sha1": "62a70961a5b3e06938e06ab5f2dc4c5a51cf3323", "sha512": "…" },
      "env": { "client": "required", "server": "unsupported" },
      "downloads": [
        "https://{PACK_CDN}/pack/8.1.0/mods/sodium-fabric-0.9.2+mc26.2.jar",
        "https://github.com/xauatcraft/pack/releases/download/v8.1.0/sodium-fabric-0.9.2+mc26.2.jar"
      ],
      "fileSize": 1885572
    }
  ],
  "dependencies": { "minecraft": "26.2", "fabric-loader": "0.19.5" }
}
```

### C.12 首个包（8.1.0）落地操作单

以现有 PCL 包的版本目录 `versions/仙建世界客户端-v8.0.0-26.2-Fabric/` 作为输入：

1. **体检与去重**：`shasum -a 1 mods/*.jar | sort` 找出同哈希文件；确认 `[钠] sodium-fabric-0.9.2+mc26.2.jar` 与 `sodium-fabric-0.9.2+mc26.2.jar` 为同一文件后只保留一个（再按 `fabric.mod.json` 的 mod id 复核），最终 mod 数应为 **21**；
2. **生成清单**：`tools/from-pcl.py <src> --out pack/`，得到 `mods.lock.json`（path / url / sha1 / size）与 `overrides/`（`config/`、`resourcepacks/`、`shaderpacks/`、脱敏后的 `options.txt`）；
3. **补齐必需项**：确认 `fabric-api-0.161.0+26.2.jar` 在清单内；确认 `sodium-options.json`、`mezz_config` 等预设随 `overrides/` 一起进入；
4. **上传**：mods 与 overrides 内的大文件传到 `{PACK_CDN}/pack/8.1.0/`，URL 写入清单；同一批文件同步到 GitHub Release 作为 `downloads[1]`；
5. **出包**：CI 生成 `xianjian-8.1.0.mrpack` 与 `latest.json`（整包 sha256、体积、更新时间、更新说明）；
6. **双源验证**：在 `mirror` 与 `official` 两种下载源下各走一次「全新安装 → 启动 → 进服」，确认 21 个 mod 全部加载、`servers.dat` 有预置条目、认证服务器可选「仙建世界皮肤站」；
7. **发布**：`latest.json` 与官网下载页上线；P1 完成后首启引导按钮直接指向该包，群文件只作兜底。

预期结果：包体积约 **113 MB**（现状 903 MB 的 12.5%），首次安装约 2~3 分钟（100 Mbps），更新说明只列出 mod 变更。

### C.13 发版检查单

- [ ] 包内 mods 数量与 `mods.lock.json` 一致，无重复 sha1 / 重复模组 id
- [ ] 所有 `downloads` 主备源均返回 200，`Content-Length` 与 `fileSize` 一致
- [ ] `minecraft`、`fabric-loader` 版本锁定，且能在 `mirror` 与 `official` 两种下载源下完成安装
- [ ] `overrides/` 无 jar、无个人数据、`options.txt` 已脱敏
- [ ] `xjmc.pack.json` 的 `minLauncherVersion` 与实际 API 兼容
- [ ] 在 Windows 与 macOS 各做一次全新安装 + 进服
- [ ] 更新 `latest.json`，保留上一版本文件以便回滚
- [ ] 群公告与官网同步更新下载链接与更新说明
