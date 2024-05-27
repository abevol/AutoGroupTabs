importScripts('psl.min.js');

chrome.runtime.onInstalled.addListener(function(details)
{
    details && "install" == details.reason && groupAllTabs();
});

chrome.tabs.onCreated.addListener(function(tab)
{
    groupTab(tab);
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab)
{
    if (changeInfo.url != undefined)
    {
        groupTab(tab);
    }
});

// Listen for the installation event
chrome.runtime.onInstalled.addListener(function(details) {
    // Check if the extension is being installed (as opposed to updated, etc.)
    if (details.reason === 'install') {
        // Set the default rules
        chrome.storage.sync.set({
            rules: ['*.bilibili.com', '*.openai.com']
        });
    }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    for (var key in changes) {
        if (key === 'rules') {
            loadRules();
        }
    }
});

const colors = ["grey", "blue", "yellow", "red", "green", "pink", "purple", "cyan"]

let rules = [];

// Load the rules from storage
function loadRules() {
    chrome.storage.sync.get('rules', function(data) {
        if (data.rules) {
            rules = data.rules;
        }
    });
}

loadRules();

function genGroupName(url)
{
    url = new URL(url);
    let hostname = url.hostname;

    // Check if the hostname matches any of the user rules
    for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];
        if (rule.startsWith('*.')) {
            // Remove the '*.' from the rule and check if the hostname ends with it
            var ruleHost = rule.slice(2);
            if (hostname.endsWith(ruleHost)) {
                return rule;
            }
        } else if (hostname === rule) {
            return rule;
        }
    }

    if (url.protocol != "http:" && url.protocol != "https:")
    {
        return url.protocol.substr(0, url.protocol.length - 1);
    }
    let hostName = url.hostname;
    let groupName = psl.parse(hostName).domain;
    return groupName;
}

let tabIdx = 0;
let allTabs = [];

function onGroupTabComplete()
{
    tabIdx++;
    if (tabIdx < allTabs.length)
    {
        let tab = allTabs[tabIdx];
        groupTab(tab, onGroupTabComplete);
    }
}

function groupAllTabs()
{
    console.debug("groupAllTabs");
    chrome.tabs.query(
    {
        currentWindow: true
    }, function(tabs)
    {
        tabIdx = 0;
        allTabs = tabs;
        groupTab(allTabs[tabIdx], onGroupTabComplete);
    });
}

function groupTab(tab, complete)
{
    if (tab.url == "" || tab.pinned)
    {
        complete && complete();
        return;
    }

    chrome.windows.getCurrent(function(currentWindow)
    {
        chrome.tabGroups.query(
        {
            windowId: currentWindow.id
        }, function(groups)
        {
            groupTabIntl(tab, groups, currentWindow, complete);
        })
    });
}

function groupTabIntl(tab, groups, currentWindow, complete)
{
    try
    {
        let groupName = genGroupName(tab.url);
        const existedGroup = groups.find(a => a.title == groupName);
        if (existedGroup == undefined)
        {
            chrome.tabs.group(
            {
                createProperties:
                {
                    windowId: currentWindow.id,
                },
                tabIds: tab.id
            }, function(groupId)
            {
                console.debug("add group", groupName);
                chrome.tabGroups.update(groupId,
                {
                    color: colors[parseInt(Math.random() * 10)],
                    title: groupName,
                }, function(group)
                {
                    console.debug("group added", group.title);
                    complete && complete();
                });
            })
        }
        else
        {
            console.debug("update group", groupName);
            chrome.tabs.group(
            {
                groupId: existedGroup.id,
                tabIds: tab.id
            }, function(groupId)
            {
                console.debug("group updated", groupName);
                complete && complete();
            })
        }
    }
    catch (e)
    {
        console.error(e)
    }
}