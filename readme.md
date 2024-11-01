# OldTube TV
YouTube frontend for Leanback, TV and XL.

<img src="imgs/festisite_youtube.png" width="300">

---

## setup
- **make sure you have [imagemagick](https://imagemagick.org/) and [ffmpeg](https://ffmpeg.org/) in your PATH.**
- **Flash is needed for certain things: https://archive.org/details/flashplayer_old (Flash 32) or https://gitlab.com/cleanflash/installer/-/releases (Clean Flash 34)**

### when installing imagemagick, make sure you also install its legacy tools (convert)! 

- install node.js
- open a terminal (windows powershell/cmd) in the directory you cloned the instance to, then:
- install required dependencies with: `npm install`
- create a config file by launching and following: `node yt2009setup.js`
- run to set and download remaining assets `node post_config_setup.js`
- run instance by changing directory to `back` (`cd back`) and starting with `node backend.js`
- navigate to your IP:port you have set while configuring to see a 2009 homepage.

afterwards, you can just `cd back` and `node backend.js` to start. no need to re-set it up each time.

Done!

---

## updating

if you want to update your frontend instance, use

```
git pull --no-commit
```

to get you up with updates you may have missed.

if you modified the code yourself and you're getting a merge conflict, use

```
git checkout -- <file>
```

to restore the original file. you can make a copy of your modified file and reapply the mod after the pull is done.

---

## usage

now that you're in, you can just use it as it is, but there is a bit more you can do.

Type your instance and then any kind of TV, Leanback or XL by /xl, /tv, /leanback etc. Some of them (like Leanback Lite V3 or Google TV) needs Flash.

and just click around! you might find some useful features you didn't expect to work.

---

**over time, depending on your usage, yt2009 may take up a lot of space (counted in tens of gigabytes!)**

**if you need to reclaim space, look through the assets folder where downloaded files (such as images, videos) are saved and delete ones you need.**

**they will be redownloaded when necessary.**

---
