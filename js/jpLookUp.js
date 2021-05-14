(function() {
    if (window.hasRun) {
        chrome.runtime.sendMessage({update:0 });
        return;
    }
    window.hasRun = true;
    chrome.runtime.sendMessage({update:1});
})();

function initTokenizer(url) {
    return new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath: url }).build(function (err, tokenizer) {
            window.JPTokenizer = tokenizer
            resolve(tokenizer)
        });
    })
}

function getCoords(elem) { // crossbrowser version
    var box = elem.getBoundingClientRect();

    var body = document.body;
    var docEl = document.documentElement;

    var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    var clientTop = docEl.clientTop || body.clientTop || 0;
    var clientLeft = docEl.clientLeft || body.clientLeft || 0;

    var top  = box.top +  scrollTop - clientTop;
    var left = box.left + scrollLeft - clientLeft;

    return { top: Math.round(top), left: Math.round(left) };
}

function parseHTML()
{
    var els = document.body.getElementsByTagName("*");
    var array = []

    for (let el of els) {
        if (el.textContent !== '' ) {
            if(el.tagName !== "SCRIPT" && el.tagName !== "NOSCRIPT" && el.tagName !== "STYLE" ) {
                for(let node of el.childNodes) {
                    if( node.nodeType === 3 && node.textContent !== "" && node.childNodes.length === 0) {
                        if(node.textContent.trim().length > 1) {
                            array.push({parent:el, node:node})
                        }
                    }
                }
            }
        }
    }

    var jpLookUp_word_furigana = document.createElement("jpLookUp_word_furigana")
    document.body.appendChild(jpLookUp_word_furigana)

    array.forEach( element =>{
        var path = window.JPTokenizer.tokenize(element.node.textContent)
        var text = ""
        for(word of path) {
            if(word.word_type !== "UNKNOWN") {

                var realWord = word.surface_form
                var furigana = word.reading
                if(wanakana.isKatakana(furigana)) {
                    furigana = wanakana.toHiragana(furigana)
                }
                if(!(realWord != word.reading && !wanakana.isHiragana(realWord)))
                    furigana = ""
                
                text += `<jpLookUp_word data=${furigana}>${realWord}`

                text += "</jpLookUp_word>"
            }
            else
            {
                text += word.surface_form
            }
        }
       
        var newElement = document.createElement("jpLookUp")
        newElement.innerHTML = text
        element.parent.replaceChild(newElement, element.node)
        newElement.addEventListener('mouseover', event => {

            var furigana = event.target.getAttribute("data")
            if(furigana !== "") {

                if(!jpLookUp_word_furigana.classList.contains("show"))
                    jpLookUp_word_furigana.classList.toggle("show")

                const coords = getCoords(event.target)
                jpLookUp_word_furigana.style.left = coords.left + event.target.offsetWidth/2.0 - jpLookUp_word_furigana.offsetWidth/2.0 + 'px'
                jpLookUp_word_furigana.style.top = coords.top - jpLookUp_word_furigana.offsetHeight + 'px'
                jpLookUp_word_furigana.innerText = furigana
                jpLookUp_word_furigana.style.left
            }
        })

        newElement.addEventListener('mouseout', event => {
            if(jpLookUp_word_furigana.classList.contains("show"))
                jpLookUp_word_furigana.classList.toggle("show")
        })
    });

    var popup = document.createElement("div")
    popup.classList.add("jpLookUpPopup")
    
    var popupText = document.createElement("span")
    popupText.classList.add("jpLookUpPopupText")
    popup.appendChild(popupText)

    document.body.appendChild(popup)

    
    function fadeOutEffect() {
        if(popupText.classList.contains("show"))
            popupText.classList.toggle("show")

        if(!popupText.classList.contains("hide"))
            popupText.classList.toggle("hide")
    }
    window.timeOut = setTimeout(fadeOutEffect, 30000);

    document.addEventListener('click', event => {

        if(event.target.nodeName === "JPLOOKUP_WORD") {
            clearTimeout(window.timeOut)

            if(!popupText.classList.contains("show"))
                popupText.classList.toggle("show")

            if(popupText.classList.contains("hide"))
                popupText.classList.toggle("hide")




            event.target.addEventListener('mouseleave', event => {
                window.timeOut = setTimeout(fadeOutEffect, 3000);
            });

            event.target.addEventListener('mouseover', event => {
                clearTimeout(window.timeOut)

            });

            popup.addEventListener('mouseover', event => {
                clearTimeout(window.timeOut)
            });

            const coords = getCoords(event.target)

            popupText.innerHTML = event.target.firstChild.textContent
            popupText.style.left = coords.left - popupText.offsetWidth/2 +  event.target.offsetWidth/2 + 'px'
            popupText.style.top = coords.top + popupText.offsetHeight/2 + event.target.offsetHeight/2.0 + 'px'
            const width = popupText.offsetWidth
            const height = popupText.offsetHeight
            chrome.runtime.sendMessage({fetch:true, word:event.target.firstChild.textContent.trim()},
                function (response) {
                    popupText.innerHTML = `${response.word}</br>Reading: ${response.reading}`
                    if(response.definition != undefined) {
                        popupText.innerHTML += "<ul>"
                        for(var i = 0; i < response.definition.length; ++i) {
                            popupText.innerHTML += `<li>${response.definition[i]}</li>`
                        }
                        popupText.innerHTML += "</ul>"

                    }
                    new Promise(resolve => setTimeout(resolve, 1)).then(r => {
                        popupText.style.left = coords.left - width/2 +  event.target.offsetWidth/2 + 'px'
                        popupText.style.top = coords.top + height/2.0 + event.target.offsetHeight/2.0 + 'px'
                    });

                }
            );
        }
        else
        {
            if(popupText.classList.contains("show"))
                popupText.classList.toggle("show")

            if(popupText.classList.contains("hide"))
                popupText.classList.toggle("hide")

            clearTimeout(window.timeOut)
        }
    });
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        switch(request.messageID) {
            case 0:
                {
                    initTokenizer(request.url).then( tokenizer => {
                        window.JPTokenizer = tokenizer
                        sendResponse({installed: true})
                    })
                    return true
                }
                break;
            case 1:
                parseHTML()
                sendResponse({});
                break;
            case -1:
                sendResponse({installed: true});
            default:
                break;
        }
    }
);