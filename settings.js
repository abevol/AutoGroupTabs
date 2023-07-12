document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('settingsForm');
    var rulesInput = document.getElementById('rules');

    function loadRules() {
        // Load the rules from storage and set the input value
        chrome.storage.sync.get('rules', function(data) {
            if (data.rules) {
                rulesInput.value = data.rules.join('\n');
            }
        });
    }

    // Load the rules when the page is loaded
    loadRules();

    // Save the rules when the form is submitted
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        var rules = rulesInput.value.split('\n').map(function(rule) {
            return rule.trim();
        }).filter(function(rule) {
            return rule.length > 0;
        });

        chrome.storage.sync.set({rules: rules}, function() {
            // Reload the rules after they are saved
            loadRules();
        });
    });
});






