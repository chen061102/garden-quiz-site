# 园林高级工刷题站

这是一个零依赖静态刷题站，适合直接部署到静态托管平台。当前版本已经按国内网络可访问场景整理过，优先推荐腾讯云或阿里云。

## 功能

- 顺序练习、随机练习
- 单选、多选、判断筛选
- 错题本和收藏夹
- 30 题随机模拟考试
- 本地成绩记录
- PWA 安装和离线缓存
- 学校理论题库已并入在线刷题
- 植物识别、病虫害识别、主观题、红线速记讲义已放入资料库

## 本地预览

在项目根目录运行：

```bash
rtk python3 -m http.server 4173 -d outputs/garden-quiz-site
```

然后打开 `http://127.0.0.1:4173`。

## 国内部署建议

优先方案：

1. 有域名并准备长期使用：腾讯云 COS/EdgeOne 或阿里云 OSS。
2. 想先快速试跑：腾讯云 COS 静态网站域名先预览，再补自定义域名。
3. 不想购买任何资源：直接用 GitHub Pages 免费上线。

详细步骤见：

- `DEPLOY-CN.md`
- `TENCENT-COS-STEPS.md`
- `ALIYUN-OSS-STEPS.md`
- `DEPLOY-FREE.md`
- `GITHUB-PAGES-STEPS.md`

## 数据来源

- 公开模拟题：`2026园林绿化工高级工_公开资料整理版_模拟题库.docx`
- 学校复习资料：
  - `理论题库.pdf`
  - `实操模块1植物识别题库.pdf`
  - `实操模块2病虫害识别题库.pdf`
  - `实操模块2病虫害主观题.pdf`

整理结果：

- 在线题库：`data/questions.json`
- 资料导航：`data/resources.json`
- 资料文件目录：`resources/`
