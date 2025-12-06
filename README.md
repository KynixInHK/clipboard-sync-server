# Clipboard Sync Server

## 开发背景
当前的情况下，市面上最方便的剪贴板同步自然是各家的自有生态，这也注定了跨平台的剪贴板同步并不友好。假如您像作者一样，有一台 Mac 和一台 Android 手机 **（特么的 iPhone 17 Pro 丑爆了！！！完全没有买它的任何欲望）**，那么当前最优的解可能是造一个局域网，或者虚拟局域网，然后用着 UI 过时的 KDE Connect。当然，这个方案很好地解决了问题，但每次坐到办公桌上，你都要把你的手机连上 WiFi（甚至我们学校的校园网没法在同一局域网），才能开始同步——这实在是太蠢了。因此，萌生了开发一个公网剪贴板同步服务的想法。

## 这是什么？
这是一个基于 Cloudflare Wrangler 的剪贴板同步服务（**在此跪谢为了人类科技而慷慨解囊的赛博菩萨 Cloudflare，那是一家伟大无需多言的公司**），通过它的中转，你无需将你的 Mac 和 Android 置于同一局域网内，也能实现公网剪贴板的同步。基于 Cloudflare 伟大的慷慨，您就算挥霍，也基本不会产生什么费用。

## 如何使用？
本仓库是**服务端**代码库，您还需要下载并安装客户端，客户端代码库请见：[Clipboard Sync Client](https://github.com/KynixInHK/clipboard-sync-client)。

1. Clone 本仓库并安装依赖：
   ```bash
   git clone https://github.com/KynixInHK/clipboard-sync-server.git
   cd clipboard-sync-server
   npm install
   ```
2. 直接运行：
	```bash
 	npm run deploy
	```

当然，前提是您需要先安装并配置好 **Cloudflare Wrangler**，具体请见 [Cloudflare Wrangler 官方文档](https://developers.cloudflare.com/workers/get-started/guide/)。

3. 部署完成后，您会得到一个类似 `https://clipboard-sync.YOUR_NAME.workers.dev` 的域名，接下来请前往客户端代码库，按照说明配置客户端即可。

> NOTICE：如果你在中国大陆使用 Cloudflare Wrangler，可能会遇到无法访问 `wrangler.dev` 的问题，您最好在 Cloudflare Workers 中配置您自己的自定义域名，或者使用 VPN。
