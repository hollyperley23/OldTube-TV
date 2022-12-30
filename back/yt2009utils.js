const fetch = require("node-fetch")
const constants = require("./yt2009constants.json")
const fs = require("fs")
const tokens = [
    "afpembogo","yhjsvjg8u","7gnubmr4b","drgbz36m7","r0lkmbyu4",
    "b1kerktyk","mgx5sk71v","6jy05apcy","nn3mahwu0","xpqvx1ati",
    "c017equoo","64eisoh0g","u8pp4s6si","szwis7e82","hm3lk3fbk",
    "sy66udgeh","3zlbf0b1m","b7nsl6y6z","lclzpq4na","pbldqsud4",
    "txhss09v4","q8f5168pr","qf9892j7e","azi3ia0b2","aginouadg",
    "iipnqquqx","dsm34qwe2","bfi5oh2wn","g3z9g0vl6","zp1ba70zk",
    "2gel64s2w","l23smuu1z","zlf9bx78p","75hl58cpp","a4axdlso1",
    "kuvjo5hmq","7o6uiqjx3","gjyotd7h8","vocqjn2ux","j8t8iai6g",
    "xz6fir3zs","2luillzrr","qcoazyewg","ibjkiqy2i","mn8lplfat",
    "zjiohvu7v","prs1r3uuw","5fmdmal15","k5pa845jf","e3fumzlxq",
    "a8ym4mch6","0fj3id73s","oew6wjts9","3kf0wq9tb","5lno4huoi",
    "5esyzkgsd","tbo59b7oa","uyk9rmmde","ayk0clg6i","iuvpe3zam",
    "vfhz32ft0","bs9rngfjz","pq1ldqgn3","ynpfm0s41","6z7j7a2j7",
    "vbju5fy8f","dvp8ep4zj","euigooew4","yo3duyi3r","l2zqy2qkj",
    "tnb_d3v","g3n_d3m"
]
let ip_uses_flash = []

module.exports = {
    "time_to_seconds": function(input) {
        // czas na sekundy (np. 01:00:00 -> 3600)
        let tr = 0;
    
        let split = input.split(":")
        switch(split.length) {
            // ss
            case 1: {
                tr += parseInt(split[0])
                if(isNaN(parseInt(split[0]))) {
                    tr = 0;
                }
                break;
            }
            // mm:ss
            case 2: {
                tr += parseInt(split[0]) * 60
                tr += parseInt(split[1])
                break;
            }
            // hh:mm:ss
            case 3: {
                tr += parseInt(split[0]) * 3600
                tr += parseInt(split[1]) * 60
                tr += parseInt(split[2])
                break;
            }
        }
    
        return tr;
    },


    "seconds_to_time": function(input) {
        // sekundy do czasu (192 -> 3:12)

        input = parseInt(input)

        let minutes = Math.floor(input / 60);
        let seconds = input % 60;

        if(seconds < 10) {
            seconds = "0" + seconds
        }

        return minutes + ":" + seconds;
    },

    
    "comments_parser": function(response, comment_flags) {
        // parse komentarzy z json response
        comment_flags = comment_flags.replace("#", "").split(";")
        let comments = []
        try {
            response.onResponseReceivedEndpoints.forEach(received => {
                let endpoint = 
                received.reloadContinuationItemsCommand
                ? received.reloadContinuationItemsCommand
                : received.appendContinuationItemsAction
                if((endpoint.slot
                    && endpoint.slot == "RELOAD_CONTINUATION_SLOT_BODY")
                    || endpoint.continuationItems) {

                    // dokopujemy się do komentarzy do filmu
                    let raw_comments = endpoint.continuationItems
                    raw_comments.forEach(rawComment => {
                        if(rawComment.commentThreadRenderer) {
                            // parse
                            let comment_path_short = rawComment
                                                    .commentThreadRenderer
                                                    .comment.commentRenderer
                            let authorUrl = comment_path_short.authorEndpoint
                                            .commandMetadata.webCommandMetadata
                                            .url
                            let commentContent = ""

                            comment_path_short.contentText
                            .runs.forEach(run => {
                                commentContent += run.text + "\n"
                            })

                            let pass = true;
                            let future = constants
                                        .comments_remove_future_phrases

                            if(comment_flags.includes("comments_remove_future")) {
                                future.forEach(futureYear => {
                                    if(commentContent.toLowerCase().includes(futureYear)) {
                                        pass = false;
                                    }
                                }) 
                            }

                            let authorName = comment_path_short
                                            .authorText.simpleText
                            if(comment_flags.includes("remove_username_space")) {
                                authorName = authorName.split(" ").join("")
                            }
                            if(comment_flags.includes("author_old_names") &&
                                authorUrl.includes("/user/")) {
                                authorName = authorUrl.split("/user/")[1]
                            }
                            if(authorName.startsWith("@")) {
                                authorName = authorName.replace("@", "")
                            }

                            if(!pass) return;
                            comments.push({
                                "authorAvatar": comment_path_short
                                                .authorThumbnail.thumbnails[1].url,
                                "authorName": authorName,
                                "authorUrl": authorUrl,
                                "content": commentContent.split("\n\n").join("<br>"),
                                "time": comment_flags.includes("fake_comment_dates")
                                        ? this.genFakeDate()
                                        : comment_path_short
                                            .publishedTimeText.runs[0].text
                            })
                        } else if(rawComment.continuationItemRenderer) {
                            // continuation token
                            // (do fetchowania więcej komentarzy)
                            comments.push({
                                "continuation": rawComment
                                                .continuationItemRenderer
                                                .continuationEndpoint
                                                .continuationCommand.token
                            })
                        }
                    })
                }
            })
            return comments;
        }
        catch(error) {
            console.log("[yt2009_error] comments parser error", error)
            return [];
        }
    },


    "search_parse": function(response) {
        let results = []
        let resultsToCallback = []
        let itemsPath = []
        if(response.appendContinuationItemsAction) {
            itemsPath = response.appendContinuationItemsAction
                            .continuationItems 
        } else {
            try {
                itemsPath = response.contents
                            .twoColumnSearchResultsRenderer
                            .primaryContents.sectionListRenderer
                            .contents
            }
            catch(error) {}
        }
        try {
            itemsPath.forEach(container => {
                // actual results
                if(container.itemSectionRenderer) {
                    results = container.itemSectionRenderer.contents
                }

                // continuation token
                if(container.continuationItemRenderer) {
                    resultsToCallback.push({
                        "type": "continuation",
                        "token": container.continuationItemRenderer
                                .continuationEndpoint.continuationCommand
                                .token,
                        "endpoint": container.continuationItemRenderer
                                    .continuationEndpoint.commandMetadata
                                    .webCommandMetadata.apiUrl
                    })
                }
            })
        }
        catch(error) {
            console.log(error)
            return [];
        }

        // est result count
        if(response.estimatedResults) {
            resultsToCallback.push({
                "type": "metadata",
                "resultCount": parseInt(response.estimatedResults)
            })    
        }
        
        results.forEach(result => {
            // video result
            if(result.videoRenderer) {
                result = result.videoRenderer
                let uploadDate = ""
                try {
                    uploadDate = result.publishedTimeText.simpleText
                }
                catch(error) {}
                let description = ""
                try {
                    result.detailedMetadataSnippets[0]
                    .snippetText.runs.forEach(run => {
                        description += run.text
                    })
                }
                catch(error) {}
                try {
                    let author_url = result.ownerText.runs[0]
                                    .navigationEndpoint.browseEndpoint
                                    .canonicalBaseUrl;

                    if(!author_url.startsWith("/channel")
                    && !author_url.startsWith("/user")
                    && !author_url.startsWith("/c/")) {
                        author_url = "/channel/" + result.ownerText.runs[0]
                                                    .navigationEndpoint
                                                    .browseEndpoint.browseId
                    }

                    resultsToCallback.push({
                        "type": "video",
                        "id": result.videoId,
                        "title": result.title.runs[0].text,
                        "views": result.viewCountText.simpleText,
                        "thumbnail": "http://i.ytimg.com/vi/"
                                    + result.videoId
                                    + "/hqdefault.jpg",
                        "description": description,
                        "time": result.lengthText.simpleText,
                        "author_name": result.ownerText.runs[0].text,
                        "author_url": author_url,
                        "upload": uploadDate
                    })
                }
                catch(error) {}
            }
            // channel result
            else if(result.channelRenderer) {
                result = result.channelRenderer
                let channelUrl = result.navigationEndpoint
                                .browseEndpoint.canonicalBaseUrl;
                if(!channelUrl.startsWith("/user/")
                && !channelUrl.startsWith("/c/")
                && !channelUrl.startsWith("/channel/")) {
                    channelUrl = "/channel/" + result.channelId
                }
                resultsToCallback.push({
                    "type": "channel",
                    "name": result.title.simpleText,
                    "avatar": this.saveAvatar(
                                result.thumbnail.thumbnails[0].url
                            ),
                    "subscribers": result.subscriberCountText
                                    ? result.subscriberCountText.simpleText
                                    : "",
                    "url": channelUrl
                })
            }
            // playlist result
            else if(result.playlistRenderer) {
                result = result.playlistRenderer
                let videoList = []
                result.videos.forEach(previewVideo => {
                    if(!previewVideo.childVideoRenderer) return;
                    previewVideo = previewVideo.childVideoRenderer
                    videoList.push({
                        "type": "playlist-video",
                        "length": previewVideo.lengthText.simpleText,
                        "title": previewVideo.title.simpleText,
                        "id": previewVideo.videoId
                    })
                })
                resultsToCallback.push({
                    "type": "playlist",
                    "id": result.playlistId,
                    "name": result.title.simpleText,
                    "videoCount": result.videoCount,
                    "videos": videoList
                })
            }
        })

        return resultsToCallback;
    },


    "countBreakup": function(count) {
        count = count.toString();
        count = count.split("")
                .reverse()
                .join("")
                .match(/.{1,3}/g)
                .reverse()
        
        let i = 0;
        count.forEach(c => {
            count[i] = c.split("").reverse().join("")
            i++;
        })

        count = count.join(",")

        return count;
    },


    "genFakeDate": function(index) {
        return [
            "1 day ago",
            "2 weeks ago",
            "1 week ago",
            "1 month ago",
            "3 months ago",
            "4 months ago",
            "7 months ago",
            "9 months ago",
            "10 months ago",
            "11 months ago",
            "1 year ago"
        ][index || Math.floor(Math.random() * 11)]
        || "5 months ago";
    },


    "saveAvatar": function(link) {
        if(link.startsWith("//")) {
            link = link.replace("//", "https://")
        }
        let fname = link.split("/")[link.split("/").length - 1]
        if(!fs.existsSync(`../assets/${fname}.png`)) {
            fetch(link, {
                "headers": constants.headers
            }).then(r => {
                r.buffer().then(buffer => {
                    fs.writeFileSync(`../assets/${fname}.png`, buffer)
                })
            })
        }

        return `/assets/${fname}.png`
    },


    "isAuthorized": function(req) {
        let tr = false;
        try {
            req.headers.cookie.split(";").forEach(cookie => {
                if(cookie.trimStart().startsWith("auth=")) {
                    let userToken = cookie.trimStart()
                                    .replace("auth=", "")
                    if(tokens.includes(userToken)) {
                        tr = true;
                    }
                }
            })
        }
        catch(error) {}

        // przy endpointach z flasha, mamy limitowany dostęp bez tokena
        if(req.headers["user-agent"] == "Shockwave Flash"
        && !ip_uses_flash[req.ip]) {
            ip_uses_flash[req.ip] = 1
        }
        if(req.headers["user-agent"] == "Shockwave Flash"
        && ip_uses_flash[req.ip] <= 20) {
            tr = true;
            ip_uses_flash[req.ip]++;

            setTimeout(function() {
                ip_uses_flash[req.ip]--;
            }, 120000)
        }

        return tr;
    },


    "get_used_token": function(req) {
        let tr = ""
        try {
            req.headers.cookie.split(";").forEach(cookie => {
                if(cookie.trimStart().startsWith("auth=")) {
                    tr = cookie.trimStart().replace("auth=", "")
                }
            })
        }
        catch(error) {}

        return tr;
    },

    
    "get_subscriptions": function(req) {
        let subList = ""
        let finalSubList = []
        try {
            req.headers.cookie.split(";").forEach(cookie => {
                if(cookie.trimStart().startsWith("sublist=")) {
                    subList = cookie.trimStart().replace("sublist=", "").split(":")
                }
            })
        }
        catch(error) {}

        if(typeof(subList) == "object") {
            subList.forEach(sub => {
                finalSubList.push(
                    {"url": decodeURIComponent(sub.split("&")[0]),
                    "name": decodeURIComponent(sub.split("&")[1])}
                )
            })
        }
        
        return finalSubList;
    },

    "firstUppercase": function(input) {
        var temp = input.split("");
        temp[0] = temp[0].toUpperCase();
        return temp.join("")
    },

    "custom_rating_round": function(input) {
        input = parseFloat(input);
        let working = []
        let rounds = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
        rounds.forEach(round => {
            if(input <= round) {
                working.push(round)
            }
        })

        if(JSON.stringify(working) == JSON.stringify(rounds) && input !== 1) {
            working = [0]
        }
        return working[0]
    },

    "asciify": function(username) {
        let r = username.replace(/[^a-zA-Z0-9]/g, "")
        if(r.length == 0) {
            // random username if we're left with no characters
            let randomUsername = ""
            let usernameCharacters = "qwertyuiopasdfghjklzxcvbnm".split("")
            while(randomUsername.length !== 8) {
                randomUsername += usernameCharacters
                                [Math.floor(Math.random() * 26)]
            }

            // add random number to the end
            randomUsername += Math.floor(Math.random() * 90).toString()
        }
        return r;
    }
}