


chrome.runtime.onInstalled.addListener(() => {

});

function installScripts(inTab) {

  chrome.scripting.executeScript(
    {
      target: {tabId: inTab.id},
      files: ['js/kuromoji.js'],
    },
    () => {});

    chrome.scripting.executeScript(
      {
        target: {tabId: inTab.id},
        files: ['js/wanakana.min.js'],
      },
      () => {});

  chrome.scripting.executeScript(
    {
      target: {tabId: inTab.id},
      files: ['js/jpLookUp.js'],
    },
    () => {});

    chrome.scripting.insertCSS({
      target: {tabId: inTab.id},
      files: ["css/jpLookUp.css"]
      },
      () => {});

}

function requestDefinition(word, sendResponse) {
  const url = `https://www.jisho.org/api/v1/search/words?keyword=${word}`
  const headers = {
    'Content-Type': 'application/json',
 }

  return fetch(url, { headers})
      .then(r => r.text())
      .then(r => {
        var obj = JSON.parse(r)
        var data = {
          word:word,
          reading:obj.data[0].japanese[0].reading,
          definition:obj.data[0].senses[0].english_definitions
        }
        console.log(data)
        sendResponse(data)
      })
      .catch(err => console.log(err))

}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
      if(request.update === 1) {
        initJapaneseParser().then( (message) => {
          console.log(message)
          parseHTML()
        })
      }
      else if(request.fetch && request.word !== "") {
        console.log("start")
        requestDefinition(request.word, sendResponse)
        console.log("end")
        return true
      }
  }
);


function initJapaneseParser() {
  return new Promise((resolve, reject) => {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {

    let url = chrome.runtime.getURL("/assets/dict")

    chrome.tabs.sendMessage(tabs[0].id, {messageID: 0, url: url}, 
    function(response) {
      console.log(response)
      chrome.storage.local.set({installed : response.installed}, function() {})
      resolve("done")
    });
  });
  })
}

function parseHTML() {

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {

    console.log(tabs)
    chrome.tabs.sendMessage(tabs[0].id, {messageID: 1}, 
    function(response) {
      //chrome.storage.local.set({installed : response.installed}, function() {})
    });
  });
}

chrome.action.onClicked.addListener((tab) => {
    installScripts(tab);
});