# PRD：仙建世界客户端（Xianjian Client）

| 项目 | 内容 |
| --- | --- |
| 产品名称 | 仙建世界客户端（Xianjian Client） |
| 内部代号 | XJMC Launcher |
| 技术底座 | [SJMCL](https://github.com/UNIkeEN/SJMCL)（GPLv3 + 附加条款）二次开发 |
| 当前版本 | `0.1.0` |
| 目标平台 | Windows 10/11、macOS 10.15+、Linux（webkit2gtk 4.1+） |
| 文档状态 | 草案；S0 / S1 已实现，S1.5 / S1.6 规划中 |
| 文档结构 | 引言 → 目标 → 用户故事 → 功能需求 → 非目标 → 设计考虑 → 技术考虑 → 成功指标 → 待决事项 + 附录 |
| 状态图例 | ✅ 已实现 · ⬜ 规划中 · ⚠️ 已实现但有已知偏差 · ⏳ 待办（合规项） |
| 需求编号 | 用户故事 `US-xxx`、功能需求 `FR-xx`，全局唯一；验收标准均可勾选 |

> 面向读者：参与本项目的社团开发同学与 AI 编程助手。动手改代码前先读 §7 与对应附录；验收以 US 的验收标准为准。

---

## 1. 引言与问题

### 1.1 背景

仙建世界（西安建筑科技大学 MC 社）目前以 **PCL2 + 群文件分发包 + 图文手册** 的方式引导新玩家。手册描述的实际路径是：

1. 在群文件下载 Java 安装包并手动安装；
2. 下载客户端 ZIP 并解压，得到 `.minecraft` 与 PCL2；
3. 到皮肤站注册（需要管理员发放邀请码，并实名登记）；
4. 在 PCL2 中依次点击：版本设置 → 设置 → 滑到底 → 登录方式改为「第三方登录: Authlib Injector」→ 填写认证服务器与注册链接；
5. 输入皮肤站账号密码启动游戏；
6. 进入多人游戏，双击服务器条目；
7. 在登录服完成注册/登录、右键 NPC 传送到生存服；
8. 等待管理员添加白名单；进入二区必须先在一区传送，否则可能丢失背包。

这条路径对新玩家不友好：多数步骤与 Minecraft 本身无关，而是启动器配置、文件摆放与人工审批。

### 1.2 断点分析

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

结论：**本期只解决 1、2、4、5、6 中可由客户端承担的部分**，3、7、8 依赖社团后台与服务端插件，另行立项；第 9 项由 S1.5「启动包分发」承担（US-011 ~ US-015）。

### 1.3 现有启动包的实测

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

### 1.4 技术路线选型

选择 **基于 SJMCL 二开**，而非自研，理由：

1. SJMCL 已具备实例管理、加载器安装、整合包导入、authlib-injector、JRE 自动下载等全部底层能力；
2. 其扩展系统允许后续以「扩展包 + 配置」的形式叠加社团功能，不必持续改动内核；
3. 自研达到同等完成度需 3~6 个月，而社团的实际诉求集中在「开箱即用」，不在启动内核。

约束：**只加不删、差异最小化、保留 rebase 能力**。删除上游代码会持续放大与上游的合并冲突。

### 1.5 包格式选型

启动包也不再自研格式：S1.5 复用上游已支持的 Modrinth `.mrpack` 导入链路（`src-tauri/src/instance/helpers/modpack/import.rs`），mod 文件带 sha1 校验与多源下载；CurseForge 格式逐文件依赖 `api.curseforge.com` 解析，MultiMC 格式导入时不产生下载任务，均不适合作为社团包主格式（详细对比见附录 C.3）。

---

## 2. 目标

### 2.1 定位

面向本校及友校玩家的、开箱即可进入「仙建世界」的 Minecraft 启动器：下载安装后无需查阅手册即可完成「注册 → 登录 → 进服」。

### 2.2 可度量目标

- 新玩家从拿到安装包到进入主城 **≤ 8 分钟**（人工审核环节除外）；
- 因配置错误（认证服务器、下载源、Java）导致的求助 **下降 70%**；
- 因客户端文件被误删/解压错误导致的求助 **归零**；
- 启动包体积从 903 MB 降到 **≤ 120 MB**，100 Mbps 下安装 **≤ 3 分钟**；
- 启动器内可见全部社团整合包、分类与版本，不再依赖群文件逐个查找；
- 整合包更新可被发现：打开实例页即见「可更新」，并附带更新日志；
- 完成品牌独立与合规义务（改名、归属声明、统计前缀、源码公开）；
- 与上游差异最小化，保持每两周一次 rebase 的能力。

### 2.3 阶段目标

| 阶段 | 范围 | 产出 | 状态 |
| --- | --- | --- | --- |
| S0 | 品牌、预置认证、更新通道、合规 | 可编译可发版的分叉骨架 | ✅ |
| S1 | 首启引导、服务器预置 | 首个面向新生的可用版本 | ✅ |
| S1.5 | 启动包分发：mrpack 流水线 + 一键安装 | 新玩家无需手动装 mods | ⬜ |
| S1.6 | 云整合包目录：多包浏览、计数、安装与更新 | 多包线统一入口 | ⬜ |
| S2 | 邀请码、白名单、服务器在线状态 | 减少人工审批 | ⬜ 依赖后台 |
| S3 | 签名、发布流水线、源码公开 | 正式对外分发 | ⬜ |

---

## 3. 用户故事

本章按阶段组织。每个 US 都是可以在一到两次专注开发内完成的小需求；已完成的保留为回归基线。

阅读约定：

- `[x]` = 已实现，`[ ]` = 未实现；新增或修改验收标准时，必须保持可勾选、可复现，禁止「工作正常」这类模糊表述。
- 改代码的 US 必须包含工程校验（下文简写为 `tsc --noEmit` / `cargo fmt --check`，实际在仓库根执行：前端 `pnpm lint`、`pnpm exec tsc --noEmit`；后端 `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`、`cargo check --manifest-path src-tauri/Cargo.toml`；文案改动加 `pnpm locale diff`）。
- 涉及 UI 的 US 必须包含「在浏览器中用 `sjmcl-frontend-dev-preview` 验证」，并说明看到的界面状态。
- 角色统一使用：新玩家、老玩家、社团维护者、管理员。

| 阶段 | 用户故事 | 状态 |
| --- | --- | --- |
| S0 | US-001 ~ US-006 | ✅ |
| S1 | US-007 ~ US-010 | ✅（其中 US-007 为 ⚠️） |
| S1.5 | US-011 ~ US-015 | ⬜ |
| S1.6 | US-016 ~ US-022 | ⬜ |
| S2 | US-023 ~ US-025 | ⬜ |
| S3 | US-026 ~ US-030 | ⬜ |

### 3.1 S0 品牌与合规（✅ 已完成）

#### US-001：品牌与标识替换 ✅

**描述：** 作为新玩家，我希望下载安装后看到的是「仙建世界客户端」而不是上游 SJMCL 的品牌，以便确认自己拿到的是社团官方版本。

**实现位置：** `src-tauri/tauri.conf.json`、`src-tauri/tauri.{macos,windows,linux}.conf.json`、`package.json`、`src-tauri/Cargo.toml`、`src/locales/*.json`

**验收标准：**

- [x] `productName`、窗口标题、关于页显示名均为「仙建世界客户端」；拉丁语言环境为 `Xianjian Client`
- [x] identifier 为 `com.xauatcraft.launcher`，与上游不同，配置、账号、实例目录互不干扰
- [x] 版本号独立于上游，从 `0.1.0` 起算，并同时写入 `package.json`、`Cargo.toml`、`tauri.conf.json`
- [x] `pnpm build`、`pnpm lint` 与 `tsc --noEmit` 通过
- [x] macOS 与 Linux 构建产物可正常启动
- [x] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证关于页品牌文案；窗口标题在实机启动时确认

#### US-002：预置仙建世界认证服务器 ✅

**描述：** 作为新玩家，我希望在账号页直接选到「仙建世界皮肤站」，以便不用手抄认证服务器 URL。

**实现位置：** `src-tauri/src/account/helpers/authlib_injector/constants.rs`

**验收标准：**

- [x] `PRESET_AUTH_SERVERS` 在保留上游 3 项的前提下追加 `https://skin.xauatcraft.com/api/yggdrasil`，不删改原有项
- [x] 全新安装（无历史配置）启动后，账号页认证服务器列表可直接选择「仙建世界皮肤站」
- [x] `cargo fmt --check` 与 `cargo check` 通过
- [x] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证账号页下拉项与显示名

> 说明：若后续要让皮肤站支持 Yggdrasil Connect 的 OAuth 登录（而非账号密码），需在皮肤站注册 client_id 并登记到 `CLIENT_IDS`。本期不做。

#### US-003：社团更新通道 ✅

**描述：** 作为已安装的玩家，我希望启动器从社团服务检查并下载新版本，以便不依赖上游更新源。

**实现位置：** `src-tauri/src/launcher_config/helpers/updater.rs`、`commands.rs`、`models.rs`、`src/models/config.ts`、`src/components/modals/notify-new-version-modal.tsx`

**验收标准：**

- [x] 构建期通过 `XJMC_UPDATE_BASE` / `XJMC_UPDATE_APP_ID` 注入服务地址与应用 ID（契约见 §7.2）
- [x] 更新检查只请求 `GET {XJMC_UPDATE_BASE}/api/app/{XJMC_UPDATE_APP_ID}/latest`，不回落到上游地址
- [x] 两个变量任一为空时，启动不报错、不进行任何更新检查（不弹更新）
- [x] 仅当 `build_type == Release` 且当前版本为合法 semver 时检查
- [x] 按 `softUrl` 中的平台/架构关键字打分，未命中当前操作系统时视为无更新
- [x] 按平台完成安装：Windows 安装版 `/UPDATE /P`、便携版脚本替换后重启、macOS 解包替换 `.app`、Linux 赋予执行权限后 `xdg-open`
- [x] 更新接口不可用时只记录日志，不阻断启动
- [x] `cargo fmt --check`、`cargo check`、`tsc --noEmit` 通过
- [x] `0.1.0` → `0.1.1` 可完成检查、下载、安装、重启
- [x] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证「发现新版本」弹窗

#### US-004：默认下载源切换 ✅

**描述：** 作为新玩家，我希望首次安装后默认走国内镜像，以便下载更快、更少失败。

**实现位置：** `src-tauri/src/launcher_config/models.rs`

**验收标准：**

- [x] 全新安装默认下载源为 `mirror`（BMCLAPI 优先）
- [x] 设置页仍可切换回「官方源」与「自动」
- [x] `cargo check` 通过
- [x] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证设置页下载源选项与当前值

#### US-005：多语言品牌文案 ✅

**描述：** 作为使用非中文语言的玩家，我希望界面品牌文案是完整的本地化版本，以便不出现中英混杂。

**实现位置：** `src/locales/*.json`

**验收标准：**

- [x] 7 种语言（en / es / fr / ja / lzh / zh-Hans / zh-Hant）的品牌文案全部替换
- [x] `pnpm locale diff` 无差异，7 个语言文件 key 完全一致
- [x] `tsc --noEmit` 通过
- [x] 在浏览器中用 `sjmcl-frontend-dev-preview` 抽查 zh-Hans、zh-Hant、en 三种语言

#### US-006：合规声明与统计前缀 ✅

**描述：** 作为社团维护者，我希望分发版本满足 SJMCL 附加条款，以便合法使用并持续跟进上游。

**实现位置：** `src-tauri/src/utils/sys_info.rs`、`README.md`

**验收标准：**

- [x] 统计上报的版本号带 `XJ-` 前缀（≥2 字母）
- [x] README 显著声明「基于 SJMCL 开发」并给出上游仓库地址
- [x] 预置认证服务器等预置接口只增不删
- [x] `cargo check` 与 `tsc --noEmit` 通过
- [x] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证关于页归属声明与上游链接

> 说明：GPLv3 要求分发版本的源码公开，已列入 S3（US-030）。

### 3.2 S1 开箱闭环（✅ 已完成，US-007 有已知偏差）

#### US-007：首启入服清单 ⚠️

**描述：** 作为新玩家，我希望首次启动就看到「注册 → 登录 → 进服」的步骤清单，以便不用翻群文件手册。

**实现位置：** `src/components/modals/first-run-guide-modal.tsx`、`src/components/special/shared-modals-provider.tsx`、`src/components/modals/welcome-and-terms-modal.tsx`

**验收标准：**

- [x] 同意用户协议后弹出「入服清单」弹窗，包含四项：安装 Java、注册皮肤站、添加账号、创建/导入实例
- [x] 四项均可直接操作：安装 Java 跳设置页 Java 管理（复用 Mojang JRE 下载弹窗）、注册皮肤站打开皮肤站链接、添加账号打开账号页、创建/导入实例进入实例页
- [x] 已完成项显示状态徽标
- [x] 可从「帮助」页随时重新打开
- [x] 全新机器上按入服清单完成安装与登录，全程无需手动修改认证服务器设置（端到端 ≤ 8 分钟验收见 US-012 / US-014）
- [x] `pnpm lint`、`tsc --noEmit` 通过
- [x] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证四项状态与重开路径

**已知偏差：** Java 一步目前跳转到设置页，尚未做到在同一条弹窗内一键安装（是否合并待定，见 §9 待决事项第 9 条）。

#### US-008：实例预置服务器列表 ✅

**描述：** 作为新玩家，我希望实例创建后服务器列表里已经有「仙建世界」，以便不需要手动输入服务器地址。

**实现位置：** `src-tauri/src/instance/constants.rs`、`src-tauri/src/instance/helpers/server.rs`、`src-tauri/src/instance/helpers/misc.rs`

**验收标准：**

- [x] 实例首次被发现时写入 `servers.dat`，包含 `play.xauatcraft.com` /「仙建世界」
- [x] 仅在 `servers.dat` 不存在时写入；玩家编辑或清空服务器列表后不会被重新塞回
- [x] `cargo fmt --check`、`cargo check` 通过
- [x] 在浏览器中用 `sjmcl-frontend-dev-preview` 打开一个已写入的实例，确认服务器列表显示「仙建世界」

#### US-009：关于页社团分组与致谢 ✅

**描述：** 作为玩家，我希望在关于页找到官网、皮肤站、QQ 群与源码仓库，以便获取帮助与反馈。

**实现位置：** `src/pages/settings/about.tsx`、`src/locales/*.json`

**验收标准：**

- [x] 关于页新增「仙建世界」分组，含官网 / 皮肤站 / 玩家 QQ 群
- [x] 源代码入口指向本仓库
- [x] 上游 SJMCL 移入致谢区，并保留上游仓库地址（同时满足附加条款第 2 条）
- [x] `pnpm locale diff` 无差异；`tsc --noEmit` 通过
- [x] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证三个链接可点击且地址正确

#### US-010：帮助页新手引导入口 ✅

**描述：** 作为回访玩家，我希望在帮助页重新打开入服清单，以便补做未完成的步骤。

**实现位置：** `src/pages/settings/help.tsx`

**验收标准：**

- [x] 帮助页新增「新手引导」入口，点击后重新打开入服清单
- [x] `tsc --noEmit` 通过
- [x] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证入口位置与弹窗行为

### 3.3 S1.5 启动包分发（⬜ 规划中：P0 1~2 人日 + P1 2~3 人日）

#### US-011：产出 8.1.0 mrpack 发行包（P0，pack 仓库侧）

**描述：** 作为社团维护者，我希望用 CI 从现有 PCL 包生成带校验的 mrpack，以便玩家不再下载 903 MB 的群文件包。

**实现位置：** 独立 `pack/` 仓库（与启动器仓库分离）：`pack.json`、`mods.lock.json`、`overrides/`、`tools/verify.mjs`、`tools/from-pcl.py`、`tools/diff-pack.py`

**验收标准：**

- [ ] tag `v8.1.0` 触发 CI，产出 `xianjian-8.1.0.mrpack` 与 `latest.json`（含整包 sha256、体积、更新时间、更新说明）
- [ ] `mods.lock.json` 为唯一事实来源，逐项包含 `path / url / sha1 / size / license`
- [ ] 去重后 mod 数为 21：CI 拒绝重复 sha1 与重复模组 id；首个包修正 v8.0.0 中重复的 sodium
- [ ] 包内不含 `libraries/`、`assets/`、`versions/*.jar`、`saves/`、`screenshots/`、`logs/`、`usercache.json`、`servers.dat` 与任何账号凭据
- [ ] `overrides/` 中不出现 jar；`options.txt` 已移除 `lastServer` 等本机痕迹
- [ ] `dependencies` 锁定 `minecraft: 26.2` 与 `fabric-loader: 0.19.5`，不使用范围版本
- [ ] 包体积 ≤ 120 MB（预期约 113 MB，约为原 903 MB 的 12.5%）
- [ ] 主源（`{PACK_CDN}`）与备源（GitHub Release）均返回 200，`Content-Length` 与 `fileSize` 一致
- [ ] CI 卫生检查覆盖：重复模组、个人数据、`..` 路径、`overrides/` 内 jar
- [ ] `tools/from-pcl.py` 可重复执行，且在命中重复文件时报错退出、由人确认
- [ ] 官网与群文件发布 `.mrpack` 下载链接；P1 完成后首启引导按钮直接指向该包，群文件只作兜底
- [ ] 附录 C.13 发版检查单逐项通过

> 粒度说明：本故事是 P0 的一次性交付里程碑（约 1~2 人日），覆盖 pack 仓库、CI 与两个一次性脚本，由 pack 仓库维护者一次完成，不再按文件拆分为多个故事。

#### US-012：手动导入整合包得到等价实例（P0，零代码路径）

**描述：** 作为新玩家，我希望下载 `.mrpack` 后在启动器内导入就得到与 v8.0.0 等价的实例，以便直接登录进服。

**实现位置：** 现有链路 `src/components/modals/import-modpack-modal.tsx` → `retrieve_modpack_meta_info` → `fetchGameVersionSpecific` → `create_instance`（`src-tauri/src/instance/commands.rs`）

**验收标准：**

- [ ] 导入 8.1.0 包后，mods 与基准清单 sha1 一致（21 个，无重复）
- [ ] 安装完成后 `servers.dat` 已含预置服务器，认证服务器可选「仙建世界皮肤站」，无需手动修改任何认证设置
- [ ] 同一份包在 `mirror` 与 `official` 两种下载源下均可完成安装
- [ ] 从安装到进入主城 ≤ 8 分钟，其中包安装 ≤ 3 分钟（100 Mbps）
- [ ] 包必须自带 `fabric-api`（导入整合包时不会自动补装）
- [ ] 实例落在已配置的游戏目录内；未配置游戏目录时给出明确提示
- [ ] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证导入弹窗的包信息预览与确认流程

#### US-013：一键安装启动包（P1，客户端）

**描述：** 作为新玩家，我希望在首启引导里点一下就能装好社团整合包，以便不经过「下载 → 选文件 → 导入」三步。

**实现位置：** `src-tauri/src/instance/commands.rs`（新增 `install_club_pack`）、`src-tauri/src/instance/helpers/modpack/import.rs`、`src-tauri/src/launcher_config/models.rs`、`.env.template`、`src-tauri/build.rs`、`src/components/modals/first-run-guide-modal.tsx`、`src/pages/instances/add-import.tsx`、`src/locales/*.json`

**验收标准：**

- [ ] 构建期注入 `XJMC_PACK_URL` / `XJMC_PACK_SHA256`（沿用 `.env` + `build.rs` 机制）；任一为空时隐藏入口
- [ ] 新增命令 `install_club_pack`：下载整包到临时目录 → 校验 sha256 → 解析版本元信息 → 复用 `create_instance` → 返回实例摘要与任务组 ID
- [ ] 一键安装入口出现在首启引导第 4 项（改为「安装仙建世界整合包」）、实例页空状态、帮助页三处
- [ ] 一键安装后 mods 与基准清单 sha1 一致（21 个，无重复）
- [ ] 安装 8.1.0 后旧实例与存档不受影响（安装新版本 = 新建实例）
- [ ] 安装失败时给出可操作提示（详见 US-015）
- [ ] `cargo fmt --check`、`cargo check`、`tsc --noEmit` 通过
- [ ] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证三处入口的可见性与空态

#### US-014：安装后一键启动（P1，前端编排）

**描述：** 作为新玩家，我希望包装好后直接看到「启动游戏」，以便不用回实例页手动找实例点启动。

**实现位置：** 前端编排层（参考 `src/components/modals/launch-process-modal.tsx:152-240` 的四步命令序列），串联「创建 → 等待任务组完成 → 选中实例 → 启动」

**验收标准：**

- [ ] 安装完成后自动选中新实例并展示「启动游戏」按钮
- [ ] 点击后依次完成「创建实例 → 等待下载任务组完成 → 选中实例 → 启动」，任一步失败可重试
- [ ] 下载任务组进行中显示进度
- [ ] 从点击一键安装到进入主城 ≤ 8 分钟，其中包安装 ≤ 3 分钟（100 Mbps）
- [ ] 后端不新增总编排命令，编排只在前端完成
- [ ] `pnpm lint`、`tsc --noEmit` 通过
- [ ] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证进度态、成功态与重试路径

#### US-015：启动包安装失败诊断（P1）

**描述：** 作为遇到安装失败的玩家，我希望看到具体原因和下一步操作，以便不把镜像或网络问题误判为启动器故障。

**实现位置：** 前后端错误提示（`install_club_pack` 与下载任务组的错误映射），文案同步 7 个语言文件

**验收标准：**

- [ ] MC 26.2 或 Fabric 0.19.5 在镜像站不可用时，提示切换下载源重试，并给出可复制的版本号
- [ ] 文件 404 或 sha1 不匹配时，指出具体文件路径与期望哈希，提供「重试」与备源切换
- [ ] 断网时给出可操作提示（检查网络 / 重试 / 切换备源），而非泛化「安装失败」
- [ ] Java 版本 < 25 时，引导至 Java 管理并说明包要求的最低版本
- [ ] 包版本高于客户端支持时，提示先更新启动器（读取 `minLauncherVersion`）
- [ ] 重复 mod 或清单损坏时，在导入前拒绝并给出发版方可见的错误码
- [ ] `cargo check`、`tsc --noEmit` 通过
- [ ] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证至少三类错误的提示文案与操作入口

### 3.4 S1.6 云整合包服务（⬜ 规划中：P0 1~2 人日 + P1 3~4 人日）

#### US-016：云整合包目录浏览与计数

**描述：** 作为玩家，我希望在启动器里浏览社团所有包及分类计数，以便不用在群文件里逐个翻找。

**实现位置：** `src/pages/packs/*`、`src/components/modals/cloud-pack-modal.tsx`、`src-tauri/src/instance/helpers/pack_catalog.rs`

**验收标准：**

- [ ] 从「实例 → 添加/导入 → 云整合包」进入目录页
- [ ] 页头显示「共 N 个整合包 · 基础 a / 小游戏 b / 模组服 c」，计数与服务端 `total` / `counts` 一致
- [ ] 分类 tab 带计数并支持筛选；支持搜索
- [ ] 卡片展示图标、名称、分类、MC 版本 + 加载器、大小、更新时间、已装版本（若有）
- [ ] 列表为空、搜索无结果、包已下架三种状态有明确提示
- [ ] `cargo check`、`tsc --noEmit` 通过
- [ ] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证目录页数量、筛选与空态

#### US-017：目录缓存与离线可用

**描述：** 作为网络不稳定的玩家，我希望目录能显示上次缓存内容并标注离线，以便仍能安装可下载的包。

**实现位置：** `src-tauri/src/instance/helpers/pack_catalog.rs`、前端缓存层

**验收标准：**

- [ ] 目录缓存为内存 + 磁盘（`pack-catalog.json`），TTL 10 分钟
- [ ] 静态目录使用 `If-Modified-Since` / 内容 sha256；API 模式使用 `ETag` / `If-None-Match`
- [ ] 打开页面先渲染缓存，再后台刷新（stale-while-revalidate）
- [ ] 离线时显示上次成功时间与「离线」标记；文件可下载时仍可安装，否则提示稍后重试
- [ ] 目录请求失败只记录日志，不阻塞启动器启动
- [ ] `cargo check`、`tsc --noEmit` 通过
- [ ] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证断网/超时后的缓存渲染与离线标记

#### US-018：从目录安装指定包与版本

**描述：** 作为玩家，我希望从目录直接安装包并记录版本，以便后续收到更新提示。

**实现位置：** `install_cloud_pack`（`src-tauri/src/instance/commands.rs`）、`pack_ref`（`src-tauri/src/instance/models/misc.rs`）、`src/components/modals/cloud-pack-modal.tsx`

**验收标准：**

- [ ] 详情页默认选中 `latestVersion`，可切换历史版本
- [ ] `install_cloud_pack(packId, version)`：下载（进度、重试、备源切换）→ 下载引擎校验 sha1 → 导入前校验 sha256 → `create_instance` → 写入 `pack_ref`
- [ ] `pack_ref = { id, version, channel, installedAt }` 记录于实例
- [ ] 安装完成提示「启动游戏」
- [ ] 分别从目录安装 `base` 与小游戏包各一次，均可进服
- [ ] 磁盘不足时按 `sizeBytes` 估算并提示
- [ ] 非白名单下载域或 sha1 / sha256 不匹配时中止安装，并展示期望值与实际值
- [ ] `cargo fmt --check`、`cargo check`、`tsc --noEmit` 通过
- [ ] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证详情页版本切换与安装进度

#### US-019：包更新提示与更新日志

**描述：** 作为已装包的玩家，我希望打开实例页就看到「可更新」，以便及时跟进新版本。

**实现位置：** `check_pack_updates()`、实例卡片徽标、`src/models/config.ts`

**验收标准：**

- [ ] 实例页加载时调用 `check_pack_updates()`，按 `pack_ref.id` 匹配目录并比较版本
- [ ] 有更新时实例卡片显示「可更新 vX → vY」，详情展示 `changelog`；已安装 base 8.0.0 时显示「可更新 8.1.0」
- [ ] 点击更新后安装新版本，实例名默认「<包名> <版本>」，重名时追加序号
- [ ] 旧实例与存档原样保留
- [ ] 无 `pack_ref` 的本地导入实例不参与更新检查
- [ ] 只提示、不自动下载
- [ ] `cargo fmt --check`、`cargo check`、`tsc --noEmit` 通过
- [ ] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证更新徽标、日志与新建实例结果

#### US-020：目录安全与下架治理

**描述：** 作为社团维护者，我希望目录与包文件都受校验与治理约束，以便下架或替换不影响已安装玩家。

**实现位置：** `src-tauri/src/instance/helpers/pack_catalog.rs` 校验逻辑、目录契约（附录 D.3）

**验收标准：**

- [ ] 下载域白名单为 `{PACK_CDN}` 与 GitHub Release，其他域拒绝
- [ ] 目录哈希 + 文件哈希双重校验
- [ ] `isActive=false` 的包在目录中置灰、安装禁用，已安装实例照常启动
- [ ] `changelog` 必填；版本 tag 与目录条目一一对应
- [ ] `cargo fmt --check`、`cargo check`、`tsc --noEmit` 通过
- [ ] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证下架包卡片状态

#### US-021：首页云整合包小组件

**描述：** 作为玩家，我希望首页显示「云整合包 N · 可更新 M」，以便知道有新内容。

**实现位置：** 首页小组件、目录缓存

**验收标准：**

- [ ] 首页小组件显示「云整合包 N · 可更新 M」，数据来自目录缓存
- [ ] 点击卡片跳转到云整合包目录页
- [ ] 目录不可用时小组件隐藏，不影响首页其他内容
- [ ] `tsc --noEmit` 通过
- [ ] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证数字与跳转

#### US-022：发现页新增 xauatcraft 整合包源（S1.6 的 P1.5 子阶段）

**描述：** 作为习惯「发现页」的玩家，我希望在整合包下载源里看到社团包，以便从熟悉的入口安装。

**实现位置：** `OtherResourceSource`（`src-tauri/src/resource/commands.rs:109-115`、`:124-129`、`:187-195`、`:249-255`）、`src/components/resource-downloader.tsx:96-103`、`DownloadModpackModal`

**验收标准：**

- [ ] `OtherResourceSource` 新增 `XauatCraft`，仅在 `modpack` 源列表出现
- [ ] 该源渲染云整合包目录组件（复用 US-016 的列表 / 详情 / 计数）
- [ ] 安装走 `install_cloud_pack`，不走 `modpack-wo-install` 下载组
- [ ] `DownloadModpackModal` 的 `initialDownloadSource` 接受 `XauatCraft`，「发现 → 整合包 → xauatcraft」直接落到目录
- [ ] 后端四处 `match` 补齐，未匹配分支不再返回 `NoDownloadApi`
- [ ] `cargo fmt --check`、`cargo check`、`tsc --noEmit` 通过
- [ ] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证源切换与目录渲染

### 3.5 S2 社群功能（⬜ 依赖后台，约 4~5 人日）

> 前置条件：Blessing Skin 侧提供邀请码/白名单接口。若后台尚未立项，S2 顺延；接口契约与鉴权方式见 §9。

#### US-023：邀请码申请与审核状态

**描述：** 作为想加入社团的玩家，我希望在启动器里申请邀请码并查看审核状态，以便不用在群里等管理员。

**实现位置：** 新增社团接口服务层与对应页面/弹窗

**验收标准：**

- [ ] 提供申请入口，提交后显示当前状态（待审核 / 已通过 / 已拒绝）
- [ ] 接口不可用时提示稍后重试，不影响启动器其他功能
- [ ] `cargo check`、`tsc --noEmit` 通过
- [ ] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证申请与状态展示

#### US-024：白名单申请与状态查询

**描述：** 作为已完成注册的玩家，我希望申请白名单并查看进度，以便知道何时能进服。

**实现位置：** 新增只读 API 调用，不直连 RCON

**验收标准：**

- [ ] 可提交白名单申请并查询状态
- [ ] 客户端只读 API，不直连 RCON
- [ ] `cargo check`、`tsc --noEmit` 通过
- [ ] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证状态展示

#### US-025：服务器在线状态小组件

**描述：** 作为玩家，我希望在首页看到服务器是否在线与在服人数，以便判断现在是否适合进服。

**实现位置：** 首页小组件、社团接口服务层

**验收标准：**

- [ ] 首页小组件显示服务器在线状态与在服人数
- [ ] 请求失败时显示「未知」而不报错
- [ ] `tsc --noEmit` 通过
- [ ] 在浏览器中用 `sjmcl-frontend-dev-preview` 验证正常态与失败态

### 3.6 S3 发布工程（⬜ 约 3~4 人日）

#### US-026：发布产物与流水线品牌化

**描述：** 作为社团维护者，我希望发布产物与流水线都使用社团命名，以便玩家不会误装上游版本。

**实现位置：** `.github/workflows/build.yml`、`release.yml`、`sign-macos.yml`

**验收标准：**

- [ ] 产物前缀改为 `XJMC_`，同步修改 `build.yml` / `release.yml` / `sign-macos.yml`
- [ ] 停用上游专用发布流程（winget / AUR / snap / post-release-publish / nightly）
- [ ] CI 正确注入更新服务变量（`XJMC_UPDATE_*`）
- [ ] CI 在 Windows / macOS / Ubuntu 三个 runner 上分别执行 `pnpm tauri build`，产出对应平台安装包

#### US-027：Windows 代码签名与 macOS 公证

**描述：** 作为玩家，我希望安装包不被杀软拦截、macOS 不提示「无法验证开发者」，以便顺利安装。

**实现位置：** CI 签名步骤、证书与密钥管理

**验收标准：**

- [ ] Windows 安装包与便携版带社团代码签名证书
- [ ] macOS 产物完成公证，首次打开无「无法验证开发者」阻断
- [ ] 签名流程纳入 CI，证书与密钥不入库

#### US-028：自建更新资产上传脚本

**描述：** 作为社团维护者，我希望发版后自动把产物上传到社团更新服务，以便客户端能检查到新版本。

**实现位置：** 发版脚本（对齐 Downloader 接口）

**验收标准：**

- [ ] 脚本对接 `POST /api/app/{id}`、`POST /api/release`、`POST /api/soft/upload`
- [ ] 发版后自动上传全部平台产物，并验证 `/latest` 返回的 `softUrl` 可下载
- [ ] 脚本支持失败重试

#### US-029：品牌素材替换

**描述：** 作为玩家，我希望安装器、DMG 与应用图标都是社团版本，以便确认安装的是仙建世界客户端。

**实现位置：** 图标、安装器侧边图、DMG 背景等资源

**验收标准：**

- [ ] 图标、安装器侧边图、DMG 背景等素材替换为社团版本
- [ ] macOS `.app` 内应用名显示「仙建世界客户端」
- [ ] 在 Windows 与 macOS 各验证一次安装界面与图标

#### US-030：GPLv3 源码公开

**描述：** 作为社团维护者，我希望分发版本的完整源码公开，以便满足 GPLv3 义务。

**实现位置：** 公开源码仓库、README 与关于页

**验收标准：**

- [ ] 分发版本的完整源码公开可访问，许可证与附加条款随仓库提供
- [ ] README 与关于页给出源码仓库地址
- [ ] 每次发版的 git tag 与产物版本号一致，可从 tag 追溯到对应源码提交

---

## 4. 功能需求

编号 FR-1 起，按阶段分组。「系统」指分叉后的仙建世界客户端。

### 4.1 S0 品牌与合规

- FR-1：系统必须在窗口标题、关于页与安装包元信息中显示产品名「仙建世界客户端」，拉丁语言环境显示 `Xianjian Client`。
- FR-2：系统必须以 `com.xauatcraft.launcher` 作为 identifier（决定用户数据目录，发布后不可再改），且版本号从 `0.1.0` 起独立计算。
- FR-3：账号页的认证服务器列表必须预置 `https://skin.xauatcraft.com/api/yggdrasil`，且不得删除或修改上游已有的 3 个预置项。
- FR-4：当 `XJMC_UPDATE_BASE` 与 `XJMC_UPDATE_APP_ID` 均非空、构建类型为 Release 且当前版本为合法 semver 时，系统必须请求 `GET {XJMC_UPDATE_BASE}/api/app/{XJMC_UPDATE_APP_ID}/latest`；否则不得发起任何更新请求。
- FR-5：系统必须从返回的 `softs[].softUrl` 中按平台/架构关键字打分选择安装包；未命中当前操作系统时必须视为无可用更新。
- FR-6：系统在命中更新后必须按平台安装：Windows 安装版运行安装器（`/UPDATE /P`）、便携版由脚本替换 exe 后重启、macOS 等待进程退出后解包替换 `.app`、Linux 赋予可执行权限后交给 `xdg-open`（本期不做原地替换）。
- FR-7：全新安装的默认下载源必须为 `mirror`（BMCLAPI 优先）；设置页必须保留切换回官方源/自动的入口。
- FR-8：系统统计上报的版本号必须带 `XJ-` 前缀。
- FR-9：系统必须在 README 与关于页显著声明基于 SJMCL 开发，并给出上游仓库地址。
- FR-10：7 种语言的品牌文案必须全部替换，且 7 个语言文件的 key 集合必须完全一致。
- FR-11：更新接口不可用时，系统必须只记录日志、不阻断启动。

### 4.2 S1 开箱闭环

- FR-12：用户同意用户协议后，系统必须弹出「入服清单」弹窗，包含「安装 Java、注册皮肤站、添加账号、创建/导入实例」四项，且每项均可直接操作并显示完成状态。
- FR-13：帮助页必须提供「新手引导」入口，点击后重新打开入服清单。
- FR-14：实例首次被发现时，若 `servers.dat` 不存在，系统必须写入预置服务器 `play.xauatcraft.com`（名称「仙建世界」）；文件已存在时不得改写。
- FR-15：关于页必须新增「仙建世界」分组（官网 / 皮肤站 / 玩家 QQ 群）；源代码入口指向本仓库，上游 SJMCL 移入致谢区。

### 4.3 S1.5 启动包分发

- FR-16：构建期必须支持注入 `XJMC_PACK_URL` 与 `XJMC_PACK_SHA256`；任一为空时客户端必须隐藏一键安装入口。
- FR-17：系统必须提供 `install_club_pack`：下载整包到临时目录 → 校验 sha256 → 解析版本元信息 → 复用 `create_instance` → 返回实例摘要与任务组 ID。
- FR-18：一键安装入口必须出现在首启引导第 4 项、实例页空状态与帮助页三处。
- FR-19：安装完成后，前端必须完成「创建实例 → 等待任务组完成 → 选中实例 → 启动游戏」编排，后端不新增总编排命令。
- FR-20：包内必须自带 `fabric-api`；导入整合包时系统不得自动补装 Fabric API。
- FR-21：实例必须落在已配置游戏目录的 `versions/` 下；未配置时必须给出明确提示。
- FR-22：启动包必须为 Modrinth mrpack：mods 走 `files[]`（sha1 + 多源），config / 资源包 / 光影走 `overrides/`；`libraries/`、`assets/`、客户端 jar、`saves/`、`screenshots/`、`logs/` 与账号信息不得进包。
- FR-23：包的 `dependencies` 必须锁定 `minecraft: 26.2` 与 `fabric-loader: 0.19.5`，不得使用范围版本。
- FR-24：8.1.0 包体积必须 ≤ 120 MB；每次发布必须保留上一版本文件，回滚功能在 P2 提供。
- FR-25：安装新版本必须新建实例，不得原地替换；旧实例与存档必须保留。

### 4.4 S1.6 云整合包服务

- FR-26：目录契约必须为 `GET {PACK_CDN}/packs.json`（静态）或 `{PACK_API}/api/packs`（独立服务），字段见附录 D.2 / D.3。
- FR-27：目录页必须显示总数与分类计数（`base` / `minigame` / `modded` / `other`），计数以服务端 `total` / `counts` 为准。
- FR-28：目录必须支持分类筛选、搜索与历史版本切换。
- FR-29：目录必须缓存于内存 + 磁盘（`pack-catalog.json`），TTL 10 分钟，并采用 stale-while-revalidate。
- FR-30：目录请求失败时系统必须只记录日志、不阻塞启动；离线时必须展示缓存与「离线」标记。
- FR-31：系统必须提供 `install_cloud_pack(packId, version)`：下载 → sha1 校验 → 导入前 sha256 校验 → `create_instance` → 写入 `pack_ref`。
- FR-32：实例必须记录 `pack_ref = { id, version, channel, installedAt }`；无 `pack_ref` 的实例不参与更新检查。
- FR-33：实例页加载时必须调用 `check_pack_updates()`；有更新时必须显示「可更新 vX → vY」与 `changelog`。
- FR-34：系统必须只提示更新、不自动下载；更新安装必须新建实例，实例名默认「<包名> <版本>」，重名追加序号。
- FR-35：下载域白名单必须为 `{PACK_CDN}` 与 GitHub Release，并对整包与单文件双重哈希校验。
- FR-36：`isActive=false` 的包必须在目录中置灰并禁用安装；已安装实例必须照常启动。
- FR-37：首页必须提供「云整合包 N · 可更新 M」小组件。
- FR-38：「发现 → 整合包」源列表必须新增 `XauatCraft`，该源直接渲染云整合包目录，安装复用 `install_cloud_pack`。

### 4.5 S2 社群功能

- FR-39：系统必须提供邀请码申请与审核状态查询入口，依赖 Blessing Skin 侧接口。
- FR-40：系统必须提供白名单申请与状态查询入口，且客户端只读 API、不直连 RCON。
- FR-41：首页小组件必须展示服务器在线状态与在服人数。

### 4.6 S3 发布工程

- FR-42：发布产物前缀必须为 `XJMC_`，并同步修改 `build.yml` / `release.yml` / `sign-macos.yml`。
- FR-43：上游专用发布流程（winget / AUR / snap / post-release-publish / nightly）必须停用。
- FR-44：Windows 产物必须使用社团代码签名证书签名；macOS 产物必须完成公证。
- FR-45：自建更新资产上传脚本必须对接 Downloader 的 `POST /api/app/{id}`、`POST /api/release`、`POST /api/soft/upload`。
- FR-46：图标、安装器侧边图、DMG 背景等品牌素材必须替换为社团版本。
- FR-47：分发版本的完整源码必须公开（GPLv3）。

---

## 5. 非目标

- 不自研启动内核：不重写下载、启动、实例管理逻辑；
- 不做 CurseForge / Modrinth 的商店化改造；
- 不做多社团 SaaS 化，不做面向其他社团的包市场；
- 不删除上游功能（扩展系统、MCP 保持原样；发现页仅在整合包源列表叠加 xauatcraft 入口，见 US-022）；
- 不为启动包自研格式（mrpack 之外不引入自有必需格式）；
- 不做后台服务：邀请码审核、白名单审批、皮肤站自身不在本项目范围；
- 本期不做：增量更新与回滚（P2）、Ed25519 签名（P2）、`xjmc.pack.json` 超集字段（P2）、`beta` 渠道（P1 只实现 `stable`）；
- 不做旧 PCL 包到 mrpack 的自动迁移工具——`tools/from-pcl.py` 仅用于打包侧，不随客户端分发；
- 不做移动端 / 主机端版本。

---

## 6. 设计考虑

### 6.1 首启入服清单

- 位置：用户协议同意后立即弹出，替代上游通用导览。
- 结构：四项，每项 = 状态徽标 + 一句话说明 + 主操作按钮。
- 操作落点：安装 Java → 设置页 Java 管理（复用 Mojang JRE 下载弹窗）；注册皮肤站 → 打开皮肤站链接；添加账号 → 账号页；创建/导入实例 → 实例页。
- 重开：帮助页「新手引导」。
- 文案：7 语言，随品牌文案一起维护。
- 后续：S1.5 起第 4 项改为「安装仙建世界整合包」（US-013）。

### 6.2 云整合包页

- 入口：实例 → 添加/导入 → 云整合包。
- 首屏：页头「共 N 个整合包 · 基础 a / 小游戏 b / 模组服 c」；分类 tab 带计数；搜索框。
- 卡片：图标、名称、分类、MC 版本 + 加载器、大小、更新时间、已装版本。
- 详情：版本列表（默认最新）、changelog、安装按钮；下架包禁用。
- 状态：加载中（缓存优先）、空态、搜索无结果、离线、目录错误。
- 复用：列表 / 卡片尽量复用 S1.5 的包展示；弹窗参考 `src/components/modals/import-modpack-modal.tsx`。

### 6.3 实例卡片与更新提示

- 徽标「可更新 vX → vY」；详情弹窗展示 `changelog`；不自动下载。
- 更新 = 新建实例，实例名「<包名> <版本>」；旧实例保留。

### 6.4 首页小组件与帮助页

- 首页：云整合包数量 / 可更新数（S1.6）、服务器在线状态（S2）。
- 帮助页：新手引导入口（已有）+ 一键安装启动包入口（S1.5；云整合包目录入口在实例 → 添加/导入，见 S1.6）。

### 6.5 素材与文案

- 图标、启动图、安装器侧边图、DMG 背景待提供（见 §9）。
- 所有新增文案必须同步 7 个语言文件，一级 key 按字母序。

---

## 7. 技术考虑

### 7.1 与上游的关系

- 约束：只加不删、差异最小化、保留 rebase 能力；删除上游代码会持续放大合并冲突。
- 品牌与功能差异集中在 `tauri*.conf.json`、`constants.rs`、`updater.rs`、`locales/*`、`README.md`、`docs/` 等少量文件，完整清单见附录 A。
- 每两周 rebase 一次上游。

### 7.2 更新服务契约（XJMC）

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

选择规则：按 `softUrl` 中的平台/架构关键字打分，**必须命中当前操作系统**才会被选中，否则视为无可用更新（FR-5）。

安装包命名约定（与现有 CI 产物一致，供匹配使用）：

```
SJMCL_<version>_<os>_<arch>_setup.exe     # Windows NSIS 安装版
SJMCL_<version>_<os>_<arch>_portable.exe  # Windows 便携版
SJMCL_<version>_<os>_<arch>.app.tar.gz    # macOS（内部为 仙建世界客户端.app）
SJMCL_<version>_<os>_<arch>_portable      # Linux 便携版
SJMCL_<version>_<os>_<arch>.deb / .rpm    # Linux 安装包
```

> 前缀说明：以上为当前 CI 产物命名；S3 起产物前缀改为 `XJMC_`（FR-42）。匹配只依赖平台/架构关键字，不依赖前缀，因此 S3 改名后无需改动匹配逻辑。

各平台安装行为见 FR-6；发布版本判定与失败静默见 FR-4、FR-11。

### 7.3 启动包安装链路约束

- 复用 `create_instance(modpack_path, modpack_version)` 与 mrpack 解析，不新增包格式。
- 导入整合包时不会自动补 Fabric API，包必须自带 `fabric-api`（`src-tauri/src/instance/commands.rs:1188-1190`）。
- 实例必须落在**已配置**游戏目录的 `versions/` 下（`src-tauri/src/instance/commands.rs:1061`）。
- 下载引擎按 sha1 校验（`download.rs`），多源回退见 `crates/sjmcl-downloader/src/actor.rs:1599-1647`；因此目录同时给出 sha1 与 sha256，导入边界再校验整包 sha256。
- Java：MC 26.2 的 `javaVersion.majorVersion` 为 25（组件 `java-runtime-epsilon`）；仅创建实例时可自动下载，启动阶段不下载，一键安装需在创建前检查。
- 包体积：只分发社团内容，`libraries` / `assets` / 客户端 jar 交给启动器按下载源拉取。
- 详细方案见附录 C。

### 7.4 运行与环境约束

- **数据目录隔离**：identifier 变更使本客户端与官方 SJMCL 的配置、账号、实例互不干扰。
- **镜像策略**：默认 `mirror`（BMCLAPI 优先），设置页仍可切回官方源或自动。
- **发布版本判定**：更新检查仅在 `build_type == Release` 且当前版本为合法 semver 时执行，本地开发构建不会弹更新。
- **失败静默**：更新接口不可用时只记录日志，不阻断启动。
- **云整合包**：目录与实例通过 `pack_ref` 关联；安装复用 `create_instance`，更新只做「比对 + 新建实例」，不新增安装器；目录不可用只影响目录页，不阻塞启动与实例管理；目录服务与 App 更新服务（`appapi.xauat.site`）相互独立。详细设计见附录 D。

### 7.5 风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 上游频繁更新导致 rebase 冲突 | 维护成本上升 | 差异集中在少量文件、只加不删、双周同步 |
| 无代码签名 → 杀软误报 | 与 PCL2 相同的老问题 | 优先发安装包、申请证书、提交误报申诉 |
| 更新服务不可用 | 用户卡在旧版本 | 失败静默；保留「手动下载」入口 |
| identifier 变更 | 老用户配置丢失 | 发布前定死，本期已确定 |
| 用户协议仍指向上游 | 合规瑕疵 | 发布前补齐本次发行版协议（见 §9 第 8 条） |
| 邀请码/白名单无接口 | 人工审批仍是瓶颈 | 客户端只做入口，后台单独立项 |
| MC 26.2 / Fabric 0.19.5 元数据在镜像站滞后 | 启动包导入直接失败 | 失败时自动切官方源；发版前双源各装一次 |
| 启动阶段不自动下载 Java | 玩家卡在「未找到 Java」 | 一键安装前检测并补 `java-runtime-epsilon`；指南前置 |
| 更新 = 新实例，存档未迁移 | 玩家投诉 | 发版说明与完成弹窗明确提示；P2 增量更新 |
| 第三方 mod 再分发许可 | 合规风险 | 优先官方直链；`mods.lock.json` 记录来源与许可 |
| 启动包无签名 | 包可被替换 | P2 Ed25519 签名 + 内置公钥，此前依赖 HTTPS 与群内校验值 |
| 云目录服务不可用 | 云整合包页不可用 | 客户端缓存 + 离线标记；目录失败不影响启动与实例管理 |
| 目录元数据与包文件不一致 | 装出错误版本 | 目录同时给 sha1 / sha256，导入前校验；发布侧 CI 强校验 |
| 多包并存占用磁盘 | 玩家磁盘紧张 | 安装前显示包大小与预计占用；实例页可清理 |
| 包线增多导致版本漂移 | 玩家进错服务器 | 每个实例记录 `pack_ref`；实例卡片显示包名与版本 |

### 7.6 合规约束

| 条款 | 要求 | 状态 |
| --- | --- | --- |
| 附加条款 1 | 使用与 SJMCL 不同的名称 | ✅ 已完成 |
| 附加条款 2 | README / 关于页显著声明基于 SJMCL 并给出源仓库地址 | ✅ 已完成 |
| 附加条款 3/统计 | 修改版需向统计服务上报带 ≥2 字母前缀的版本号 | ✅ `XJ-` |
| 预置接口限制 | 只允许追加，不得删改原有预置项 | ✅ 保留 3 项 |
| GPLv3 | 分发版本的完整源码必须公开 | ⏳ 见 US-030 |

> 依据 `LICENSE.EXTRA` 第 3 条，「仅增加预置认证服务器」的改动可继续使用原名分发；但由于本期还包含品牌与其它改动，仍按第 1、2 条履行改名与声明义务。

---

## 8. 成功指标

| 指标 | 现状 | 目标 | 测量方式 |
| --- | --- | --- | --- |
| 新玩家从拿到安装包到进入主城 | 20~40 分钟（含等待人工） | ≤ 8 分钟（人工环节除外） | 新玩家计时（首启弹窗 → 进入主城） |
| 因配置错误导致的求助 | 占群内提问多数 | 下降 70% | 群内提问分类统计（上线前后各两周） |
| 因客户端文件被误删/解压错误导致的求助 | 常见 | 归零 | 同上 |
| 整包体积 | 903 MB（PCL 包） | ≤ 120 MB（mrpack） | CI 产物大小 |
| 包安装耗时（100 Mbps） | 与整包同量级 | ≤ 3 分钟 | 下载任务组计时 |
| 云整合包可见性 | 只能从群文件逐个找 | 启动器内可见全部包、分类与版本 | 目录页计数与分类筛选 |
| 整合包更新发现 | 靠群公告与口头通知 | 打开实例页即见「可更新」，含更新日志 | 实例卡片徽标与更新日志命中 |

验收口径：以各 US 的验收标准为唯一验收依据；S1.5 / S1.6 上线后两周内按下表复盘，未达标的指标进入下一阶段待办。

---

## 9. 待决事项

1. 皮肤站是否提供邀请码/白名单接口，以及接口鉴权方式（影响 S2）；
2. 图形资源（图标、启动图、安装器素材）的提供方与交付时间；
3. 启动包版本号是否延续 PCL 包（`8.0.0` → `8.1.0`），以及 `{PACK_CDN}` 的域名、归属、配额与回源策略；
4. 云整合包目录用 `{PACK_CDN}` 的静态 `packs.json`，还是独立部署 `{PACK_API}/api/packs`（不复用 App 更新服务；影响下架与统计能力）；
5. 分类枚举是否固定为 `base` / `minigame` / `modded` / `other`；
6. 更新提示策略：只在实例页标记，还是启动时弹窗，以及检查频率；
7. 各包是否统一 mrpack 与同一 MC 版本，还是允许模组服使用不同 MC / loader；
8. 用户协议是否需要在本次发行版中独立成文（当前仍指向上游版本）；
9. 首启引导的「安装 Java」是否改为同一弹窗内一键安装（当前跳转设置页）。

---

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
| `src-tauri/src/instance/helpers/pack_catalog.rs`（新增）、`models/misc.rs`、`commands.rs` | S1.6 目录拉取与缓存、`pack_ref`、`install_cloud_pack` |
| `src/pages/packs/*`、`src/components/modals/cloud-pack-modal.tsx`（新增） | S1.6 云整合包列表、详情与更新提示 |
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
| 预置认证服务器、预置 `servers.dat` | FR-3、US-008 | 包内不必携带账号与服务器配置 |

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

> 附录 C 中的 `{PACK_CDN}` 是包文件的 CDN 域名占位符，尚未确定；它只用于放 mods、整包与 `latest.json`，与认证服务器、游戏服务器无关（见 §9 待决事项）。

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
├── mods.lock.json         # { path, url, sha1, size, license } —— 唯一事实来源
├── overrides/             # 直接对应包内 overrides/
└── tools/verify.mjs       # 卫生检查
```

CI（tag `v8.1.0`）流程：

1. `verify`：`mods.lock.json` 中的 sha1 逐个校验；**按 sha1/模组 id 去重**；禁止 `saves/`、`screenshots/`、`logs/`、`usercache.json`；禁止 `..` 路径；`overrides/` 中不得出现 jar；
2. `build`：生成 `modrinth.index.json` → 打 zip → 计算整包 sha256；
3. `publish`：上传对象存储与 GitHub Release（双源），更新 `latest.json` 与云目录条目（附录 D）：

```json
{ "version": "8.1.0", "url": "https://{PACK_CDN}/pack/8.1.0.mrpack",
  "sha256": "…", "size": 118000000, "minLauncherVersion": "0.2.0",
  "notes": "…", "releasedAt": "2026-11-01T10:00:00Z" }
```

> 云整合包服务上线后，单包 `latest.json` 由目录条目取代；静态 `latest.json` 仍保留作为兜底。

配套两个一次性脚本：

- `tools/from-pcl.py`：把现有 PCL 版本目录转成 `mods.lock.json` + `overrides/`（扫描 `mods/`、`config/`、`resourcepacks/`、`shaderpacks/`，计算 sha1；命中重复时**报错退出**，由人确认）；
- `tools/diff-pack.py`：对比两个包版本的 mod 列表，生成玩家可读的更新说明。

托管：

- 主源为对象存储（`{PACK_CDN}` 指包 CDN 域名，尚未确定，见 §9），需支持 Range 请求与长缓存；备源为 GitHub Release 直链，写入 mrpack 的 `downloads[1]`，由下载引擎在失败时自动轮换（`crates/sjmcl-downloader/src/actor.rs:1599-1647`）；
- 包内每个文件独立 URL 与 sha1（`modrinth.rs:125-150`），玩家重装/修复时只补缺失文件；
- 整包 sha256 记录在 `latest.json`，客户端下载后校验通过才导入。

> 打包的另一条路径：在客户端里维护一个「母版实例」，直接用「导出整合包」产出 mrpack（`commands.rs:1612`），适合小改；CI 路线适合规范化发版。

### C.5 客户端安装流程

> 对应 US-012（P0）、US-013 ~ US-014（P1）。

**P0（0 代码）**

1. 官网/群文件提供 `.mrpack` 下载；
2. 启动器「实例 → 添加/导入 → 导入整合包」，选择文件（`src/components/modals/import-modpack-modal.tsx`，文件选择器接受 `zip/mrpack`）；
3. 弹窗先调 `retrieve_modpack_meta_info` 预览包信息，确认后由前端 `fetchGameVersionSpecific` 取 26.2 的官方 version json，再调 `create_instance(modpack_path, modpack_version)`；
4. 后续由下载任务组完成：client jar、缺失 libraries/assets、Fabric 0.19.5 安装、mods 校验下载、overrides 解压；创建时若开启 `auto_download_java`，会按 `javaVersion` 拉取 `java-runtime-epsilon`（major 25）；
5. 完成后前端跳转 `/downloads`，玩家回到实例页启动；认证服务器与 `servers.dat` 已由分叉预置，直接登录进服。

> 两个前置条件：包必须自带 `fabric-api`（导入整合包时不会自动补，`commands.rs:1188-1190`）；实例落点必须是已配置的游戏目录（`commands.rs:1061`）。

**P1（约 2~3 人日）**

- 构建期注入 `XJMC_PACK_URL`、`XJMC_PACK_SHA256`（与现有 `XJMC_UPDATE_*` 同一套 `.env` / `build.rs` 机制）；任一为空则隐藏入口；
- 新增命令 `install_club_pack`（S1.6 起泛化为 `install_cloud_pack(packId, version)`，见附录 D）：下载整包到临时目录 → 校验 sha256 → 解析版本元信息（同 P0 第 3 步）→ 复用 `create_instance`（`modpack_path` + `modpack_version`）→ 返回实例摘要与任务组 ID；
- 入口三处：首启引导第 4 项改为「安装仙建世界整合包」、实例页空状态、帮助页；
- 「创建 + 等任务组完成 + 选中实例 + 启动」做一层前端编排（后端没有总编排，`launch-process-modal.tsx:152-240` 是四步命令序列），安装完成后直接给出「启动游戏」。

**P2（可选）**

- 读取 `xjmc.pack.json`：图标、推荐内存、JVM 参数、服务器补充、最低启动器版本；
- 更新检查：用 `latest.json` 与 `Instance.modpack_version` 比对，实例卡片显示「v8.0.0 → v8.1.0」；
- 文件级增量更新：按新包清单比对本地 sha1，只下差异文件，并处理「新版本删除的 mod」；`overrides` 支持 `write-if-missing` 策略，避免覆盖玩家改过的画面设置；
- 完整性修复：实例菜单 →「检查文件完整性」，缺失/损坏文件按清单重下；
- Ed25519 签名：公钥随客户端构建内置，校验 `xjmc.pack.json` 后再导入。

### C.6 更新与回滚

- P0/P1 的更新语义是「**安装新版本 = 新建实例**」，旧实例（含存档）原样保留，玩家自行迁移；发版说明中明确写出这一点，避免误以为原地升级；云目录中的其他包遵循同一语义（附录 D）；
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

- 认证服务器 `https://skin.xauatcraft.com/api/yggdrasil` 已在预置列表中（FR-3）；
- 实例首次被发现时写入 `play.xauatcraft.com`（US-008）；
- 若 `xjmc.pack.json` 声明了 `servers`，仅作为「补充」，且仍遵守「不覆盖玩家已有列表」的原则。

### C.9 失败诊断

> 对应 US-015 的验收标准。

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
| `servers.dat` | 丢弃 | 启动器预置（US-008） |
| `PCL.ini`、`PCL/Setup.ini`、`launcher_profiles.json` | 丢弃 | 认证服务器已预置（FR-3） |
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
7. **发布**：`latest.json` 与官网下载页上线，并在 `packs.json` / 云目录中登记该版本与 `base` 分类；P1 完成后首启引导按钮直接指向该包，群文件只作兜底。

预期结果：包体积约 **113 MB**（现状 903 MB 的 12.5%），首次安装约 2~3 分钟（100 Mbps），更新说明只列出 mod 变更。

### C.13 发版检查单

- [ ] 包内 mods 数量与 `mods.lock.json` 一致，无重复 sha1 / 重复模组 id
- [ ] 所有 `downloads` 主备源均返回 200，`Content-Length` 与 `fileSize` 一致
- [ ] `minecraft`、`fabric-loader` 版本锁定，且能在 `mirror` 与 `official` 两种下载源下完成安装
- [ ] `overrides/` 无 jar、无个人数据、`options.txt` 已脱敏
- [ ] `xjmc.pack.json` 的 `minLauncherVersion` 与实际 API 兼容
- [ ] 在 Windows 与 macOS 各做一次全新安装 + 进服
- [ ] 更新 `latest.json`，保留上一版本文件以便回滚
- [ ] 云目录条目（`packs.json` 或 `/api/packs`）已登记该版本，哈希、大小与整包一致
- [ ] 群公告与官网同步更新下载链接与更新说明

## 附录 D：云整合包服务设计

### D.1 目标与范围

- **一个目录、多条包线**：`base`（进入社团服务器的整合包）、`minigame`（小游戏）、`modded`（模组服），预留 `other`；
- **可见**：总数、分类计数、简介 / 图标 / MC 版本 / 加载器 / 大小 / 更新时间 / 版本历史；
- **可装**：从目录直接安装任意包，复用 S1.5 的 mrpack 管线；
- **可更新**：实例记录 `pack_ref`，与目录比对得到更新提示与日志；
- **非目标**：不做面向其他社团的包市场；不做服务端白名单 / 邀请码（S2）；本期不做增量更新（P2）。

### D.2 数据模型

包（PackSummary）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 稳定 slug，如 `base`、`minigame-skyblock`、`modded-create` |
| `name` | string | 显示名 |
| `category` | enum | `base` / `minigame` / `modded` / `other` |
| `summary` | string | 一句话简介 |
| `description` | string | Markdown 详情 |
| `iconUrl` | string | 图标地址（可为空） |
| `mcVersion` | string | 如 `26.2`；版本级可覆盖 |
| `loader` | object | `{ type, version }`，如 `fabric/0.19.5`、`neoforge/…` |
| `latestVersion` | string | 最新版本号（语义化） |
| `sizeBytes` | number | 最新版整包大小 |
| `updatedAt` | string | ISO 8601 |
| `tags` | string[] | 如「推荐」「生存」「活动」 |
| `isActive` | boolean | 下架后卡片置灰并禁用安装，已安装实例不受影响 |

版本（PackVersion）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `version` | string | 如 `8.1.0` |
| `releasedAt` | string | ISO 8601 |
| `changelog` | string | Markdown 更新日志 |
| `sha1` / `sha256` | string | 整包哈希，下载与导入各校验一次 |
| `sizeBytes` | number | 整包大小 |
| `downloadUrl` | string | 主源，指向 `{PACK_CDN}` |
| `mirrors` | string[] | 备源，如 GitHub Release |
| `minLauncherVersion` | string | 低于此版本拒绝安装 |
| `mcVersion` / `loader` | string / object | 可选，覆盖包级声明 |

客户端本地（Instance 内）：`pack_ref = { id, version, channel, installedAt }`，用于更新比对与实例标识，不参与文件校验（校验一律以哈希为准）。

### D.3 目录契约

**P0 静态目录**：`GET {PACK_CDN}/packs.json`，一个文件包含全部分类与版本：

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-11-01T10:00:00Z",
  "total": 4,
  "counts": { "base": 1, "minigame": 2, "modded": 1, "other": 0 },
  "packs": [
    {
      "id": "base",
      "name": "仙建世界",
      "category": "base",
      "summary": "社团生存服基础包",
      "mcVersion": "26.2",
      "loader": { "type": "fabric", "version": "0.19.5" },
      "latestVersion": "8.1.0",
      "sizeBytes": 118000000,
      "updatedAt": "2026-11-01T10:00:00Z",
      "tags": ["推荐", "生存"],
      "isActive": true,
      "versions": [
        {
          "version": "8.1.0",
          "releasedAt": "2026-11-01T10:00:00Z",
          "changelog": "- 修正重复的 sodium\n- 新增 …",
          "sha1": "…",
          "sha256": "…",
          "sizeBytes": 118000000,
          "downloadUrl": "https://{PACK_CDN}/pack/8.1.0.mrpack",
          "mirrors": ["https://github.com/xauatcraft/pack/releases/download/v8.1.0/xianjian-8.1.0.mrpack"],
          "minLauncherVersion": "0.2.0"
        }
      ]
    }
  ]
}
```

**P1 独立目录服务**（与静态同构，便于客户端无感切换；服务地址记为 `{PACK_API}`，不复用 App 更新服务）：

| 方法 | 路径 | 返回 |
| --- | --- | --- |
| GET | `{PACK_API}/api/packs?category=&q=&channel=stable` | `{ total, counts, packs: PackSummary[] }` |
| GET | `{PACK_API}/api/packs/{id}` | `PackSummary` + `versions[]` |
| GET | `{PACK_API}/api/packs/{id}/latest?channel=stable` | 最新 `PackVersion` |
| GET | `{PACK_API}/api/packs/{id}/versions/{version}` | 指定 `PackVersion` |

计数以服务端返回的 `total` / `counts` 为准，客户端不按分页结果自行推算。

### D.4 客户端流程

> 对应 US-016 ~ US-019。

**浏览**

1. 「实例 → 添加/导入 → 云整合包」打开目录页；
2. 首屏渲染缓存，后台刷新（见 D.5）；
3. 页头显示「共 N 个整合包 · 基础 a / 小游戏 b / 模组服 c」；分类 tab 带计数，支持搜索；
4. 卡片展示图标、名称、分类、MC 版本 + 加载器、大小、更新时间、已装版本（若有）。

**安装**

1. 打开详情，默认选中 `latestVersion`，可切换历史版本；
2. 调用 `install_cloud_pack(packId, version)`；
3. 下载整包（进度、重试、备源切换）→ 下载引擎校验 sha1 → 导入前校验 sha256；
4. `create_instance(modpack_path, modpack_version)` 并写入 `pack_ref`；
5. 提交下载任务组，完成后提示「启动游戏」。

**更新**

1. 实例页加载时调用 `check_pack_updates()`：取目录缓存，按 `pack_ref.id` 匹配并比较版本；
2. 有更新 → 实例卡片徽标「可更新 vX → vY」，详情展示 `changelog`；
3. 点击后安装新版本，实例名默认「<包名> <版本>」，重名时追加序号；旧实例与存档保留；
4. P2 再提供原地增量更新与回滚。

### D.5 缓存与离线

- 目录缓存：内存 + 磁盘（`pack-catalog.json`），TTL 10 分钟；
- 条件请求：静态目录用 `If-Modified-Since` / 内容 sha256，API 模式用 `ETag` / `If-None-Match`；
- 打开页面先渲染缓存，再后台刷新（stale-while-revalidate）；
- 离线时显示上次成功时间与「离线」标记；仍可安装（若文件可下载），否则提示稍后重试；
- 目录请求失败只记录日志，不阻塞启动器启动。

### D.6 错误处理

| 场景 | 表现 |
| --- | --- |
| 目录 404 / 超时 | 显示缓存与「离线」标记，提供重试 |
| 包已下架 | 卡片置灰、安装禁用，提示「已下架」；已安装实例照常启动 |
| 版本不存在 | 详情回到最新版并提示 |
| 下载 404 / 超时 | 自动尝试 `mirrors`，仍失败则指出文件与来源 |
| sha1 / sha256 不符 | 中止安装，展示期望值与实际值 |
| MC 版本 / 加载器不可用 | 提示切换下载源，并列出所需版本 |
| 磁盘不足 | 安装前按 `sizeBytes` 估算并提示 |

### D.7 更新策略

- 只提示、不自动下载；检查频率与是否弹窗见 §9 待决；
- 安装新版本 = 新建实例，旧实例与存档保留，实例名带版本号；
- 同一实例不原地换包；P2 提供原地升级与回滚；
- 模型保留 `channel`（`stable` / `beta`），P1 只实现 `stable`；
- 本地导入（无 `pack_ref`）的实例不参与更新检查；P2 可提供「按整包哈希匹配目录」或手动关联。

### D.8 安全与治理

- 只收录官方目录中的包；下载域白名单为 `{PACK_CDN}` 与 GitHub Release；
- 目录哈希 + 文件哈希双重校验，P2 增加 Ed25519 签名（公钥内置）；
- 发布权限走 CI token 与人工 review；下架用 `isActive=false`，不删除历史版本；
- `changelog` 必填；每个包独立仓库 / 目录，版本 tag 与目录条目一一对应。

### D.9 后端落地路径

| 方案 | 改动 | 优点 | 缺点 |
| --- | --- | --- | --- |
| A. 静态 `packs.json` | CI 生成并上传到 `{PACK_CDN}` | 零后端、当天可用 | 无统计与即时下架，依赖 CDN 刷新 |
| B. 独立目录服务 `{PACK_API}` | 新建 packs / versions 表与 `/api/packs`，文件仍放 `{PACK_CDN}` | 有统计、下架即时、可分渠道 | 需后端排期与契约评审 |
| C. 复用 App 更新服务 | 不采用：`appapi.xauat.site` 的模型是 app → release → soft，没有分类、计数、MC / loader 元数据 | — | — |

现成开源项目里没有与本方案同构的「mrpack 目录 + 分类计数 + 更新」服务：Solder（MIT，已归档，Solder 自有格式）、Modrinth 自身（可自托管但体量大）、packwiz（生成静态索引，无服务端计数）。因此建议先 A 上线，B 作为正式形态；客户端只依赖同一份 JSON 契约，切换无需改前端。

### D.10 分期与工作量

| 阶段 | 内容 | 人日 |
| --- | --- | --- |
| P0 | 静态目录 + 列表 / 详情 / 计数 + 复用导入 | 1~2 |
| P1 | `pack_ref`、更新比对、`install_cloud_pack`、首页组件 | 3~4 |
| P1.5 | 「发现 → 整合包」增加 `xauatcraft` 源入口（附录 D.11 方案 A） | 1~2 |
| P2 | API 化、增量更新、完整性修复、签名、多通道 | 5~8 |

### D.11 与「发现 → 整合包」下载源的关系

现状（代码事实）：

- 前端 `downloadSourceLists`（`src/components/resource-downloader.tsx:96-103`）为 `modpack` 只提供 CurseForge 与 Modrinth；
- 后端按 `OtherResourceSource` 分派资源搜索、版本列表与本地文件识别，未匹配即返回 `NoDownloadApi`（`src-tauri/src/resource/commands.rs:109-115`、`:124-129`、`:187-195`、`:249-255`）。

因此「加一栏 xauatcraft」有三种做法：

| 方案 | 做法 | 优点 | 缺点 | 工作量 |
| --- | --- | --- | --- | --- |
| A（推荐） | 仅加「入口」：`OtherResourceSource` 新增 `XauatCraft`，只在 `modpack` 源列表出现；该源下渲染目录组件（复用 S1.6 的列表 / 详情 / 计数），安装走 `install_cloud_pack` | 保留分类、计数、更新语义；不改通用资源模型 | 该源与其他源 UI 不完全一致 | 1~2 人日（依赖 S1.6） |
| B | 完整适配：把包映射为 `OtherResourceInfo`、版本映射为 `OtherResourceVersionPack`，补齐四处 `match` | 所有入口体验一致 | 搜索 / 下载次数 / 来源标签等字段语义不匹配，维护两套映射 | 3~5 人日 |
| C | 不加源，在「发现」页放横幅跳转云整合包页 | 最省事 | 发现页内的整合包搜索体验割裂 | 0.5 人日 |

结论：可以加，建议按 A 实现；同时让 `DownloadModpackModal` 的 `initialDownloadSource` 接受 `XauatCraft`，使「发现 → 整合包 → xauatcraft」直接落到目录。注意安装链路要复用 `install_cloud_pack`（下载后建实例），不要走现有 `modpack-wo-install` 下载组，否则玩家还需手动导入。
