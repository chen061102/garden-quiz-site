# GitHub Pages 一步一步教程

这是当前最简单的免费上线方法。

## 你会得到什么

最后你会拿到一个类似下面的网址：

`https://你的用户名.github.io/garden-quiz-site/`

## 第一步：注册 GitHub

1. 打开 GitHub 官网。
2. 注册一个账号。
3. 记住你的用户名，后面网址里会用到。

## 第二步：新建仓库

1. 登录后点右上角 `+`。
2. 选 `New repository`。
3. 仓库名填：`garden-quiz-site`
4. 选 `Public`
5. 点 `Create repository`

## 第三步：上传网站文件

1. 打开这个文件夹：
   `outputs/garden-quiz-site`
2. 进入你刚建好的 GitHub 仓库页面。
3. 点 `Add file`
4. 点 `Upload files`
5. 把这个文件夹里的所有文件和文件夹一起拖上去：
   - `index.html`
   - `404.html`
   - `app.js`
   - `styles.css`
   - `manifest.webmanifest`
   - `sw.js`
   - `.nojekyll`
   - `assets`
   - `data`
6. 页面底部点 `Commit changes`

## 第四步：开启 GitHub Pages

1. 进入仓库页。
2. 点 `Settings`
3. 左侧点 `Pages`
4. 在 `Build and deployment` 里：
   - `Source` 选 `Deploy from a branch`
   - `Branch` 选 `main`
   - 文件夹选 `/ (root)`
5. 点 `Save`

## 第五步：等它生成网址

1. 保存后等几十秒到几分钟。
2. 刷新 `Pages` 页面。
3. 你会看到一个网址，通常是：
   `https://你的用户名.github.io/garden-quiz-site/`

## 第六步：打开测试

1. 打开这个网址。
2. 看首页能不能正常显示。
3. 随便点几道题，确认题目能切换。
4. 如果刚开好访问不到，等 1 到 3 分钟再刷新。

## 第七步：发到微信

直接把这个网址复制发微信就行。

## 后面怎么更新

以后你只要重新上传改过的文件到这个 GitHub 仓库，Pages 会自动更新。

## 你要知道的限制

- 这是免费海外托管，不保证中国大陆任何网络环境下都一直稳定。
- 大多数时候能访问，但速度和稳定性不如备案后的国内站。
- 如果你以后想升级成正式国内网址，这套前端文件可以原样迁过去。
