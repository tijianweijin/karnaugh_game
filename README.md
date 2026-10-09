# Karnaugh图小游戏

**在线游玩：https://tijianweijin.github.io/karnaugh_game/**

中文三至五变量卡诺图练习，默认四变量。选择 SOP / POS、难度与无关项，逐格填图并交互合圈，精确检验覆盖与最简表达式。

- LaTeX 数学斜体、上横线和最小项下标。
- 低位行、高位列；五变量为 DE\ABC 的 8 列 × 4 行，支持折叠相邻合圈。
- 跨边、跨角圈在对应边缘开口，五变量跨列折叠圈朝连接间隙开口。
- 我的答案 / 标准答案切换，学生圈不会被覆盖。
- 删除其他圈后颜色不变，本机自动保存进度。
- 枚举所有合法蕴含项并精确求覆盖最优成本，接受不同的等成本最简式。
- 无后端、登录或分析追踪；渲染器与字体内嵌，下载 docs/index.html 后也可离线运行。

## 开发与验证

需要 Node.js 18 或更新版本。运行 npm ci 安装构建依赖；npm test 执行算法及圈线边界测试；npm run build 生成 docs/index.html。

src/ 保存可编辑源码，scripts/build.js 负责单文件打包，tests/ 保存独立覆盖对照与回归测试，docs/ 是 GitHub Pages 发布目录。

页面底部提供分享链接复制和内置自检。详细验证范围见 TESTING.md。

## 部署

GitHub Pages 使用 main 分支的 /docs 目录。推送此目录的新版本后，Pages 自动重新发布。

## 第三方许可

公式渲染使用 [KaTeX](https://katex.org/)，其 MIT 许可全文保存在 THIRD_PARTY_LICENSES.txt，并内嵌到成品 HTML。
