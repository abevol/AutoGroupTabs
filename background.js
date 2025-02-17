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
    // Remove common domain extensions using a regular expression
    const name = domain.replace(/\.(com|net|org|io|co|edu|gov|mil|biz|info|mobi|name|aero|asia|jobs|museum|tel|travel|xxx|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|za|zm|zw)$/i, '');
    
    // Capitalize the first letter
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