chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
        chrome.storage.sync.set({
            rules: ['*.bilibili.com', '*.openai.com']
        });
        groupAllTabs();
    }
});

chrome.tabs.onCreated.addListener(groupTab);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) groupTab(tab);
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.rules) loadRules();
});

let rules = [];
loadRules();

function loadRules() {
    chrome.storage.sync.get('rules', (data) => {
        rules = data.rules || [];
    });
}

function genGroupName(url) {
    const { hostname } = new URL(url);
    
    // Check user-defined rules
    for (const rule of rules) {
        if (rule.startsWith('*.')) {
            const domain = rule.slice(2);
            if (hostname === domain || hostname.endsWith(`.${domain}`)) {
                return formatGroupName(domain);
            }
        } else if (hostname === rule) {
            return formatGroupName(rule);
        }
    }

    // Extract main domain (e.g., 'docs.google.com' → 'google.com')
    const parts = hostname.split('.');
    if (parts.length > 2) {
        // Remove subdomains and 'www' prefix
        return formatGroupName(parts.slice(-2).join('.'));
    }
    return formatGroupName(hostname.replace(/^www\./, ''));
}

function formatGroupName(domain) {
    // Remove .com and capitalize the first letter
    const name = domain.replace(/\.com$/, '');
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function getGroupColor(groupName) {
    let hash = 0;
    for (let i = 0; i < groupName.length; i++) {
        hash = (hash << 5) - hash + groupName.charCodeAt(i);
        hash |= 0;
    }
    const colors = ["grey", "blue", "yellow", "red", "green", "pink", "purple", "cyan"];
    return colors[Math.abs(hash) % colors.length];
}

async function groupTab(tab, complete) {
    if (!tab.url || tab.pinned) return complete?.();

    const currentWindow = await chrome.windows.getCurrent();
    const groups = await chrome.tabGroups.query({ windowId: currentWindow.id });
    const groupName = genGroupName(tab.url);

    // Skip if already in the correct group
    if (tab.groupId !== -1) {
        const currentGroup = groups.find(g => g.id === tab.groupId);
        if (currentGroup?.title === groupName) return complete?.();
    }

    // Find existing group or create new
    const targetGroup = groups.find(g => g.title === groupName);
    if (targetGroup) {
        await chrome.tabs.group({ groupId: targetGroup.id, tabIds: tab.id });
    } else {
        const newGroupId = await chrome.tabs.group({ tabIds: tab.id });
        await chrome.tabGroups.update(newGroupId, {
            title: groupName,
            color: getGroupColor(groupName)
        });
    }
    complete?.();
}

function groupAllTabs() {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        tabs.forEach((tab) => groupTab(tab));
    });
}